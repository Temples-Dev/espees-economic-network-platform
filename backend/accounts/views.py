import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import User, Wallet
from .serializers import RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """Create a member account with an auto-provisioned Espees wallet reference."""

    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        Wallet.objects.get_or_create(user=user)
        try:
            services.provision_espees_wallet(user.id)
        except Exception:
            logger.exception('Wallet provisioning failed for user %s; wallet is pending', user.id)

        user = User.objects.select_related('wallet').get(pk=user.pk)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """Return the authenticated member's profile and wallet reference."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)