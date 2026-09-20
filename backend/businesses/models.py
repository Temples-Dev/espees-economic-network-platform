import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    """Business category used by the discovery layer."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Business(models.Model):
    """A business operating within the Espees economic network."""

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = 'unverified', 'Unverified'
        PENDING = 'pending', 'Verification pending'
        VERIFIED = 'verified', 'Verified'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='businesses',
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='businesses',
    )
    location = models.CharField(max_length=128, blank=True, default='')

    contact_email = models.EmailField(blank=True, default='')
    contact_phone = models.CharField(max_length=32, blank=True, default='')

    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'businesses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_active', 'verification_status']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or 'business'
            self.slug = base
            while Business.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f'{base}-{uuid.uuid4().hex[:6]}'
        super().save(*args, **kwargs)


class BusinessMembership(models.Model):
    """An administrator of a business. The owner is created on business creation."""

    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        ADMIN = 'admin', 'Administrator'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.ADMIN)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'business')

    def __str__(self):
        return f'{self.user} — {self.role} of {self.business}'