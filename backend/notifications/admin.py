from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'category', 'title', 'read_at', 'created_at']
    list_filter = ['category', 'read_at']
    search_fields = ['recipient__email', 'title', 'message']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'in_app', 'email', 'push', 'sms', 'updated_at']
    list_filter = ['in_app', 'email', 'push', 'sms']