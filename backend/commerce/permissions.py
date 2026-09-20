from rest_framework.permissions import SAFE_METHODS, BasePermission

from businesses.models import BusinessMembership


class IsBusinessMemberOrReadOnly(BasePermission):
    """Writes require an owner/admin membership in the target business.

    Object-level writes (update/destroy) defer to ``has_object_permission``.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        business_id = request.data.get('business')
        if business_id:
            return BusinessMembership.objects.filter(
                user=request.user,
                business_id=business_id,
                role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
            ).exists()
        if getattr(view, 'action', None) in ('update', 'partial_update', 'destroy'):
            return True  # the object-level check decides
        return False

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return BusinessMembership.objects.filter(
            user=request.user,
            business=obj.business,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).exists()


class IsOrderCustomerOrBusinessMember(BasePermission):
    """Object-level access for orders: the customer or a business member."""

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user == obj.customer:
            return True
        return BusinessMembership.objects.filter(
            user=request.user,
            business=obj.business,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).exists()