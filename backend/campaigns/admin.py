from django.contrib import admin

from .models import Campaign, CampaignContribution, CampaignMilestone, CampaignUpdate


class MilestoneInline(admin.TabularInline):
    model = CampaignMilestone
    extra = 0


class UpdateInline(admin.TabularInline):
    model = CampaignUpdate
    extra = 0


class ContributionInline(admin.TabularInline):
    model = CampaignContribution
    extra = 0
    ordering = ['-created_at']


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'creator', 'business', 'goal_espees', 'status', 'end_date', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'description', 'creator__email', 'business__name']
    inlines = [MilestoneInline, UpdateInline, ContributionInline]


@admin.register(CampaignMilestone)
class CampaignMilestoneAdmin(admin.ModelAdmin):
    list_display = ['id', 'campaign', 'title', 'amount_espees', 'achieved', 'disbursed']
    list_filter = ['achieved', 'disbursed']


@admin.register(CampaignUpdate)
class CampaignUpdateAdmin(admin.ModelAdmin):
    list_display = ['id', 'campaign', 'title', 'created_at']


@admin.register(CampaignContribution)
class CampaignContributionAdmin(admin.ModelAdmin):
    list_display = ['id', 'campaign', 'contributor', 'amount_espees', 'created_at']
    search_fields = ['campaign__title', 'contributor__email']