import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def record(actor, action, target=None, request=None, **metadata):
    """Write an audit entry. Best effort: an audit failure must never block the action being audited."""
    try:
        return AuditLog.objects.create(
            actor=actor if getattr(actor, 'pk', None) else None,
            action=action,
            target_type=target._meta.model_name if target is not None else '',
            target_id=str(target.pk) if target is not None else '',
            metadata=metadata,
            ip_address=_client_ip(request) if request is not None else None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning('Audit write failed for %s: %s', action, exc)
        return None
