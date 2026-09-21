"""Security helpers for authentication: device fingerprinting, lockout, session audit.

Sensitive authentication events are recorded as LoginActivity and surfaced via
security notifications (spec §21, §97). This module is deliberately free of
external dependencies so the views stay thin.
"""

import hashlib
from datetime import timedelta

from django.utils import timezone

from .models import LoginActivity

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW = timedelta(minutes=15)
LOCKOUT_DURATION = timedelta(minutes=15)


def device_key(request):
    """Opaque fingerprint of a login context (IP + user agent)."""
    ip = _client_ip(request)
    agent = request.META.get('HTTP_USER_AGENT', '')
    return hashlib.sha256(f'{ip}|{agent}'.encode()).hexdigest()


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '') or ''


def recent_failures(email, now=None):
    now = now or timezone.now()
    return LoginActivity.objects.filter(
        email__iexact=email, success=False, created_at__gte=now - LOCKOUT_WINDOW
    ).count()


def is_locked(email, now=None):
    now = now or timezone.now()
    count = recent_failures(email, now)
    if count < MAX_FAILED_ATTEMPTS:
        return False, None
    recent = LoginActivity.objects.filter(
        email__iexact=email, success=False, created_at__gte=now - LOCKOUT_WINDOW
    ).order_by('-created_at').first()
    if recent is None:
        return False, None
    retry_at = recent.created_at + LOCKOUT_DURATION
    return retry_at > now, int((retry_at - now).total_seconds())


def record_login_attempt(email, request, success, user=None):
    """Record an authentication attempt. Returns the LoginActivity."""
    return LoginActivity.objects.create(
        user=user,
        email=email,
        success=success,
        device_key=device_key(request),
        ip_address=_client_ip(request) or None,
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
    )


def is_new_device(user, key):
    """True when the member has not previously signed in from this device context."""
    return not LoginActivity.objects.filter(user=user, success=True, device_key=key).exists()


def notify_security(recipient, title, message):
    from notifications.services import notify

    notify(recipient, 'security', title, message)


def unverified_jti(raw):
    """Extract the jti claim without consulting the blacklist.

    Used only for reuse detection on tokens that already failed validation —
    never for authentication.
    """
    from rest_framework_simplejwt.tokens import UntypedToken

    try:
        return UntypedToken(raw)['jti']
    except Exception:
        return None