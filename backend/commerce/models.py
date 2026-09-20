import uuid

from django.conf import settings
from django.db import models
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