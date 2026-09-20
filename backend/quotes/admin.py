from django.contrib import admin

from .models import Quote, SupplierRequest


class QuoteInline(admin.TabularInline):
    model = Quote
    extra = 0
    ordering = ['amount_espees']


@admin.register(SupplierRequest)
class SupplierRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'requesting_business', 'category', 'budget_espees', 'status', 'created_at']
    list_filter = ['status', 'category']
    search_fields = ['title', 'description', 'requesting_business__name']
    inlines = [QuoteInline]


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'supplier_business', 'amount_espees', 'delivery_days', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['request__title', 'supplier_business__name', 'message']