from django.contrib.auth import get_user_model
from rest_framework import serializers

from businesses.models import BusinessMembership
from commerce.models import Order
from .models import Conversation, Message


class MemberSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'email', 'full_name']


class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_full_name = serializers.CharField(source='sender.full_name', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_email', 'sender_full_name', 'body', 'read_at', 'created_at']
        read_only_fields = fields


class MessageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['body']
        extra_kwargs = {'body': {'max_length': 5000}}


class ConversationSerializer(serializers.ModelSerializer):
    initiator = MemberSummarySerializer(read_only=True)
    other_party = MemberSummarySerializer(read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True, default=None)
    order_id = serializers.UUIDField(source='order.id', read_only=True, default=None)
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'initiator',
            'other_party',
            'business',
            'business_name',
            'order',
            'order_id',
            'last_message_at',
            'unread_count',
            'created_at',
        ]
        read_only_fields = ['id', 'initiator', 'other_party', 'business', 'business_name', 'order', 'order_id', 'created_at']

    def get_last_message_at(self, obj):
        return getattr(obj, 'last_message_at', None)

    def get_unread_count(self, obj):
        return getattr(obj, 'unread_count', 0)


class ConversationDetailSerializer(ConversationSerializer):
    messages = serializers.SerializerMethodField()

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages']

    def get_messages(self, obj):
        recent = getattr(obj, 'recent_messages', None)
        if recent is None:
            recent = obj.messages.select_related('sender')[:100]
        return MessageSerializer(recent, many=True).data


class ConversationCreateSerializer(serializers.Serializer):
    other_party = serializers.UUIDField()
    business = serializers.UUIDField(required=False)
    order = serializers.UUIDField(required=False)

    def validate_other_party(self, value):
        user = self.context['request'].user
        if value == user.id:
            raise serializers.ValidationError('You cannot start a conversation with yourself.')
        try:
            get_user_model().objects.get(pk=value)
        except get_user_model().DoesNotExist:
            raise serializers.ValidationError('No member with this id.')
        return value

    def validate(self, attrs):
        request = self.context['request']
        order_id = attrs.get('order')
        if order_id:
            try:
                order = Order.objects.get(pk=order_id)
            except Order.DoesNotExist:
                raise serializers.ValidationError({'order': 'Order not found.'})
            involved = order.customer_id == request.user.id or BusinessMembership.objects.filter(
                user=request.user, business=order.business
            ).exists()
            if not involved:
                raise serializers.ValidationError(
                    {'order': 'You are not involved in this order.'}
                )
            attrs['order'] = order
        business_id = attrs.get('business')
        if business_id:
            from businesses.models import Business
            try:
                attrs['business'] = Business.objects.get(pk=business_id)
            except Business.DoesNotExist:
                raise serializers.ValidationError({'business': 'Business not found.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        order = validated_data.get('order')
        business = validated_data.get('business')
        other_party = validated_data['other_party']

        if order is None and business is None:
            # Direct thread — reuse an existing conversation between the pair.
            existing = Conversation.objects.filter(
                initiator=request.user, other_party_id=other_party, order__isnull=True, business__isnull=True
            ).first() or Conversation.objects.filter(
                initiator_id=other_party, other_party=request.user, order__isnull=True, business__isnull=True
            ).first()
            if existing:
                return existing

        return Conversation.objects.create(
            initiator=request.user,
            other_party_id=other_party,
            business=business,
            order=order,
        )