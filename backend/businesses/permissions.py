from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import BusinessMembership


class ReadOnlyOrAuthenticated(BasePermission):
    """SAFE_METHODS are public; anything else requires an authenticated member."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class IsBusinessOwnerOrAdmin(BasePermission):
    """Only the business owner or an admin member can modify a business."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return BusinessMembership.objects.filter(
            user=request.user,
            business=obj,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).exists()