from rest_framework.permissions import BasePermission


class IsConversationParticipant(BasePermission):
    """Only the initiator or other party may read or write to a conversation."""

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.id in obj.participants