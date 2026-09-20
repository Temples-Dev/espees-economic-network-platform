from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['sender', 'body', 'read_at', 'created_at']
    ordering = ['created_at']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'initiator', 'other_party', 'business', 'order', 'created_at']
    search_fields = ['initiator__email', 'other_party__email', 'business__name']
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'read_at', 'created_at']
    search_fields = ['conversation__id', 'sender__email', 'body']