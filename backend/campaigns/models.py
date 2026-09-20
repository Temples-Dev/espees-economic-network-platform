import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Campaign(models.Model):
    """Community funding: raises Espees toward a goal.

    Lifecycle (per spec §18.3) is simplified to
    draft → active → completed/cancelled. Campaign funds are tracked in the
    campaign ledger (contributions), kept distinct from ordinary wallet funds —
    settlement against the Espees API is a later integration (see services.py).
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='campaigns',
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaigns',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    purpose = models.CharField(max_length=200, blank=True)
    goal_espees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'{self.title} ({self.status})'


class CampaignMilestone(models.Model):
    """A funding milestone on a campaign, tracked and disbursed independently."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=160)
    amount_espees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    achieved = models.BooleanField(default=False)
    disbursed = models.BooleanField(default=False)
    disbursed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['amount_espees']
        indexes = [
            models.Index(fields=['campaign', 'achieved']),
        ]

    def __str__(self):
        return f'{self.campaign} / {self.title}'


class CampaignUpdate(models.Model):
    """A public update posted by the campaign creator."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='updates')
    title = models.CharField(max_length=160, blank=True)
    body = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.campaign}: {self.title or self.body[:40]}'


class CampaignContribution(models.Model):
    """A ledger entry recording an Espees contribution to a campaign."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='contributions')
    contributor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='campaign_contributions',
    )
    amount_espees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    note = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign', 'created_at']),
        ]

    def __str__(self):
        return f'{self.contributor} → {self.campaign}: {self.amount_espees}'