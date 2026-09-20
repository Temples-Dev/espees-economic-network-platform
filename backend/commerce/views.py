from django.db.models import Avg, Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from businesses.models import Business, BusinessMembership
from .models import Offering, Order
from .permissions import IsBusinessMemberOrReadOnly, IsOrderCustomerOrBusinessMember
from .serializers import (
    OfferingSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer,
)


class OfferingViewSet(viewsets.ModelViewSet):
    queryset = Offering.objects.select_related('business', 'category')
    serializer_class = OfferingSerializer
    permission_classes = [IsBusinessMemberOrReadOnly]
    http_method_names = ['get', 'post', 'patch', 'delete']

    kind = None  # set by subclasses

    def get_queryset(self):
        qs = super().get_queryset().filter(is_active=True)
        if self.kind is not None:
            qs = qs.filter(kind=self.kind)
        qs = qs.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews'),
        )
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        business = self.request.query_params.get('business')
        if business:
            qs = qs.filter(business_id=business)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(kind=self.kind)

    @action(detail=False, methods=['get'], url_path='mine')
    def mine(self, request):
        """Offerings owned by businesses the requester manages."""
        member_business_ids = BusinessMembership.objects.filter(
            user=request.user,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).values_list('business_id', flat=True)
        qs = Offering.objects.filter(
            business_id__in=member_business_ids, kind=self.kind
        ).select_related('business', 'category')
        return Response(OfferingSerializer(qs, many=True).data)


class ProductViewSet(OfferingViewSet):
    kind = Offering.Kind.PRODUCT


class ServiceViewSet(OfferingViewSet):
    kind = Offering.Kind.SERVICE


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related('items__offering')
    permission_classes = [permissions.IsAuthenticated, IsOrderCustomerOrBusinessMember]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset().select_related('customer', 'business')
        if not user.is_authenticated:
            return qs.none()
        managed_ids = BusinessMembership.objects.filter(
            user=user,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).values_list('business_id', flat=True)
        qs = qs.filter(Q(customer=user) | Q(business_id__in=managed_ids))
        business_id = self.request.query_params.get('business')
        if business_id and business_id in {str(b) for b in managed_ids}:
            qs = qs.filter(business_id=business_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save()
        except Business.DoesNotExist:
            return Response(
                {'business': ['Business not found.']}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        membership = BusinessMembership.objects.filter(
            user=request.user,
            business=order.business,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        )
        if not membership.exists():
            return Response(
                {'detail': 'Only a business member can update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if order.status == Order.Status.CANCELLED:
            return Response(
                {'detail': 'A cancelled order cannot be updated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = OrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        order.refresh_from_db()
        return Response(OrderSerializer(order).data)