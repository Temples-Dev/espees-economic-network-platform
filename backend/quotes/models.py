import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class SupplierRequest(models.Model):
    """A posting by a business asking suppliers to quote for goods or work."""

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requesting_business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='supplier_requests',
    )
    category = models.ForeignKey(
        'businesses.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_requests',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    budget_espees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['category', 'status']),
        ]

    def __str__(self):
        return f'{self.title} ({self.requesting_business})'


class Quote(models.Model):
    """A supplier's response to a supplier request."""

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        SupplierRequest,
        on_delete=models.CASCADE,
        related_name='quotes',
    )
    supplier_business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='quotes',
    )
    amount_espees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    delivery_days = models.PositiveIntegerField(null=True, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['amount_espees']
        constraints = [
            models.UniqueConstraint(
                fields=['request', 'supplier_business'],
                name='unique_quote_per_request_supplier',
            ),
        ]
        indexes = [
            models.Index(fields=['request', 'status']),
            models.Index(fields=['supplier_business']),
        ]

    def __str__(self):
        return f'{self.supplier_business} → {self.request.title}: {self.amount_espees}'