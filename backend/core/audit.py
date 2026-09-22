import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def record(actor, action, target=None, request=None, before_state=None, after_state=None,
           reason='', result='', request_id='', correlation_id='', session_context=None,
           **metadata):
    """Write an audit entry. Best effort: an audit failure must never block the action being audited.

    Extra attribution follows Doc16 §21 (before/after state, reason,
    result, request/correlation ids, session context).
    """
    try:
        return AuditLog.objects.create(
            actor=actor if getattr(actor, 'pk', None) else None,
            action=action,
            target_type=target._meta.model_name if target is not None else '',
            target_id=str(target.pk) if target is not None else '',
            metadata=metadata,
            ip_address=_client_ip(request) if request is not None else None,
            before_state=before_state or {},
            after_state=after_state or {},
            reason=reason or '',
            result=result or '',
            request_id=request_id or '',
            correlation_id=correlation_id or '',
            session_context=session_context or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning('Audit write failed for %s: %s', action, exc)
        return None
