from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Quote, SupplierRequest
from .permissions import IsRequesterMemberOrReadOnly, IsSupplierOrRequester
from .serializers import (
    QuoteSerializer,
    QuoteWriteSerializer,
    SupplierRequestDetailSerializer,
    SupplierRequestSerializer,
    SupplierRequestWriteSerializer,
)


class SupplierRequestViewSet(viewsets.ModelViewSet):
    queryset = SupplierRequest.objects.select_related('requesting_business', 'category')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SupplierRequestDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return SupplierRequestWriteSerializer
        return SupplierRequestSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsRequesterMemberOrReadOnly()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            qs = qs.annotate(quote_count=Count('quotes'))
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        return qs

    def create(self, request, *args, **kwargs):
        write = SupplierRequestWriteSerializer(data=request.data, context=self.get_serializer_context())
        write.is_valid(raise_exception=True)
        instance = write.save()
        return Response(
            SupplierRequestSerializer(instance, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        write = SupplierRequestWriteSerializer(
            instance,
            data=request.data,
            partial=request.method == 'PATCH',
            context=self.get_serializer_context(),
        )
        write.is_valid(raise_exception=True)
        instance = write.save()
        return Response(
            SupplierRequestSerializer(instance, context=self.get_serializer_context()).data
        )


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.select_related('request', 'supplier_business')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'create':
            return QuoteWriteSerializer
        return QuoteSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'accept'):
            return [IsSupplierOrRequester()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        request_id = self.request.query_params.get('request')
        if request_id:
            qs = qs.filter(request_id=request_id)
        return qs

    def create(self, request, *args, **kwargs):
        write = QuoteWriteSerializer(data=request.data, context=self.get_serializer_context())
        write.is_valid(raise_exception=True)
        instance = write.save()
        return Response(QuoteSerializer(instance, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, id=None):
        quote = self.get_object()
        if quote.status != Quote.Status.SUBMITTED:
            return Response({'detail': 'Only submitted quotes can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        req = quote.request
        if req.status != SupplierRequest.Status.OPEN:
            return Response({'detail': 'This request is already closed.'}, status=status.HTTP_400_BAD_REQUEST)

        quote.status = Quote.Status.ACCEPTED
        quote.save(update_fields=['status', 'updated_at'])
        req.status = SupplierRequest.Status.CLOSED
        req.save(update_fields=['status', 'updated_at'])

        Quote.objects.filter(request=req).exclude(pk=quote.pk).filter(
            status=Quote.Status.SUBMITTED
        ).update(status=Quote.Status.DECLINED, updated_at=timezone.now())

        return Response(QuoteSerializer(quote, context=self.get_serializer_context()).data)