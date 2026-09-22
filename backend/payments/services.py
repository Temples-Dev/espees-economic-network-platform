"""Payment domain services (Doc16 §13-14, §23, §25.6)."""

import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.audit import record as audit_record

from . import adapters
from .models import Payment, ReconciliationRecord

logger = logging.getLogger(__name__)

# Doc16 §14 known mapping. Original external status is always preserved.
EXTERNAL_TO_INTERNAL = {
    'APPROVED': Payment.Status.COMPLETED,
    'DECLINE': Payment.Status.FAILED,
    'PENDING': Payment.Status.PENDING,
}


def normalize_external_status(external_status):
    """Map a raw Espees status to an internal status (NOT FOUND → UNKNOWN)."""
    external_status = (external_status or '').strip().upper()
    if external_status in EXTERNAL_TO_INTERNAL:
        return EXTERNAL_TO_INTERNAL[external_status]
    return Payment.Status.UNKNOWN


def get_wallet_capabilities(wallet=None):
    """Capability-driven flags for the Wallet UI (Doc16 §25.6-26).

    Unavailable capabilities are reported as disabled — never as broken
    features. Only merchant payment can become available, and only when
    the Merchant API is configured.
    """
    merchant_configured = bool(
        getattr(settings, 'ESPEES_API_KEY', '')
        and getattr(settings, 'ESPEES_MERCHANT_WALLET', '')
    )
    wallet_status = getattr(wallet, 'status', None)
    return {
        'BALANCE_AVAILABLE': False,  # DEPENDENT: User API (§28.4)
        'FUNDING_AVAILABLE': False,  # DEPENDENT: fiat settlement (§28.8)
        'PAYMENT_AVAILABLE': merchant_configured,  # CONFIRMED surface (§5.1)
        'RECEIVING_AVAILABLE': False,  # DEPENDENT: User API
        'WITHDRAWAL_AVAILABLE': False,  # DEPENDENT: redemption API (§16)
        'wallet_status': wallet_status,
        'wallet_ready': wallet_status == 'associated',
        'merchant_configured': merchant_configured,
    }


def _enrich_user_data(payment, user_data):
    """Inject platform join keys so the confirm echo can be verified.

    The Espees API echoes user_data back on confirmation — the only
    reconciliation join available without webhooks.
    """
    enriched = dict(user_data or {})
    enriched.setdefault('eenp_payment_id', str(payment.id))
    enriched.setdefault('eenp_correlation_id', str(payment.correlation_id))
    return enriched


def default_return_urls(payment_id):
    """Per-payment hosted-flow return URLs carrying the platform payment id.

    Sent as the Espees product success_url/fail_url so the return leg can
    trigger server-side confirmation. Base prefers BACKEND_PUBLIC_URL and
    falls back to FRONTEND_URL.
    """
    base = (getattr(settings, 'BACKEND_PUBLIC_URL', '') or settings.FRONTEND_URL).rstrip('/')
    return (
        f'{base}/api/v1/payments/{payment_id}/return/?result=success',
        f'{base}/api/v1/payments/{payment_id}/return/?result=failure',
    )


def _record_reconciliation(payment, reconciliation_status, details=None):
    return ReconciliationRecord.objects.create(
        payment=payment,
        eenp_transaction_id=str(payment.id),
        external_reference=payment.espees_payment_ref or '',
        operation_type=payment.operation_type,
        amount=payment.amount_espees,
        currency='ESP',
        external_status=payment.external_status or '',
        internal_status=payment.status,
        reconciliation_status=reconciliation_status,
        correlation_id=str(payment.correlation_id),
        details=details or {},
    )


