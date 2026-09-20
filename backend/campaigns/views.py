from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Campaign, CampaignMilestone, CampaignUpdate
from .permissions import IsCampaignCreatorOrReadOnly, IsMilestoneCampaignCreatorOrReadOnly
from .serializers import (
    CampaignContributionSerializer,
    CampaignContributionWriteSerializer,
    CampaignDetailSerializer,
    CampaignMilestoneSerializer,
    CampaignMilestoneWriteSerializer,
    CampaignSerializer,
    CampaignWriteSerializer,
)


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.select_related('creator', 'business')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCampaignCreatorOrReadOnly]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CampaignDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CampaignWriteSerializer
        return CampaignSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        visible = Q(status__in=[Campaign.Status.ACTIVE, Campaign.Status.COMPLETED])
        if user and user.is_authenticated:
            visible |= Q(creator=user)
        qs = qs.filter(visible)
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            qs = qs.annotate(
                raised_espees=Sum('contributions__amount_espees'),
                contribution_count=Count('contributions', distinct=True),
                disbursed_espees=Sum('milestones__amount_espees', filter=Q(milestones__disbursed=True)),
            )
        return qs

    def create(self, request, *args, **kwargs):
        write = CampaignWriteSerializer(data=request.data, context=self.get_serializer_context())
        write.is_valid(raise_exception=True)
        campaign = Campaign.objects.create(creator=request.user, status=Campaign.Status.DRAFT, **write.validated_data)
        return Response(
            CampaignSerializer(campaign, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, id=None):
        campaign = self.get_object()
        if campaign.status != Campaign.Status.DRAFT:
            return Response({'detail': 'Only draft campaigns can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign.status = Campaign.Status.ACTIVE
        campaign.save(update_fields=['status', 'updated_at'])
        return Response(CampaignSerializer(campaign, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, id=None):
        campaign = self.get_object()
        if campaign.status not in [Campaign.Status.DRAFT, Campaign.Status.ACTIVE]:
            return Response({'detail': 'This campaign cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign.status = Campaign.Status.CANCELLED
        campaign.save(update_fields=['status', 'updated_at'])
        return Response(CampaignSerializer(campaign, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, id=None):
        campaign = self.get_object()
        if campaign.status != Campaign.Status.ACTIVE:
            return Response({'detail': 'Only active campaigns can be completed.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign.status = Campaign.Status.COMPLETED
        campaign.save(update_fields=['status', 'updated_at'])
        return Response(CampaignSerializer(campaign, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='contribute')
    def contribute(self, request, id=None):
        campaign = self.get_object()
        serializer = CampaignContributionWriteSerializer(
            data=request.data, context={'request': request, 'campaign': campaign}
        )
        serializer.is_valid(raise_exception=True)
        contribution = serializer.save()
        # Close the campaign automatically when the goal is met.
        from django.db.models import Sum as _Sum
        raised = campaign.contributions.aggregate(total=_Sum('amount_espees'))['total'] or 0
        if raised >= campaign.goal_espees and campaign.status == Campaign.Status.ACTIVE:
            campaign.status = Campaign.Status.COMPLETED
            campaign.save(update_fields=['status', 'updated_at'])
        from notifications.services import notify
        notify(
            campaign.creator,
            'campaign',
            'New contribution',
            f'{request.user.email} contributed {contribution.amount_espees} Espees to "{campaign.title}".',
            target=campaign,
        )
        out = CampaignContributionSerializer(contribution, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='updates')
    def updates(self, request, id=None):
        campaign = self.get_object()
        title = request.data.get('title', '')
        body = request.data.get('body', '')
        if not body:
            return Response({'detail': 'Update body is required.'}, status=status.HTTP_400_BAD_REQUEST)
        update = CampaignUpdate.objects.create(campaign=campaign, title=title or '', body=body)
        return Response(
            {
                'id': str(update.id),
                'title': update.title,
                'body': update.body,
                'created_at': update.created_at,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='milestones')
    def milestones(self, request, id=None):
        campaign = self.get_object()
        data = dict(request.data)
        data.setdefault('campaign', str(campaign.id))
        serializer = CampaignMilestoneWriteSerializer(data=data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        milestone = serializer.save()
        return Response(
            CampaignMilestoneSerializer(milestone, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class CampaignMilestoneViewSet(viewsets.ModelViewSet):
    queryset = CampaignMilestone.objects.select_related('campaign')
    serializer_class = CampaignMilestoneSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsMilestoneCampaignCreatorOrReadOnly]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            qs = qs.filter(campaign__creator=self.request.user)
        return qs

    def destroy(self, request, *args, **kwargs):
        milestone = self.get_object()
        if milestone.disbursed:
            return Response({'detail': 'Disbursed milestones cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        milestone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)