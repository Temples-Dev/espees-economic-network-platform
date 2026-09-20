from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import Campaign, CampaignContribution, CampaignMilestone, CampaignUpdate


class CreatorSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'email', 'full_name']


class CampaignContributionSerializer(serializers.ModelSerializer):
    contributor_name = serializers.CharField(source='contributor.full_name', read_only=True)
    contributor_email = serializers.EmailField(source='contributor.email', read_only=True)

    class Meta:
        model = CampaignContribution
        fields = ['id', 'contributor', 'contributor_name', 'contributor_email', 'amount_espees', 'note', 'created_at']
        read_only_fields = ['id', 'contributor', 'contributor_name', 'contributor_email', 'created_at']


class CampaignMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignMilestone
        fields = ['id', 'campaign', 'title', 'amount_espees', 'achieved', 'disbursed', 'disbursed_at', 'created_at']

    def update(self, instance, validated_data):
        if 'disbursed' in validated_data:
            if validated_data['disbursed'] and not instance.disbursed:
                instance.disbursed_at = timezone.now()
            elif not validated_data['disbursed']:
                instance.disbursed_at = None
        return super().update(instance, validated_data)


class CampaignMilestoneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignMilestone
        fields = ['campaign', 'title', 'amount_espees']

    def validate_campaign(self, value):
        self.context['campaign'] = value
        return value

    def validate(self, attrs):
        campaign = attrs.get('campaign')
        if campaign and campaign.status != Campaign.Status.ACTIVE:
            raise serializers.ValidationError({'campaign': 'Milestones can only be set on active campaigns.'})
        return attrs


class CampaignSerializer(serializers.ModelSerializer):
    creator = CreatorSummarySerializer(read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True, default=None)
    raised_espees = serializers.SerializerMethodField()
    contribution_count = serializers.SerializerMethodField()
    disbursed_espees = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id',
            'creator',
            'business',
            'business_name',
            'title',
            'description',
            'purpose',
            'goal_espees',
            'end_date',
            'status',
            'raised_espees',
            'contribution_count',
            'disbursed_espees',
            'days_remaining',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'business_name', 'status', 'created_at', 'updated_at']

    def get_raised_espees(self, obj):
        from decimal import Decimal
        raised = getattr(obj, 'raised_espees', None)
        if raised is None:
            from django.db.models import Sum
            raised = obj.contributions.aggregate(total=Sum('amount_espees'))['total'] or 0
        return f'{Decimal(str(raised)):.2f}'

    def get_contribution_count(self, obj):
        return getattr(obj, 'contribution_count', obj.contributions.count())

    def get_disbursed_espees(self, obj):
        from decimal import Decimal
        disbursed = getattr(obj, 'disbursed_espees', None)
        if disbursed is None:
            from django.db.models import Sum
            disbursed = (
                obj.milestones.filter(disbursed=True).aggregate(total=Sum('amount_espees'))['total'] or 0
            )
        return f'{Decimal(str(disbursed)):.2f}'

    def get_days_remaining(self, obj):
        if not obj.end_date:
            return None
        remaining = obj.end_date - timezone.now()
        return max(0, remaining.days)


class CampaignDetailSerializer(CampaignSerializer):
    milestones = CampaignMilestoneSerializer(many=True, read_only=True)
    updates = serializers.SerializerMethodField()

    class Meta(CampaignSerializer.Meta):
        fields = CampaignSerializer.Meta.fields + ['milestones', 'updates']

    def get_updates(self, obj):
        return [
            {
                'id': str(u.id),
                'title': u.title,
                'body': u.body,
                'created_at': u.created_at,
            }
            for u in obj.updates.all()
        ]


class CampaignWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ['business', 'title', 'description', 'purpose', 'goal_espees', 'end_date']


class CampaignContributionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignContribution
        fields = ['amount_espees', 'note']

    def validate(self, attrs):
        request = self.context['request']
        campaign = self.context['campaign']
        if request.user.id == campaign.creator_id:
            raise serializers.ValidationError('You cannot contribute to your own campaign.')
        if campaign.status != Campaign.Status.ACTIVE:
            raise serializers.ValidationError('This campaign is not accepting contributions.')
        if campaign.end_date and timezone.now() > campaign.end_date:
            raise serializers.ValidationError('This campaign has ended.')
        return attrs

    def create(self, validated_data):
        return CampaignContribution.objects.create(
            campaign=self.context['campaign'],
            contributor=self.context['request'].user,
            amount_espees=validated_data['amount_espees'],
            note=validated_data.get('note', ''),
        )