from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User, Wallet
from accounts.serializers import WalletSerializer
from core.audit import record as audit_record

from . import services
from .models import Payment
from .serializers import (
    MerchantPaymentWriteSerializer,
    PaymentSerializer,
    WalletQueueSerializer,
)


class WalletView(APIView):
    """Current wallet association + capability flags (Doc16 §8-9, §25.6)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['wallet'], summary='Wallet association and capabilities')
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response({
            'wallet': WalletSerializer(wallet).data,
            'capabilities': services.get_wallet_capabilities(wallet),
        })


class WalletCapabilitiesView(APIView):
    """Capability-driven flags so the UI never renders a broken feature."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['wallet'], summary='Wallet capability flags')
    def get(self, request):
        wallet = getattr(request.user, 'wallet', None)
        return Response(services.get_wallet_capabilities(wallet))


class WalletLinkSerializer(serializers.Serializer):
    """Claim an existing Espees wallet address (Doc16 §7: no User API, so
    linking is claim-and-verify, never programmatic provisioning)."""

    espees_wallet_address = serializers.RegexField(
        regex=r'^0x[0-9a-fA-F]{40}$', max_length=128,
        error_messages={'invalid': 'Enter a valid Espees wallet address (0x followed by 40 hex characters).'},
    )
    external_account_reference = serializers.CharField(
        max_length=128, required=False, allow_blank=True, default=''
    )


class WalletLinkView(APIView):
    """Claim an Espees wallet address; staff verifies before it is trusted."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['wallet'], summary='Claim an Espees wallet address',
        request=WalletLinkSerializer, responses={200: WalletSerializer},
    )
    def post(self, request):
        serializer = WalletLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        address = serializer.validated_data['espees_wallet_address']
        ext_ref = serializer.validated_data.get('external_account_reference') or ''

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        if wallet.status == Wallet.Status.ASSOCIATED:
            if wallet.espees_wallet_address.lower() == address.lower():
                return Response(WalletSerializer(wallet).data)
            return Response(
                {'detail': 'A different wallet address is already verified for this account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conflict = Wallet.objects.filter(
            espees_wallet_address__iexact=address, status=Wallet.Status.ASSOCIATED
        ).exclude(user=request.user).exists()
        if conflict:
            return Response(
                {'detail': 'This wallet address is already verified for another account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        before = wallet.status
        wallet.espees_wallet_id = address
        wallet.espees_wallet_address = address
        wallet.external_account_reference = ext_ref
        wallet.status = Wallet.Status.REQUIRES_ACTION
        wallet.status_detail = (
            'Address claimed by the member; pending staff verification '
            '(e.g. confirm-response username match) before it is trusted.'
        )
        metadata = dict(wallet.metadata or {})
        metadata['link_requested_at'] = timezone.now().isoformat()
        wallet.metadata = metadata
        wallet.save(update_fields=[
            'espees_wallet_id', 'espees_wallet_address', 'external_account_reference',
            'status', 'status_detail', 'metadata', 'updated_at',
        ])
        audit_record(request.user, 'WALLET_LINK_REQUESTED', target=wallet,
                     before_state={'status': before},
                     after_state={'status': wallet.status, 'address': address},
                     result=wallet.status)
        return Response(WalletSerializer(wallet).data)


class WalletVerifySerializer(serializers.Serializer):
    user_id = serializers.UUIDField()


class WalletVerifyView(APIView):
    """Staff verification of a claimed wallet address (link → ASSOCIATED)."""

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['wallet'], summary='Verify a claimed wallet address (staff)',
        request=WalletVerifySerializer, responses={200: WalletSerializer},
    )
    def post(self, request):
        serializer = WalletVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = get_object_or_404(User, pk=serializer.validated_data['user_id'])
        wallet = getattr(member, 'wallet', None)
        if wallet is None or not wallet.espees_wallet_address:
            return Response(
                {'detail': 'This account has no claimed wallet address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if wallet.status == Wallet.Status.ASSOCIATED:
            return Response(WalletSerializer(wallet).data)

        before = wallet.status
        wallet.status = Wallet.Status.ASSOCIATED
        wallet.status_detail = 'Address verified by staff.'
        wallet.provisioned_at = timezone.now()
        wallet.save(update_fields=['status', 'status_detail', 'provisioned_at', 'updated_at'])
        audit_record(request.user, 'WALLET_VERIFIED', target=wallet,
                     before_state={'status': before},
                     after_state={'status': wallet.status, 'address': wallet.espees_wallet_address},
                     reason='staff verification of claimed address', result=wallet.status)
        return Response(WalletSerializer(wallet).data)


class WalletQueueView(APIView):
    """Staff queue of wallet associations awaiting attention (default: claimed)."""

    permission_classes = [permissions.IsAdminUser]
    serializer_class = WalletQueueSerializer

    @extend_schema(
        tags=['wallet'], summary='Wallet verification queue (staff)',
        responses={200: WalletQueueSerializer(many=True)},
    )
    def get(self, request):
        from accounts.models import Wallet as WalletModel

        wanted = request.query_params.get('status') or WalletModel.Status.REQUIRES_ACTION
        valid = {choice for choice, _label in WalletModel.Status.choices}
        if wanted not in valid and wanted != 'attention':
            return Response(
                {'detail': f'Unknown status. Valid: {sorted(valid)} or attention.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = WalletModel.objects.select_related('user').exclude(espees_wallet_address='')
        if wanted == 'attention':
            qs = qs.exclude(status=WalletModel.Status.ASSOCIATED)
        else:
            qs = qs.filter(status=wanted)
        rows = qs.order_by('updated_at')[:200]
        return Response(WalletQueueSerializer(rows, many=True).data)


class MerchantPaymentCreateView(APIView):
    """Create a merchant payment intent (CONFIRMED surface, Doc16 §5.1, §13)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['payments'], summary='Create a merchant payment',
        request=MerchantPaymentWriteSerializer, responses={201: PaymentSerializer},
    )
    def post(self, request):
        serializer = MerchantPaymentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment, _ = services.create_merchant_payment(user=request.user, **serializer.validated_data)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    @extend_schema(tags=['payments'], summary='List your payments')
    def get(self, request):
        payments = Payment.objects.filter(initiator=request.user)[:50]
        return Response(PaymentSerializer(payments, many=True).data)


class PaymentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    @extend_schema(tags=['payments'], summary='Payment detail')
    def get(self, request, id):
        payment = get_object_or_404(Payment, id=id, initiator=request.user)
        return Response(PaymentSerializer(payment).data)


class PaymentConfirmView(APIView):
    """Server-side confirmation — redirects are never proof (Doc16 §13)."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    @extend_schema(
        tags=['payments'], summary='Confirm a merchant payment',
        responses={200: PaymentSerializer, 502: OpenApiResponse(description='Espees unavailable')},
    )
    def post(self, request, id):
        payment = get_object_or_404(Payment, id=id, initiator=request.user)
        payment = services.confirm_merchant_payment(payment)
        return Response(PaymentSerializer(payment).data)


class PaymentReturnView(APIView):
    """Hosted-flow return leg: confirm server-side, then redirect to the app.

    The Espees portal redirects here (per-payment success_url/fail_url).
    The redirect itself proves nothing — this view runs the same
    server-side confirmation before redirecting with the verified status.
    Payment ids are unguessable UUIDs, so no session is required.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=['payments'], summary='Hosted payment return (confirm + redirect)')
    def get(self, request, id):
        payment = get_object_or_404(Payment, id=id)
        payment = services.confirm_merchant_payment(payment)
        from urllib.parse import urlencode

        params = urlencode({
            'payment': str(payment.id),
            'status': payment.status,
            'result': request.query_params.get('result', ''),
        })
        return redirect(f'{settings.FRONTEND_URL.rstrip("/")}/payments/return?{params}')
