from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from businesses.models import Business, BusinessMembership
from notifications.services import notify, notify_business_managers
from core import audit
from .models import Dispute, Offering, Order
from .permissions import IsBusinessMemberOrReadOnly, IsOrderCustomerOrBusinessMember
from .serializers import (
    DisputeSerializer,
    OfferingSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer,
)


ORDER_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.FULFILLED, Order.Status.CANCELLED},
}


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
        for param, lookup in (('min_price', 'price__gte'), ('max_price', 'price__lte')):
            try:
                qs = qs.filter(**{lookup: Decimal(self.request.query_params[param])})
            except (KeyError, InvalidOperation):
                pass  # absent or unparseable: ignore rather than fail a browse request
        sort = self.request.query_params.get('sort')
        if sort in ('price', '-price'):
            qs = qs.order_by(sort)
        elif sort == 'newest':
            qs = qs.order_by('-created_at')
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
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
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
        from notifications.services import notify_business_managers
        notify_business_managers(
            order.business,
            'commerce',
            'New order',
            f'New order {order.pk} received for {order.total} Espees.',
            target=order,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Move an order along its lifecycle.

        Business owners/admins: pending -> confirmed | cancelled, confirmed -> fulfilled | cancelled.
        The customer may only cancel their own order while it is still pending.
        """
        order = self.get_object()
        serializer = OrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get('status')

        is_manager = BusinessMembership.objects.filter(
            user=request.user,
            business=order.business,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).exists()
        is_customer = order.customer_id == request.user.id
        if not is_manager and not (is_customer and new_status == Order.Status.CANCELLED):
            return Response(
                {'detail': 'Only a business member can update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed = ORDER_TRANSITIONS.get(order.status, set())
        if not is_manager:
            allowed = allowed & {Order.Status.CANCELLED} if order.status == Order.Status.PENDING else set()
        if new_status not in allowed:
            return Response(
                {'detail': f'An order that is {order.status} cannot be changed to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous = order.status
        serializer.save()
        order.refresh_from_db()
        audit.record(request.user, 'order.status_changed', target=order, request=request, **{'from': previous, 'to': order.status})
        label = order.get_status_display().lower()
        if is_manager:
            notify(
                order.customer, 'commerce', 'Order updated',
                f'Your order with {order.business.name} is now {label}.', target=order,
            )
        else:
            notify_business_managers(
                order.business, 'commerce', 'Order cancelled',
                f'Order {order.pk} was cancelled by the customer.', target=order,
            )
        return Response(OrderSerializer(order).data)



class DisputeViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Disputes on orders you are party to. Staff resolve them in the admin; there is no edit or delete."""

    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Dispute.objects.select_related('order__business', 'order__customer')

    def get_queryset(self):
        user = self.request.user
        managed = BusinessMembership.objects.filter(
            user=user, role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN]
        ).values_list('business_id', flat=True)
        qs = super().get_queryset().filter(Q(order__customer=user) | Q(order__business_id__in=managed))
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

    def perform_create(self, serializer):
        notify_business = serializer.validated_data.pop('_notify_business')
        dispute = serializer.save(opened_by=self.request.user)
        order = dispute.order
        message = f'A dispute was opened on order {order.pk}: {dispute.get_reason_display().lower()}.'
        if notify_business:
            notify_business_managers(order.business, 'commerce', 'Dispute opened', message, target=dispute)
        else:
            notify(order.customer, 'commerce', 'Dispute opened', message, target=dispute)
        audit.record(self.request.user, 'dispute.opened', target=dispute, request=self.request, reason=dispute.reason)
