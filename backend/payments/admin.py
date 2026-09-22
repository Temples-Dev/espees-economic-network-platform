from django.contrib import admin

from .models import Payment, ReconciliationRecord


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['product_sku', 'amount_espees', 'status', 'external_status', 'initiator', 'created_at']
    list_filter = ['status', 'external_status', 'operation_type']
    search_fields = ['product_sku', 'espees_payment_ref', 'idempotency_key', 'initiator__email']
    readonly_fields = [f.name for f in Payment._meta.fields]


@admin.register(ReconciliationRecord)
class ReconciliationRecordAdmin(admin.ModelAdmin):
    list_display = ['eenp_transaction_id', 'reconciliation_status', 'amount', 'currency', 'created_at']
    list_filter = ['reconciliation_status', 'currency']
    search_fields = ['eenp_transaction_id', 'external_reference', 'correlation_id']
    readonly_fields = [f.name for f in ReconciliationRecord._meta.fields]

    def has_add_permission(self, request):
        return False
