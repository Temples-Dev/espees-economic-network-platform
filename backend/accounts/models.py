import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Manager for the custom User model using email as the identifier."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default='')
    full_name = models.CharField(max_length=255, blank=True, default='')

    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    totp_secret = models.CharField(max_length=64, blank=True, default='')
    totp_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'member'
        verbose_name_plural = 'members'
        ordering = ['-created_at']

    def __str__(self):
        return self.email


class Profile(models.Model):
    """Public economic identity of a member."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    location = models.CharField(max_length=128, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.email}'


class Wallet(models.Model):
    """Reference to the member's Espees wallet.

    The Espees network is the authoritative ledger for balances — this record only
    tracks the identity and lifecycle of the wallet within the platform. Actual
    provisioning happens through the Espees API via the services layer.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending provisioning'
        ACTIVE = 'active', 'Active'
        FAILED = 'failed', 'Provisioning failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    espees_wallet_id = models.CharField(max_length=128, blank=True, default='')
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Wallet of {self.user.email} ({self.status})'


class LoginActivity(models.Model):
    """An authentication attempt (successful or not) for lockout and session audit.

    Sensitive authentication events (spec §21, §97) are surfaced to the member
    through security notifications.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='login_activity',
    )
    email = models.EmailField(default='')
    success = models.BooleanField(default=False)
    device_key = models.CharField(max_length=64, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'login activities'
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['user', 'device_key']),
        ]

    def __str__(self):
        return f'{self.email}: {"ok" if self.success else "failed"} @ {self.device_key[:12]}'


class RefreshRotation(models.Model):
    """Record of a consumed refresh token and the token that replaced it.

    Enables refresh-token rotation with reuse (theft) detection: presenting an
    already-rotated token replays a consumed credential, which revokes the
    whole token family and raises a security notification.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_rotations')
    consumed_jti = models.CharField(max_length=255, unique=True)
    next_jti = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'rotation for {self.user.email}: {self.consumed_jti[:8]} -> {self.next_jti[:8]}'