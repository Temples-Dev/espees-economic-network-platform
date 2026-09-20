from rest_framework import serializers

from businesses.models import Business, Category
from .models import Offering, Order, OrderItem


class OfferingSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    category = serializers.SlugRelatedField(
        slug_field='name', queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Offering
        fields = [
            'id',
            'business',
            'business_name',
            'kind',
            'name',
            'slug',
            'description',
            'category',
            'price',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'kind', 'business_name', 'slug', 'is_active', 'created_at', 'updated_at']
        extra_kwargs = {'business': {'required': True}}


class OrderItemWriteSerializer(serializers.Serializer):
    offering = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderCreateSerializer(serializers.Serializer):
    """Create an order from offerings, all belonging to one business."""

    business = serializers.UUIDField()
    items = OrderItemWriteSerializer(many=True, min_length=1)

    def validate(self, attrs):
        business_id = attrs['business']
        offerings = Offering.objects.filter(
            id__in=[item['offering'] for item in attrs['items']],
            business_id=business_id,
            is_active=True,
        )
        found = {str(o.id): o for o in offerings}
        for item in attrs['items']:
            offering = found.get(str(item['offering']))
            if offering is None:
                raise serializers.ValidationError(
                    {'items': f"Offering {item['offering']} is not an active offering of this business."}
                )
        attrs['_offerings'] = found
        return attrs

    def create(self, validated_data):
        customer = self.context['request'].user
        business = Business.objects.get(pk=validated_data['business'])
        order = Order.objects.create(customer=customer, business=business)

        items = []
        for item in validated_data['items']:
            offering = validated_data['_offerings'][str(item['offering'])]
            items.append(
                OrderItem(
                    order=order,
                    offering=offering,
                    quantity=item['quantity'],
                    unit_price=offering.price,
                    line_total=offering.price * item['quantity'],
                )
            )
        OrderItem.objects.bulk_create(items)
        order.recalculate_total()
        return order


class OrderItemReadSerializer(serializers.ModelSerializer):
    offering_name = serializers.CharField(source='offering.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'offering_name', 'quantity', 'unit_price', 'line_total']
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source='customer.email', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_email',
            'business',
            'business_name',
            'status',
            'total',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']