from django.db.models import Count, Max, Prefetch, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Conversation, Message
from .permissions import IsConversationParticipant
from .serializers import (
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationSerializer,
    MessageSerializer,
    MessageWriteSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    """Member-to-member threads, optionally anchored to an order or business."""

    queryset = Conversation.objects.select_related(
        'initiator', 'other_party', 'business', 'order', 'campaign'
    )
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]
    lookup_field = 'id'
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset().filter(Q(initiator=user) | Q(other_party=user))
        qs = qs.annotate(
            last_message_at=Max('messages__created_at'),
            unread_count=Count(
                'messages',
                filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=user),
                distinct=True,
            ),
        )
        if self.action == 'retrieve':
            qs = qs.prefetch_related(
                Prefetch(
                    'messages',
                    queryset=Message.objects.select_related('sender')[:100],
                    to_attr='recent_messages',
                )
            )
        return qs.order_by('-last_message_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        out = self.get_serializer(conversation)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='messages')
    def messages(self, request, id=None):
        conversation = self.get_object()
        serializer = MessageWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data['body'],
        )
        from notifications.services import notify
        notify(
            conversation.other_party,
            'communication',
            'New message',
            f'{request.user.full_name or request.user.email}: {message.body[:80]}',
            target=conversation,
        )
        return Response(
            MessageSerializer(message, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='read')
    def read(self, request, id=None):
        conversation = self.get_object()
        marked = Message.objects.filter(conversation=conversation).exclude(sender=request.user).filter(
            read_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({'marked_read': marked})