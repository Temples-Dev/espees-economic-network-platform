from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='get_category_display', read_only=True)
    target_type = serializers.SerializerMethodField()
    target_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'title',
            'message',
            'target_type',
            'target_id',
            'read_at',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields

    def get_target_type(self, instance):
        return instance.target_content_type.model if instance.target is not None else None

    def get_target_id(self, instance):
        return str(instance.target.pk) if instance.target is not None else None


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['in_app', 'email', 'push', 'sms', 'updated_at']
        read_only_fields = ['updated_at']