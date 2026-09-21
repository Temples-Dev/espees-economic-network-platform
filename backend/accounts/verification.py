"""Email-address verification: a signed, expiring token bound to the address it was sent to."""

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail

SALT = 'accounts.verify-email'
MAX_AGE = 3 * 24 * 3600  # seconds


def make_token(user) -> str:
    return signing.dumps({'uid': str(user.pk), 'email': user.email}, salt=SALT)


def read_token(token: str):
    """Return the payload for a valid, unexpired token, else None."""
    try:
        return signing.loads(token, salt=SALT, max_age=MAX_AGE)
    except signing.BadSignature:
        return None


def send_verification_email(user) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={make_token(user)}"
    send_mail(
        'Verify your EENP email address',
        f'Confirm your email address to verify your account:\n\n{link}\n\n'
        'The link is valid for 3 days. If you did not create this account, ignore this email.',
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=True,
    )
