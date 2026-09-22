"""Platform payment intent + reconciliation records (Doc16 §13-14, §23).

EENP owns the economic experience (intent, references, states); Espees
owns monetary settlement. Browser redirects are never proof of payment —
only server-side confirmation completes a transaction.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Payment(models.Model):
    """An EENP-level merchant payment intent with Espees confirmation state."""

    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        UNKNOWN = 'unknown', 'Unknown'
        REQUIRES_RECONCILIATION = 'requires_reconciliation', 'Requires reconciliation'

    class OperationType(models.TextChoices):
        MERCHANT_PAYMENT = 'merchant_payment', 'Merchant payment'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments'
    )
    operation_type = models.CharField(
        max_length=32, choices=OperationType.choices, default=OperationType.MERCHANT_PAYMENT
    )
    product_sku = models.CharField(max_length=64)
    narration = models.CharField(max_length=255)
    amount_espees = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]
    )
    merchant_wallet = models.CharField(max_length=128)
    success_url = models.CharField(max_length=512, blank=True, default='')
    fail_url = models.CharField(max_length=512, blank=True, default='')
    user_data = models.JSONField(default=dict, blank=True)

    idempotency_key = models.CharField(max_length=64, unique=True)
    correlation_id = models.UUIDField(default=uuid.uuid4, editable=False)

    # External (Espees-controlled) references. Preserved verbatim.
    espees_payment_ref = models.CharField(max_length=128, blank=True, default='')
    external_status = models.CharField(max_length=32, blank=True, default='')
    # Full confirm payload (espees.api.txt §3): never trust, always preserve.
    customer_username = models.CharField(max_length=128, blank=True, default='')
    status_details = models.CharField(max_length=512, blank=True, default='')
    transaction_date_raw = models.CharField(max_length=64, blank=True, default='')

    status = models.CharField(max_length=24, choices=Status.choices, default=Status.INITIATED)
    status_detail = models.CharField(max_length=512, blank=True, default='')
    confirmed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['initiator', 'created_at']),
            models.Index(fields=['espees_payment_ref']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'{self.product_sku} {self.amount_espees} ESP ({self.status})'


class ReconciliationRecord(models.Model):
    """Reconciliation state for an externally settled operation (Doc16 §23)."""

    class ReconStatus(models.TextChoices):
        MATCHED = 'matched', 'Matched'
        PENDING = 'pending', 'Pending'
        MISMATCHED = 'mismatched', 'Mismatched'
        MISSING_EXTERNAL = 'missing_external', 'Missing external'
        MISSING_PLATFORM = 'missing_platform', 'Missing platform'
        UNKNOWN = 'unknown', 'Unknown'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reconciliation_records',
    )
    eenp_transaction_id = models.CharField(max_length=64)
    external_reference = models.CharField(max_length=128, blank=True, default='')
    operation_type = models.CharField(max_length=32, default=Payment.OperationType.MERCHANT_PAYMENT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=8, default='ESP')
    external_status = models.CharField(max_length=32, blank=True, default='')
    internal_status = models.CharField(max_length=24, blank=True, default='')
    reconciliation_status = models.CharField(
        max_length=24, choices=ReconStatus.choices, default=ReconStatus.PENDING
    )
    correlation_id = models.CharField(max_length=64, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['eenp_transaction_id']),
            models.Index(fields=['external_reference']),
            models.Index(fields=['reconciliation_status', 'created_at']),
        ]

    def __str__(self):
        return f'{self.eenp_transaction_id} → {self.reconciliation_status}'
