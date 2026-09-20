from django.contrib import admin

from .models import Offering, Order, OrderItem


@admin.register(Offering)
class OfferingAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'kind', 'price', 'is_active', 'created_at']
    list_filter = ['kind', 'is_active', 'category']
    search_fields = ['name', 'description', 'business__name']
    readonly_fields = ['id', 'slug']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['id', 'unit_price', 'line_total']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'business', 'status', 'total', 'created_at']
    list_filter = ['status']
    search_fields = ['customer__email', 'business__name', 'id']
    inlines = [OrderItemInline]
    readonly_fields = ['id', 'total']