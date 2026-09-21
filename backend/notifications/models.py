import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Notification(models.Model):
    """An in-app notification for a platform user.

    Notifications are event-driven (spec §21, §39) and reference the economic
    object that produced them via a generic target. Delivery beyond in-app is
    handled by channel adapters later — in-app delivery must never gate the
    underlying transaction.
    """

    class Category(models.TextChoices):
        FINANCIAL = 'financial', 'Financial'
        COMMERCE = 'commerce', 'Commerce'
        COMMUNICATION = 'communication', 'Communication'
        CAMPAIGN = 'campaign', 'Campaign'
        SECURITY = 'security', 'Security'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    title = models.CharField(max_length=120)
    message = models.TextField()

    target_content_type = models.ForeignKey(ContentType, null=True, blank=True, on_delete=models.SET_NULL)
    target_object_id = models.UUIDField(null=True, blank=True)
    target = GenericForeignKey('target_content_type', 'target_object_id')

    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['recipient', 'read_at']),
        ]

    def __str__(self):
        return f'{self.recipient}: {self.title}'

    @property
    def is_read(self):
        return self.read_at is not None


class NotificationPreference(models.Model):
    """Per-user channel enablement for notifications."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )
    in_app = models.BooleanField(default=True)
    email = models.BooleanField(default=True)
    push = models.BooleanField(default=True)
    sms = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'notification preferences'

    def __str__(self):
        return f'{self.user}: in-app={self.in_app} email={self.email} push={self.push} sms={self.sms}'

class DeviceToken(models.Model):
    """A push-notification token for one installed copy of the app (Expo or native)."""

    class Platform(models.TextChoices):
        IOS = 'ios', 'iOS'
        ANDROID = 'android', 'Android'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=8, choices=Platform.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} · {self.platform}'
