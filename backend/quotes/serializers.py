from rest_framework import serializers

from .models import Quote, SupplierRequest


class SupplierRequestSerializer(serializers.ModelSerializer):
    requesting_business_name = serializers.CharField(source='requesting_business.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    quote_count = serializers.SerializerMethodField()
    accepted_quote = serializers.SerializerMethodField()

    class Meta:
        model = SupplierRequest
        fields = [
            'id',
            'requesting_business',
            'requesting_business_name',
            'category',
            'category_name',
            'title',
            'description',
            'quantity',
            'budget_espees',
            'status',
            'quote_count',
            'accepted_quote',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'requesting_business_name', 'category_name', 'created_at', 'updated_at']

    def get_quote_count(self, obj):
        return getattr(obj, 'quote_count', obj.quotes.count())

    def get_accepted_quote(self, obj):
        accepted = obj.quotes.filter(status=Quote.Status.ACCEPTED).first()
        if not accepted:
            return None
        return {
            'id': str(accepted.id),
            'supplier_business': str(accepted.supplier_business_id),
            'amount_espees': accepted.amount_espees,
            'delivery_days': accepted.delivery_days,
        }


class SupplierRequestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierRequest
        fields = ['requesting_business', 'category', 'title', 'description', 'quantity', 'budget_espees', 'status']


class SupplierRequestDetailSerializer(SupplierRequestSerializer):
    quotes = serializers.SerializerMethodField()

    class Meta(SupplierRequestSerializer.Meta):
        fields = SupplierRequestSerializer.Meta.fields + ['quotes']

    def get_quotes(self, obj):
        quotes = obj.quotes.select_related('supplier_business').all()
        return QuoteSerializer(quotes, many=True).data


class QuoteSerializer(serializers.ModelSerializer):
    request_title = serializers.CharField(source='request.title', read_only=True)
    supplier_business_name = serializers.CharField(source='supplier_business.name', read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id',
            'request',
            'request_title',
            'supplier_business',
            'supplier_business_name',
            'amount_espees',
            'delivery_days',
            'message',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'request_title', 'supplier_business_name', 'status', 'created_at', 'updated_at']


class QuoteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quote
        fields = ['request', 'supplier_business', 'amount_espees', 'delivery_days', 'message']

    def validate(self, attrs):
        request = attrs.get('request')
        supplier_business = attrs.get('supplier_business')

        if request is None:
            raise serializers.ValidationError({'request': 'Required.'})
        if request.status != SupplierRequest.Status.OPEN:
            raise serializers.ValidationError({'request': 'This request is no longer open.'})
        if supplier_business is None:
            raise serializers.ValidationError({'supplier_business': 'Required.'})
        if supplier_business.id == request.requesting_business_id:
            raise serializers.ValidationError('You cannot quote on your own request.')
        if Quote.objects.filter(request=request, supplier_business=supplier_business).exists():
            raise serializers.ValidationError('You have already quoted on this request.')
        return attrs