import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Review(models.Model):
    """A member's rating and feedback on a business or an offering."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
    )
    offering = models.ForeignKey(
        'commerce.Offering',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
    )
    rating = models.PositiveSmallIntegerField()  # 1–5
    comment = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business']),
            models.Index(fields=['offering']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(business__isnull=False) | Q(offering__isnull=False),
                name='review_has_target',
            ),
            models.CheckConstraint(
                condition=Q(rating__gte=1) & Q(rating__lte=5),
                name='review_rating_range',
            ),
            models.UniqueConstraint(
                fields=['reviewer', 'business'],
                condition=Q(business__isnull=False),
                name='unique_reviewer_business',
            ),
            models.UniqueConstraint(
                fields=['reviewer', 'offering'],
                condition=Q(offering__isnull=False),
                name='unique_reviewer_offering',
            ),
        ]

    def __str__(self):
        target = self.business or self.offering
        return f'{self.reviewer} rated {target} {self.rating}/5'