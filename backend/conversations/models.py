import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """A message thread between two members, optionally tied to an economic object.

    ``business`` / ``order`` / ``campaign`` provide contextual anchoring without
    affecting the participants — communication stays associated with the relevant
    economic activity.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_initiated',
    )
    other_party = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_participated',
    )
    business = models.ForeignKey(
        'businesses.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
    )
    order = models.ForeignKey(
        'commerce.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
    )
    campaign = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['initiator', 'order']),
            models.Index(fields=['other_party', 'order']),
            models.Index(fields=['initiator', 'campaign']),
            models.Index(fields=['other_party', 'campaign']),
        ]

    def __str__(self):
        return f'{self.initiator} ↔ {self.other_party}'

    @property
    def participants(self):
        return (self.initiator_id, self.other_party_id)


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages')
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f'{self.sender} → {self.conversation.id}: {self.body[:40]}'