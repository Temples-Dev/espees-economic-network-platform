from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Payment, ReconciliationRecord


class MerchantPaymentWriteSerializer(serializers.Serializer):
    narration = serializers.CharField(max_length=255)
    amount_espees = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    product_sku = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    success_url = serializers.CharField(max_length=512, required=False, allow_blank=True, default='')
    fail_url = serializers.CharField(max_length=512, required=False, allow_blank=True, default='')
    user_data = serializers.DictField(required=False, default=dict)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')


class PaymentSerializer(serializers.ModelSerializer):
    payment_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'operation_type', 'product_sku', 'narration', 'amount_espees',
            'merchant_wallet', 'success_url', 'fail_url', 'user_data',
            'idempotency_key', 'correlation_id', 'espees_payment_ref',
            'external_status', 'customer_username', 'status_details',
            'transaction_date_raw', 'status', 'status_detail', 'confirmed_at',
            'payment_url', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_payment_url(self, obj) -> str:
        from .adapters import payment_url

        if obj.espees_payment_ref:
            return payment_url(obj.espees_payment_ref)
        return ''

class ReconciliationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReconciliationRecord
        fields = [
            'id', 'payment', 'eenp_transaction_id', 'external_reference',
            'operation_type', 'amount', 'currency', 'external_status',
            'internal_status', 'reconciliation_status', 'correlation_id',
            'details', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WalletQueueSerializer(serializers.Serializer):
    """Staff queue row: wallet association plus the claiming member."""

    id = serializers.UUIDField(read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    espees_wallet_address = serializers.CharField(read_only=True)
    external_account_reference = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_detail = serializers.CharField(read_only=True)
    provisioned_at = serializers.DateTimeField(read_only=True, allow_null=True)
    updated_at = serializers.DateTimeField(read_only=True)
