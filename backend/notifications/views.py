from django.utils import timezone
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, Notification, NotificationPreference
from .serializers import DeviceTokenSerializer, NotificationPreferenceSerializer, NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Notification.objects.select_related('recipient', 'target_content_type')
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = super().get_queryset().filter(recipient=self.request.user)
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(read_at__isnull=True)
        return qs

    @action(detail=True, methods=['post'], url_path='read')
    def read(self, request, id=None):
        notification = self.get_object()
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        marked = Notification.objects.filter(recipient=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({'marked_read': marked})


class NotificationPreferencesView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        preference, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return preference

class DeviceTokenView(APIView):
    """Register (POST) or remove (DELETE) this device's push token for the signed-in member."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device, created = DeviceToken.objects.update_or_create(
            token=serializer.validated_data['token'],
            defaults={'user': request.user, 'platform': serializer.validated_data['platform']},
        )
        return Response(
            {'token': device.token, 'platform': device.platform},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        DeviceToken.objects.filter(user=request.user, token=request.data.get('token', '')).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