@transaction.atomic
def create_merchant_payment(*, user, narration, amount_espees, product_sku='',
                            success_url='', fail_url='', user_data=None,
                            idempotency_key='', merchant_wallet='',
                            adapter=None):
    """Create a platform payment intent and, when configured, an Espees product.

    Idempotent on idempotency_key: repeating the same logical request
    returns the original payment without a second settlement.
    """
    user_data = user_data or {}
    idempotency_key = idempotency_key or f'pay-{uuid.uuid4().hex}'
    existing = Payment.objects.filter(idempotency_key=idempotency_key).first()
    if existing is not None:
        return existing, False

    amount_espees = Decimal(str(amount_espees))

    merchant_wallet = merchant_wallet or getattr(settings, 'ESPEES_MERCHANT_WALLET', '')
    product_sku = product_sku or f'EENP-{uuid.uuid4().hex[:12].upper()}'
    payment = Payment.objects.create(
        initiator=user,
        product_sku=product_sku,
        narration=narration,
        amount_espees=amount_espees,
        merchant_wallet=merchant_wallet,
        success_url=success_url,
        fail_url=fail_url,
        user_data={},
        idempotency_key=idempotency_key,
    )
    # Join keys for the confirm echo + per-payment return URLs.
    payment.user_data = _enrich_user_data(payment, user_data)
    if not success_url or not fail_url:
        default_success, default_fail = default_return_urls(payment.id)
        payment.success_url = success_url or default_success
        payment.fail_url = fail_url or default_fail
    payment.save(update_fields=['user_data', 'success_url', 'fail_url', 'updated_at'])
    audit_record(user, 'PAYMENT_CREATED', target=payment, correlation_id=str(payment.correlation_id),
                 result=payment.status)

    adapter = adapter or adapters.MerchantAdapter()
    try:
        resp = adapter.create_merchant_product(
            product_sku=product_sku,
            narration=narration,
            price=payment.amount_espees,
            merchant_wallet=merchant_wallet,
            success_url=payment.success_url,
            fail_url=payment.fail_url,
            user_data=payment.user_data,
        )
    except adapters.IntegrationNotConfigured:
        payment.status = Payment.Status.INITIATED
        payment.status_detail = (
            'Payment intent recorded. Espees Merchant API is not configured; '
            'confirmation is pending configuration.'
        )
        payment.save(update_fields=['status', 'status_detail', 'updated_at'])
        _record_reconciliation(
            payment, ReconciliationRecord.ReconStatus.MISSING_EXTERNAL,
            {'reason': 'espees_not_configured'},
        )
        return payment, True
    except Exception as exc:  # noqa: BLE001 — preserve ambiguity, never fake success
        logger.warning('Espees product creation failed: %s', exc)
        payment.status = Payment.Status.UNKNOWN
        payment.status_detail = 'Product creation failed; state unknown, requires reconciliation.'
        payment.save(update_fields=['status', 'status_detail', 'updated_at'])
        _record_reconciliation(
            payment, ReconciliationRecord.ReconStatus.UNKNOWN, {'error': str(exc)[:500]}
        )
        return payment, True

    payment.espees_payment_ref = str((resp or {}).get('payment_ref') or '')
    if payment.espees_payment_ref:
        payment.status = Payment.Status.PENDING
        payment.status_detail = 'Awaiting customer payment via the hosted Espees experience.'
        recon = ReconciliationRecord.ReconStatus.PENDING
    else:
        payment.status = Payment.Status.REQUIRES_RECONCILIATION
        payment.status_detail = 'Espees did not return a payment reference.'
        recon = ReconciliationRecord.ReconStatus.MISMATCHED
    payment.save(
        update_fields=['espees_payment_ref', 'status', 'status_detail', 'updated_at']
    )
    _record_reconciliation(payment, recon, {'create_response_keys': sorted((resp or {}).keys())})
    return payment, True


