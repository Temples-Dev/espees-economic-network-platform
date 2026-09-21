from django.contrib import admin

from django.contrib import messages

from . import dispute_services
from .models import Dispute, Offering, Order, OrderItem


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

@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ['order', 'reason', 'status', 'outcome', 'opened_by', 'created_at']
    list_filter = ['status', 'reason', 'outcome']
    search_fields = ['order__id', 'opened_by__email', 'description']
    readonly_fields = ['order', 'opened_by', 'reason', 'description', 'status', 'outcome', 'resolved_by', 'resolved_at']
    actions = ['resolve_for_customer', 'resolve_for_business', 'dismiss']

    def _resolve(self, request, queryset, outcome):
        note = (request.POST.get('resolution_note') or '').strip() or self._default_note(outcome)
        done = 0
        for dispute in queryset.filter(status=Dispute.Status.OPEN):
            dispute_services.resolve_dispute(dispute, request.user, outcome, note)
            done += 1
        self.message_user(request, f'{done} dispute(s) resolved.', messages.SUCCESS)

    @staticmethod
    def _default_note(outcome):
        return {
            Dispute.Outcome.FOR_CUSTOMER: 'Reviewed by the platform team and decided in the customer\'s favour.',
            Dispute.Outcome.FOR_BUSINESS: 'Reviewed by the platform team and decided in the business\'s favour.',
            Dispute.Outcome.DISMISSED: 'Reviewed by the platform team and dismissed for lack of evidence.',
        }[outcome]

    @admin.action(description='Resolve in favour of the customer')
    def resolve_for_customer(self, request, queryset):
        self._resolve(request, queryset, Dispute.Outcome.FOR_CUSTOMER)

    @admin.action(description='Resolve in favour of the business')
    def resolve_for_business(self, request, queryset):
        self._resolve(request, queryset, Dispute.Outcome.FOR_BUSINESS)

    @admin.action(description='Dismiss')
    def dismiss(self, request, queryset):
        self._resolve(request, queryset, Dispute.Outcome.DISMISSED)
