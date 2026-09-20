from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsCampaignCreatorOrReadOnly(BasePermission):
    """Public read; object writes only by the campaign creator."""

    def has_object_permission(self, request, view, obj):
        action = getattr(view, 'action', '')
        if request.method in SAFE_METHODS or action == 'contribute':
            return True
        return bool(request.user and request.user.is_authenticated and obj.creator_id == request.user.id)


class IsMilestoneCampaignCreatorOrReadOnly(BasePermission):
    """Public read of milestones; writes only by the linked campaign's creator."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and obj.campaign.creator_id == request.user.id
        )