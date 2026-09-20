from rest_framework.permissions import SAFE_METHODS, BasePermission

from businesses.models import BusinessMembership

MANAGER_ROLES = [BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN]


class IsRequesterMemberOrReadOnly(BasePermission):
    """Reads are public; writes require an owner/admin membership in the requesting business."""

    def _is_requester_member(self, request, business_id=None, business=None):
        if not (request.user and request.user.is_authenticated):
            return False
        return BusinessMembership.objects.filter(
            user=request.user,
            business_id=business_id if business_id else business.id,
            role__in=MANAGER_ROLES,
        ).exists()

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        business_id = request.data.get('requesting_business')
        if business_id:
            return self._is_requester_member(request, business_id=business_id)
        if getattr(view, 'action', None) in ('update', 'partial_update', 'destroy'):
            return True  # the object-level check decides
        return False

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return self._is_requester_member(request, business=obj.requesting_business)


class IsSupplierOrRequester(BasePermission):
    """Quotes: read publicly; create as a member of the supplier business; accept as request owner."""

    def _is_member(self, request, business_id=None, business=None):
        if not (request.user and request.user.is_authenticated):
            return False
        return BusinessMembership.objects.filter(
            user=request.user,
            business_id=business_id if business_id else business.id,
            role__in=MANAGER_ROLES,
        ).exists()

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(view, 'action', None) == 'accept':
            return True  # object-level decides
        business_id = request.data.get('supplier_business')
        return self._is_member(request, business_id=business_id)

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(view, 'action', None) == 'accept':
            return self._is_member(request, business=obj.request.requesting_business)
        if request.method in SAFE_METHODS:
            return True
        return self._is_member(request, business=obj.supplier_business)