@transaction.atomic
def confirm_merchant_payment(payment, adapter=None):
    """Server-side confirmation. Redirects are never proof (Doc16 §13)."""
    adapter = adapter or adapters.MerchantAdapter()
    if not payment.espees_payment_ref:
        payment.status = Payment.Status.REQUIRES_RECONCILIATION
        payment.status_detail = 'No Espees payment reference to confirm.'
        payment.save(update_fields=['status', 'status_detail', 'updated_at'])
        _record_reconciliation(
            payment, ReconciliationRecord.ReconStatus.MISSING_EXTERNAL,
            {'reason': 'no_payment_ref'},
        )
        return payment

    try:
        resp = adapter.confirm_merchant_payment(payment_ref=payment.espees_payment_ref)
    except adapters.IntegrationNotConfigured:
        payment.status = Payment.Status.REQUIRES_RECONCILIATION
        payment.status_detail = 'Confirmation pending Espees configuration.'
        payment.save(update_fields=['status', 'status_detail', 'updated_at'])
        _record_reconciliation(
            payment, ReconciliationRecord.ReconStatus.MISSING_EXTERNAL,
            {'reason': 'espees_not_configured'},
        )
        return payment
    except Exception as exc:  # noqa: BLE001
        logger.warning('Espees confirmation failed: %s', exc)
        payment.status = Payment.Status.UNKNOWN
        payment.status_detail = 'Confirmation failed; state unknown, requires reconciliation.'
        payment.save(update_fields=['status', 'status_detail', 'updated_at'])
        _record_reconciliation(
            payment, ReconciliationRecord.ReconStatus.UNKNOWN, {'error': str(exc)[:500]}
        )
        return payment

    external = str((resp or {}).get('transaction_status') or '').strip().upper()
    payment.external_status = external
    # Preserve the full confirm payload verbatim (espees.api.txt §3).
    payment.customer_username = str((resp or {}).get('customer_username') or '')[:128]
    payment.status_details = str((resp or {}).get('status_details') or '')[:512]
    payment.transaction_date_raw = str((resp or {}).get('transaction_date') or '')[:64]

    # user_data echo check: the only join key available without webhooks.
    echo = (resp or {}).get('user_data') or {}
    echo_id = echo.get('eenp_payment_id') if isinstance(echo, dict) else None
    if echo_id is None:
        echo_state = 'missing'
    elif echo_id == str(payment.id):
        echo_state = 'matched'
    else:
        echo_state = 'mismatched'

    # Amount guard: Espees sends price as float — flag drift, never adjust.
    amount_ok = True
    raw_price = (resp or {}).get('price', None)
    if raw_price is not None:
        try:
            intent = Decimal(str(payment.amount_espees))
            amount_ok = abs(Decimal(str(raw_price)) - intent) <= Decimal('0.01')
        except (InvalidOperation, ValueError, TypeError):
            amount_ok = False

    internal = normalize_external_status(external)
    if internal == Payment.Status.UNKNOWN:
        # NOT FOUND and unrecognized states stay ambiguous (Doc16 §14).
        payment.status = Payment.Status.REQUIRES_RECONCILIATION
        payment.status_detail = f"Espees status: {external or 'empty'}."
        recon = ReconciliationRecord.ReconStatus.MISSING_EXTERNAL
    elif echo_state == 'mismatched' or not amount_ok:
        payment.status = Payment.Status.REQUIRES_RECONCILIATION
        causes = []
        if echo_state == 'mismatched':
            causes.append('user_data echo does not match this payment')
        if not amount_ok:
            causes.append('confirmed amount differs from intent')
        payment.status_detail = 'Reconciliation required: ' + '; '.join(causes) + '.'
        recon = ReconciliationRecord.ReconStatus.MISMATCHED
    else:
        payment.status = internal
        payment.status_detail = f"Espees status: {external or 'empty'}."
        recon = (
            ReconciliationRecord.ReconStatus.MATCHED
            if internal == Payment.Status.COMPLETED
            else ReconciliationRecord.ReconStatus.PENDING
            if internal == Payment.Status.PENDING
            else ReconciliationRecord.ReconStatus.MISMATCHED
        )
    save_fields = ['external_status', 'customer_username', 'status_details',
                   'transaction_date_raw', 'status', 'status_detail', 'updated_at']
    if payment.status == Payment.Status.COMPLETED:
        payment.confirmed_at = timezone.now()
        save_fields.append('confirmed_at')
    payment.save(update_fields=save_fields)
    audit_record(payment.initiator, 'PAYMENT_CONFIRMED', target=payment,
                 correlation_id=str(payment.correlation_id), result=payment.status,
                 before_state={'external_status': ''}, after_state={'external_status': external})
    _record_reconciliation(payment, recon, {
        'confirm_response_keys': sorted((resp or {}).keys()),
        'user_data_echo': echo_state,
        'amount_check': 'ok' if amount_ok else 'mismatch',
    })
    return payment
