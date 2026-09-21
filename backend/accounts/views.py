import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from . import security, services, verification
from .throttling import AuthRateThrottle
from .models import RefreshRotation, User, Wallet
from .serializers import ProfileUpdateSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TokenPairSerializer(serializers.Serializer):
    refresh = serializers.CharField()
    access = serializers.CharField()


class RegisterView(APIView):
    """Create a member account with an auto-provisioned Espees wallet reference."""

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Register a member account',
        request=RegisterSerializer,
        responses={201: UserSerializer},
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        Wallet.objects.get_or_create(user=user)
        verification.send_verification_email(user)
        try:
            services.provision_espees_wallet(user.id)
        except Exception:
            logger.exception('Wallet provisioning failed for user %s; wallet is pending', user.id)

        user = User.objects.select_related('wallet').get(pk=user.pk)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate with lockout protection and new-device security signalling.

    Emits the same token shape as Simple JWT's default login so clients are
    unaffected. Failed attempts are recorded for temporary lockout; successful
    sign-ins from an unfamiliar device context raise a security notification.
    """

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Sign in and receive JWT tokens',
        description=(
            'Rate-limited: up to 5 failures temporarily lock the account for '
            '15 minutes. Successful sign-in from a new device emits a security '
            'notification and is persisted to the login activity log.'
        ),
        request=LoginRequestSerializer,
        responses={
            200: OpenApiResponse(response=TokenPairSerializer, description='Access and refresh tokens'),
            401: OpenApiResponse(description='Invalid credentials'),
            429: OpenApiResponse(description='Account temporarily locked'),
        },
    )
    def post(self, request):
        email = (request.data.get('email') or '').strip()
        password = request.data.get('password') or ''
        if not email or not password:
            return Response(
                {'detail': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        locked, retry_after = security.is_locked(email)
        if locked:
            return Response(
                {'detail': 'Too many failed attempts. Try again later.', 'retry_after': retry_after},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request, username=email, password=password)
        if user is None:
            security.record_login_attempt(email, request, success=False)
            return Response(
                {'detail': 'No active account found with the given credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.totp_enabled:
            return Response(
                {'detail': 'Two-factor code required.', 'two_factor_required': True},
                status=status.HTTP_202_ACCEPTED,
            )

        return _issue_login(request, user, email)


class TwoFactorCodeSerializer(serializers.Serializer):
    code = serializers.CharField()


class TwoFactorLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField()


class PasswordConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)


def _issue_login(request, user, email):
    """Record a successful sign-in, notify on new devices, return a token pair."""
    # Detect a new device BEFORE recording today's success, otherwise the
    # just-written row makes every login look like a known device.
    key = security.device_key(request)
    new_device = security.is_new_device(user, key)
    security.record_login_attempt(email, request, success=True, user=user)
    if new_device:
        security.notify_security(
            user,
            'New device sign-in',
            'We detected a sign-in from a new device or browser.',
        )

    refresh = RefreshToken.for_user(user)
    return Response({'refresh': str(refresh), 'access': str(refresh.access_token)})


class TwoFactorEnrollView(APIView):
    """Start TOTP enrollment: (re)generate a secret and return a provisioning URI.

    The secret stays disabled until confirmed with a valid code, so abandoning
    enrollment changes nothing about the account.
    """

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Start two-factor enrollment',
        responses={
            200: OpenApiResponse(description='TOTP secret and provisioning URI'),
        },
    )
    def post(self, request):
        request.user.totp_secret = security.new_totp_secret()
        request.user.totp_enabled = False
        request.user.save(update_fields=['totp_secret', 'totp_enabled', 'updated_at'])
        return Response(
            {
                'secret': request.user.totp_secret,
                'provisioning_uri': security.totp_provisioning_uri(
                    request.user.totp_secret, request.user.email
                ),
            }
        )


class TwoFactorConfirmView(APIView):
    """Confirm enrollment with a TOTP code, enabling two-factor sign-in."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Confirm two-factor enrollment',
        request=TwoFactorCodeSerializer,
        responses={
            200: OpenApiResponse(description='Two-factor authentication enabled'),
            400: OpenApiResponse(description='Missing secret or invalid code'),
        },
    )
    def post(self, request):
        code = request.data.get('code') or ''
        if not request.user.totp_secret or not security.verify_totp(request.user.totp_secret, code):
            return Response(
                {'detail': 'Invalid code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.totp_enabled = True
        request.user.save(update_fields=['totp_enabled', 'updated_at'])
        return Response({'detail': 'Two-factor authentication enabled.'})


class TwoFactorDisableView(APIView):
    """Disable two-factor sign-in after confirming the account password."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Disable two-factor authentication',
        request=PasswordConfirmSerializer,
        responses={
            200: OpenApiResponse(description='Two-factor authentication disabled'),
            400: OpenApiResponse(description='Incorrect password'),
        },
    )
    def post(self, request):
        password = request.data.get('password') or ''
        if not request.user.check_password(password):
            return Response(
                {'detail': 'Password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.totp_secret = ''
        request.user.totp_enabled = False
        request.user.save(update_fields=['totp_secret', 'totp_enabled', 'updated_at'])
        return Response({'detail': 'Two-factor authentication disabled.'})


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)


class PasswordResetView(APIView):
    """Request a password-reset email. Always succeeds to avoid account enumeration."""

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Request a password reset',
        request=PasswordResetRequestSerializer,
        responses={200: OpenApiResponse(description='Reset email sent if the account exists')},
    )
    def post(self, request):
        email = (request.data.get('email') or '').strip()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            user = None
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
            send_mail(
                'Reset your EENP password',
                f'Use this link to choose a new password:\n\n{link}\n\n'
                'If you did not request this, ignore this email.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        return Response({'detail': 'If the account exists, a reset email has been sent.'})


class PasswordResetConfirmView(APIView):
    """Set a new password with a reset link, signing out all other sessions."""

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Confirm a password reset',
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiResponse(description='Password updated, other sessions signed out'),
            400: OpenApiResponse(description='Invalid link or password'),
        },
    )
    def post(self, request):
        uid = request.data.get('uid') or ''
        token = request.data.get('token') or ''
        new_password = request.data.get('new_password') or ''
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (User.DoesNotExist, DjangoValidationError, ValueError, TypeError):
            user = None
        if user is None or not PasswordResetTokenGenerator().check_token(user, token):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

        security.notify_security(
            user,
            'Password reset',
            'Your password was reset. All other sessions have been signed out.',
        )
        return Response(
            {'detail': 'Password updated. All other sessions were signed out.'},
            status=status.HTTP_200_OK,
        )


class VerifyEmailRequestView(APIView):
    """Send (or resend) the email-verification link to the signed-in member."""

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Request an email-verification link',
        request=None,
        responses={200: OpenApiResponse(description='Verification email sent, or already verified')},
    )
    def post(self, request):
        if request.user.is_verified:
            return Response({'detail': 'Your email is already verified.'})
        verification.send_verification_email(request.user)
        return Response({'detail': 'Verification email sent.'})


class VerifyEmailConfirmView(APIView):
    """Confirm an email address with the token from the verification link."""

    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Confirm an email address',
        request=None,
        responses={
            200: OpenApiResponse(description='Email verified'),
            400: OpenApiResponse(description='Invalid or expired link'),
        },
    )
    def post(self, request):
        payload = verification.read_token(request.data.get('token') or '')
        user = User.objects.filter(pk=payload['uid']).first() if payload else None
        if user is None or user.email != payload['email']:
            return Response({'detail': 'Invalid or expired verification link.'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=['is_verified', 'updated_at'])
            security.notify_security(user, 'Email verified', 'Your email address was verified.')
        return Response({'detail': 'Email verified.'})


class TwoFactorLoginView(APIView):
    """Second step of sign-in for accounts with two-factor enabled."""

    throttle_classes = [AuthRateThrottle]
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Complete sign-in with a two-factor code',
        request=TwoFactorLoginSerializer,
        responses={
            200: OpenApiResponse(response=TokenPairSerializer, description='Access and refresh tokens'),
            400: OpenApiResponse(description='Two-factor not enabled'),
            401: OpenApiResponse(description='Invalid code'),
        },
    )
    def post(self, request):
        email = (request.data.get('email') or '').strip()
        code = request.data.get('code') or ''
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'No active account found with the given credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.totp_enabled:
            return Response(
                {'detail': 'Two-factor authentication is not enabled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not security.verify_totp(user.totp_secret, code):
            security.record_login_attempt(email, request, success=False)
            return Response(
                {'detail': 'Invalid code.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return _issue_login(request, user, email)


class RefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RotatingRefreshView(APIView):
    """Rotate refresh tokens with reuse (theft) detection.

    Presenting a valid refresh token blacklists it and returns a fresh pair.
    Presenting an already-rotated token replays a consumed credential: the
    whole token family is revoked, a security notification is raised, and the
    client must sign in again.
    """

    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    @extend_schema(
        tags=['accounts'],
        summary='Rotate refresh token',
        description=(
            'Returns a fresh access/refresh pair and blacklists the presented '
            'refresh token. Replaying a rotated token revokes all sessions.'
        ),
        request=RefreshRequestSerializer,
        responses={
            200: OpenApiResponse(response=TokenPairSerializer, description='Fresh access and refresh tokens'),
            401: OpenApiResponse(description='Invalid, expired, or reused refresh token'),
        },
    )
    def post(self, request):
        raw = request.data.get('refresh') or ''
        try:
            token = RefreshToken(raw)
        except Exception:
            return self._handle_invalid(request, raw)

        try:
            user = User.objects.get(pk=token['user_id'])
        except (KeyError, User.DoesNotExist):
            return Response(
                {'detail': 'Invalid refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        jti = token['jti']
        rotated = RefreshToken.for_user(user)
        token.blacklist()
        RefreshRotation.objects.get_or_create(
            consumed_jti=jti,
            defaults={'user': user, 'next_jti': rotated['jti']},
        )
        return Response({'refresh': str(rotated), 'access': str(rotated.access_token)})

    def _handle_invalid(self, request, raw):
        jti = security.unverified_jti(raw)
        if jti:
            rotation = (
                RefreshRotation.objects.filter(consumed_jti=jti).select_related('user').first()
            )
            if rotation is not None:
                self._revoke_family(rotation.user)
                security.notify_security(
                    rotation.user,
                    'Suspicious sign-in activity',
                    'A used sign-in token was presented again. '
                    'All sessions have been signed out as a precaution.',
                )
                return Response(
                    {'detail': 'Session revoked for security reasons. Please sign in again.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        return Response(
            {'detail': 'Invalid refresh token.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    def _revoke_family(self, user):
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)


class LogoutView(APIView):
    """Blacklist the presented refresh token to revoke the session."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {'detail': 'Invalid refresh token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    """Change the account password and sign out all other sessions."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password') or ''
        new_password = request.data.get('new_password') or ''

        if not request.user.check_password(old_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password', 'updated_at'])

        for outstanding in OutstandingToken.objects.filter(user=request.user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

        security.notify_security(
            request.user,
            'Password changed',
            'Your password was changed. All other sessions have been signed out.',
        )
        return Response(
            {'detail': 'Password updated. All other sessions were signed out.'},
            status=status.HTTP_200_OK,
        )


class SessionsView(APIView):
    """Recent successful sign-in activity for audit."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        activities = request.user.login_activity.filter(success=True)[:20]
        data = [
            {
                'device_key': a.device_key,
                'ip_address': a.ip_address,
                'user_agent': a.user_agent,
                'created_at': a.created_at,
            }
            for a in activities
        ]
        return Response({'sessions': data})


class MeView(APIView):
    """Return the authenticated member's profile and wallet reference."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)