import logging

from .models import Notification

logger = logging.getLogger(__name__)


def notify(recipient, category, title, message, target=None):
    """Best-effort in-app notification.

    Spec §39: notification delivery must not be required for the underlying
    transaction to succeed — failures are logged and swallowed.
    """
    if not recipient:
        return None
    try:
        return Notification.objects.create(
            recipient=recipient,
            category=category,
            title=title,
            message=message,
            target=target,
        )
    except Exception as exc:  # noqa: BLE001 — never block the caller
        logger.warning('Notification delivery failed for %s: %s', recipient, exc)
        return None


def notify_business_managers(business, category, title, message, target=None, exclude=None):
    """Fan out a notification to a business's owner/admin members."""
    from businesses.models import BusinessMembership

    memberships = BusinessMembership.objects.filter(
        business=business,
        role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
    ).select_related('user')
    sent = 0
    for membership in memberships:
        if exclude and membership.user_id == exclude.id:
            continue
        if notify(membership.user, category, title, message, target=target):
            sent += 1
    return sent