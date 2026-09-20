from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Business, BusinessMembership, Category
from .permissions import IsBusinessOwnerOrAdmin, ReadOnlyOrAuthenticated
from .serializers import (
    BusinessDetailSerializer,
    BusinessSerializer,
    CategorySerializer,
    MembershipSerializer,
)


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.select_related('owner').prefetch_related('members')
    permission_classes = [IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset().filter(is_active=True)
        qs = BusinessSerializer.setup_eager_loading(qs)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BusinessDetailSerializer
        return BusinessSerializer

    def perform_create(self, serializer):
        business = serializer.save(owner=self.request.user)
        BusinessMembership.objects.create(
            user=self.request.user, business=business, role=BusinessMembership.Role.OWNER
        )

    def destroy(self, request, *args, **kwargs):
        business = self.get_object()
        # Only the owner may delete a business.
        if business.owner != request.user:
            return Response(
                {'detail': 'Only the business owner can delete this business.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def members(self, request, pk=None):
        business = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({'email': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response({'email': ['No member with this email.']}, status=status.HTTP_404_NOT_FOUND)

        membership, created = BusinessMembership.objects.get_or_create(
            user=target, business=business, defaults={'role': BusinessMembership.Role.ADMIN}
        )
        serializer = MembershipSerializer(membership)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]