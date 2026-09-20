from django.contrib import admin

from .models import Business, BusinessMembership, Category


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