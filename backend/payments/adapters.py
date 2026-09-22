"""Espees integration boundary (Doc16 §5, §12, §27, §34).

Only the Merchant and Vending surfaces documented in espees.api.txt are
implemented. Everything else (User API, balance, P2P transfers,
withdrawal/redemption, webhooks) is DEPENDENT and must raise
ExternalDependencyPending rather than inventing calls.
"""

import json
import logging
import urllib.error
import urllib.request
from abc import ABC, abstractmethod

from django.conf import settings

logger = logging.getLogger(__name__)


class IntegrationNotConfigured(Exception):
    """Espees credentials/endpoints are not configured."""


class ExternalDependencyPending(Exception):
    """The requested capability needs official Espees support (Doc16 §28)."""


class EspeesPort(ABC):
    """Interface the payment domain depends on — never the provider directly."""

    @abstractmethod
    def create_merchant_product(self, *, product_sku, narration, price,
                                merchant_wallet, success_url, fail_url, user_data):
        ...

    @abstractmethod
    def confirm_merchant_payment(self, *, payment_ref):
        ...


class GatewayPort(ABC):
    """Local fiat gateway boundary. Settlement mechanism is DEPENDENT (§15)."""

    def initiate(self, *args, **kwargs):
        raise ExternalDependencyPending(
            'Local-currency → Espees settlement needs an officially supported mechanism.'
        )

    def verify(self, *args, **kwargs):
        raise ExternalDependencyPending(
            'Local-currency → Espees settlement needs an officially supported mechanism.'
        )

    def get_status(self, *args, **kwargs):
        raise ExternalDependencyPending(
            'Local-currency → Espees settlement needs an officially supported mechanism.'
        )

    def refund(self, *args, **kwargs):
        raise ExternalDependencyPending(
            'Local-currency → Espees settlement needs an officially supported mechanism.'
        )

    def reconcile(self, *args, **kwargs):
        raise ExternalDependencyPending(
            'Local-currency → Espees settlement needs an officially supported mechanism.'
        )


def _post_json(url, payload, api_key, timeout=20):
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': 'application/json', 'x-api-key': api_key},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')[:1000]
        logger.warning('Espees API %s failed: %s %s', url, exc.code, detail)
        raise


class EspeesClient(EspeesPort):
    """Thin HTTP client over the documented Merchant/Vending APIs."""

    def __init__(self, base_url='', api_key='', timeout=20):
        self.base_url = (base_url or '').rstrip('/')
        self.api_key = api_key or ''
        self.timeout = timeout

    @property
    def configured(self):
        return bool(self.base_url and self.api_key)

    def _require_configured(self):
        if not self.configured:
            raise IntegrationNotConfigured('Espees Merchant API is not configured.')

    def create_merchant_product(self, *, product_sku, narration, price,
                                merchant_wallet, success_url, fail_url, user_data):
        self._require_configured()
        return _post_json(
            f'{self.base_url}/v2/payment/product',
            {
                'product_sku': product_sku,
                'narration': narration,
                'price': float(price),
                'merchant_wallet': merchant_wallet,
                'success_url': success_url,
                'fail_url': fail_url,
                'user_data': user_data or {},
            },
            self.api_key,
            self.timeout,
        )

    def confirm_merchant_payment(self, *, payment_ref):
        self._require_configured()
        return _post_json(
            f'{self.base_url}/v2/payment/confirm/',
            {'payment_ref': payment_ref},
            self.api_key,
            self.timeout,
        )

    def create_vending_token(self, *, vending_wallet_address, vending_wallet_pin, vending_hash):
        self._require_configured()
        return _post_json(
            f'{self.base_url}/agents/vending/createtoken',
            {
                'vending_wallet_address': vending_wallet_address,
                'vending_wallet_pin': vending_wallet_pin,
                'vending_hash': vending_hash,
            },
            self.api_key,
            self.timeout,
        )

    def vend_espees(self, *, vending_token, user_wallet, amount_in_espees):
        self._require_configured()
        return _post_json(
            f'{self.base_url}/v2/vending/vend',
            {
                'vending_token': vending_token,
                'user_wallet': user_wallet,
                'amount_in_espees': float(amount_in_espees),
            },
            self.api_key,
            self.timeout,
        )


def default_client():
    return EspeesClient(
        base_url=getattr(settings, 'ESPEES_API_BASE_URL', ''),
        api_key=getattr(settings, 'ESPEES_API_KEY', ''),
    )


class MerchantAdapter(EspeesPort):
    """Confirmed Merchant surface (Doc16 §5.1, §13)."""

    def __init__(self, client=None):
        self.client = client or default_client()

    def create_merchant_product(self, **kwargs):
        return self.client.create_merchant_product(**kwargs)

    def confirm_merchant_payment(self, **kwargs):
        return self.client.confirm_merchant_payment(**kwargs)


class VendingAdapter:
    """Confirmed Vending surface — only where explicitly authorized (§5.2).

    Must NOT be used as a generic P2P or fiat on-ramp without Espees
    authorization (interim rule §33.5).
    """

    def __init__(self, client=None):
        self.client = client or default_client()

    def _require_authorized(self):
        if not getattr(settings, 'ESPEES_VENDING_ENABLED', False):
            raise ExternalDependencyPending(
                'Vending is only available where explicitly authorized by Espees.'
            )

    def create_token(self, **kwargs):
        self._require_authorized()
        return self.client.create_vending_token(**kwargs)

    def vend(self, **kwargs):
        self._require_authorized()
        return self.client.vend_espees(**kwargs)


def payment_url(payment_ref):
    """Hosted Espees payment URL for a payment reference."""
    base = getattr(settings, 'ESPEES_PAYMENT_PORTAL_URL', 'https://payment.espees.org/pay')
    return f'{base.rstrip("/")}/{payment_ref}'


# ---- DEPENDENT surfaces: raise instead of inventing calls (Doc16 §28) ----

def get_user_balance(*args, **kwargs):
    raise ExternalDependencyPending('User balance retrieval awaits the official Espees User API.')


def get_user_transactions(*args, **kwargs):
    raise ExternalDependencyPending('User transaction history awaits the official Espees User API.')


def transfer_user_to_user(*args, **kwargs):
    raise ExternalDependencyPending('Direct user-to-user transfers await the official Espees User API.')


def withdraw_to_local_rails(*args, **kwargs):
    raise ExternalDependencyPending('Withdrawal awaits an officially supported Espees redemption mechanism.')
