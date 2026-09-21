import uuid

from django.conf import settings
from django.db import models

from core.validators import validate_image_size
from django.db.models import Sum
from django.utils.text import slugify
from decimal import Decimal


class Offering(models.Model):
    """A product or service sold by a business, priced in Espees."""

    class Kind(models.TextChoices):
        PRODUCT = 'product', 'Product'
        SERVICE = 'service', 'Service'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        related_name='offerings',
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, blank=True)
    description = models.TextField(blank=True, default='')
    category = models.ForeignKey(
        'businesses.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='offerings',
    )
    price = models.DecimalField(max_digits=14, decimal_places=2)  # Espees
    image = models.ImageField(upload_to='offerings/', null=True, blank=True, validators=[validate_image_size])
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business', 'kind', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.kind})'

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or 'item'
            self.slug = base
            while Offering.objects.filter(slug=self.slug, business=self.business).exclude(pk=self.pk).exists():
                self.slug = f'{base}-{uuid.uuid4().hex[:6]}'
        super().save(*args, **kwargs)


class Order(models.Model):
    """An order for offerings from a single business, in Espees.

    Payments are handled by the Espees integration layer — this record tracks
    the commercial lifecycle only.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        FULFILLED = 'fulfilled', 'Fulfilled'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.PROTECT,
        related_name='orders',
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['business', 'status']),
        ]

    def __str__(self):
        return f'Order {self.id} — {self.business.name}'

    def recalculate_total(self):
        total = self.items.aggregate(sum=Sum('line_total'))['sum'] or Decimal('0.00')
        self.total = total
        self.save(update_fields=['total', 'updated_at'])


class OrderItem(models.Model):
    """A line within an order."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    offering = models.ForeignKey(Offering, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return f'{self.offering.name} x{self.quantity}'

class Dispute(models.Model):
    """A complaint about an order, raised by the customer or the business and resolved by platform staff.

    Outcomes are recorded here; any money movement is handled separately by the Espees layer.
    """

    class Reason(models.TextChoices):
        NOT_RECEIVED = 'not_received', 'Not received'
        NOT_AS_DESCRIBED = 'not_as_described', 'Not as described'
        WRONG_AMOUNT = 'wrong_amount', 'Wrong amount'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        RESOLVED = 'resolved', 'Resolved'

    class Outcome(models.TextChoices):
        FOR_CUSTOMER = 'for_customer', 'In favour of the customer'
        FOR_BUSINESS = 'for_business', 'In favour of the business'
        DISMISSED = 'dismissed', 'Dismissed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='disputes')
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='disputes_opened')
    reason = models.CharField(max_length=24, choices=Reason.choices)
    description = models.TextField()

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    outcome = models.CharField(max_length=16, choices=Outcome.choices, blank=True, default='')
    resolution_note = models.TextField(blank=True, default='')
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Dispute on {self.order_id} ({self.status})'
