from django.contrib import admin, messages

from . import services
from .models import Business, BusinessMembership, Category, VerificationRequest


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'category', 'location', 'verification_status', 'is_active']
    list_filter = ['verification_status', 'is_active', 'category']
    search_fields = ['name', 'description', 'owner__email']
    readonly_fields = ['slug']


@admin.register(BusinessMembership)
class BusinessMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'business', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['user__email', 'business__name']

@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = ['business', 'legal_name', 'registration_number', 'status', 'submitted_by', 'created_at']
    list_filter = ['status']
    search_fields = ['business__name', 'legal_name', 'registration_number']
    readonly_fields = ['reviewed_by', 'reviewed_at']
    actions = ['approve_selected', 'reject_selected']

    @admin.action(description='Approve selected requests (verifies the business)')
    def approve_selected(self, request, queryset):
        done = 0
        for req in queryset.filter(status=VerificationRequest.Status.PENDING):
            services.approve_verification(req, request.user)
            done += 1
        self.message_user(request, f'{done} request(s) approved.', messages.SUCCESS)

    @admin.action(description='Reject selected requests (asks the business to correct and reapply)')
    def reject_selected(self, request, queryset):
        done = 0
        for req in queryset.filter(status=VerificationRequest.Status.PENDING):
            services.reject_verification(req, request.user, 'The documents provided could not be verified')
            done += 1
        self.message_user(request, f'{done} request(s) rejected.', messages.WARNING)
