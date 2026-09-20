from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from campaigns.models import Campaign, CampaignContribution, CampaignMilestone, CampaignUpdate


class CampaignApiTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(email='creator@example.com', password='strong-password-1')
        self.supporter = User.objects.create_user(email='supporter@example.com', password='strong-password-1')
        self.other = User.objects.create_user(email='other@example.com', password='strong-password-1')

    def list_url(self):
        return reverse('campaigns:campaign-list')

    def detail_url(self, campaign):
        return reverse('campaigns:campaign-detail', args=[campaign.id])

    def create_campaign(self, status_=Campaign.Status.DRAFT, **overrides):
        payload = {
            'title': 'Fund the water pump',
            'description': 'Bring clean water to the community.',
            'purpose': 'Infrastructure',
            'goal_espees': '10000.00',
        }
        payload.update(overrides)
        self.client.force_authenticate(user=self.creator)
        resp = self.client.post(self.list_url(), payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        campaign = Campaign.objects.get(pk=resp.data['id'])
        campaign.status = status_
        campaign.save(update_fields=['status'])
        return campaign

    def test_create_campaign_requires_auth(self):
        resp = self.client.post(self.list_url(), {'title': 'x', 'goal_espees': '10.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_campaign_starts_as_draft(self):
        campaign = self.create_campaign()
        self.assertEqual(campaign.status, Campaign.Status.DRAFT)

    def test_drafts_hidden_from_public_list(self):
        campaign = self.create_campaign()
        self.client.force_authenticate(user=self.supporter)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.data['count'], 0)
        # Creator can always see their own.
        self.client.force_authenticate(user=self.creator)
        resp = self.client.get(self.list_url())
        ids = [item['id'] for item in resp.data['results']]
        self.assertIn(str(campaign.id), ids)

    def test_submit_then_list_public(self):
        campaign = self.create_campaign(status_=Campaign.Status.DRAFT)
        self.client.force_authenticate(user=self.creator)
        resp = self.client.post(reverse('campaigns:campaign-submit', args=[campaign.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'active')
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.ACTIVE)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.data['count'], 1)

    def test_only_creator_can_manage_campaign(self):
        campaign = self.create_campaign()
        self.client.force_authenticate(user=self.other)
        resp = self.client.post(reverse('campaigns:campaign-submit', args=[campaign.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_lifecycle_transitions(self):
        campaign = self.create_campaign()
        self.client.force_authenticate(user=self.creator)
        # draft -> active
        self.client.post(reverse('campaigns:campaign-submit', args=[campaign.id]), {}, format='json')
        # active -> completed
        resp = self.client.post(reverse('campaigns:campaign-complete', args=[campaign.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'completed')
        # completed cannot be cancelled
        resp = self.client.post(reverse('campaigns:campaign-cancel', args=[campaign.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contribute_requires_auth(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        campaign.save()
        resp = self.client.post(reverse('campaigns:campaign-contribute', args=[campaign.id]), {'amount_espees': '50.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_contribute_to_active_campaign(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        self.client.force_authenticate(user=self.supporter)
        resp = self.client.post(
            reverse('campaigns:campaign-contribute', args=[campaign.id]),
            {'amount_espees': '25.00', 'note': 'Keep going!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        contributed = CampaignContribution.objects.get(pk=resp.data['id'])
        self.assertEqual(contributed.amount_espees, 25)
        self.assertEqual(contributed.contributor, self.supporter)

    def test_creator_cannot_contribute_own_campaign(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        self.client.force_authenticate(user=self.creator)
        resp = self.client.post(
            reverse('campaigns:campaign-contribute', args=[campaign.id]), {'amount_espees': '50.00'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_contribution_on_inactive_campaign(self):
        campaign = Campaign.objects.create(creator=self.creator, title='t', goal_espees='100.00')
        self.client.force_authenticate(user=self.supporter)
        resp = self.client.post(
            reverse('campaigns:campaign-contribute', args=[campaign.id]), {'amount_espees': '50.00'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_contribution_after_end_date(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            title='t',
            goal_espees='100.00',
            status=Campaign.Status.ACTIVE,
            end_date=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(user=self.supporter)
        resp = self.client.post(
            reverse('campaigns:campaign-contribute', args=[campaign.id]), {'amount_espees': '50.00'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_goal_reached_auto_completes(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        self.client.force_authenticate(user=self.supporter)
        url = reverse('campaigns:campaign-contribute', args=[campaign.id])
        self.client.post(url, {'amount_espees': '60.00'}, format='json')
        self.client.force_authenticate(user=self.other)
        resp = self.client.post(url, {'amount_espees': '40.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.COMPLETED)

    def test_detail_shows_transparency(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        CampaignContribution.objects.create(campaign=campaign, contributor=self.supporter, amount_espees='30.00')
        CampaignMilestone.objects.create(
            campaign=campaign, title='Feasibility', amount_espees='20.00', achieved=True, disbursed=True
        )
        CampaignUpdate.objects.create(campaign=campaign, title='Progress', body='halfway there')
        resp = self.client.get(self.detail_url(campaign))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['raised_espees'], '30.00')
        self.assertEqual(resp.data['contribution_count'], 1)
        self.assertEqual(resp.data['disbursed_espees'], '20.00')
        self.assertEqual(len(resp.data['milestones']), 1)
        self.assertEqual(resp.data['updates'][0]['title'], 'Progress')

    def test_creator_posts_update_and_milestone(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        self.client.force_authenticate(user=self.creator)
        resp = self.client.post(
            reverse('campaigns:campaign-updates', args=[campaign.id]),
            {'title': 'Update 1', 'body': 'We started the works.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CampaignUpdate.objects.count(), 1)

        resp = self.client.post(
            reverse('campaigns:campaign-milestones', args=[campaign.id]),
            {'title': 'Foundation', 'amount_espees': '5000.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CampaignMilestone.objects.get().amount_espees, 5000)

    def test_milestone_only_on_active_campaign(self):
        campaign = Campaign.objects.create(creator=self.creator, title='t', goal_espees='100.00')
        self.client.force_authenticate(user=self.creator)
        # Midnight — the campaign was created without a status; ensure the campaign is a draft.
        campaign.status = Campaign.Status.DRAFT
        campaign.save(update_fields=['status'])
        resp = self.client.post(
            reverse('campaigns:campaign-milestones', args=[campaign.id]),
            {'title': 'Foundation', 'amount_espees': '5000.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_milestone_can_be_marked_disbursed_by_creator(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        milestone = CampaignMilestone.objects.create(
            campaign=campaign, title='First', amount_espees='40.00'
        )
        self.client.force_authenticate(user=self.creator)
        resp = self.client.patch(
            reverse('campaigns:campaign-milestone-detail', args=[milestone.id]),
            {'achieved': True, 'disbursed': True},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        milestone.refresh_from_db()
        self.assertTrue(milestone.disbursed)
        self.assertIsNotNone(milestone.disbursed_at)

    def test_non_creator_cannot_touch_milestone(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        milestone = CampaignMilestone.objects.create(campaign=campaign, title='First', amount_espees='40.00')
        self.client.force_authenticate(user=self.supporter)
        resp = self.client.patch(
            reverse('campaigns:campaign-milestone-detail', args=[milestone.id]),
            {'disbursed': True},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_disbursed_milestone_cannot_be_deleted(self):
        campaign = Campaign.objects.create(
            creator=self.creator, title='t', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        milestone = CampaignMilestone.objects.create(
            campaign=campaign, title='First', amount_espees='40.00', disbursed=True
        )
        self.client.force_authenticate(user=self.creator)
        resp = self.client.delete(reverse('campaigns:campaign-milestone-detail', args=[milestone.id]))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)