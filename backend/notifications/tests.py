from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from campaigns.models import Campaign
from conversations.models import Conversation
from notifications.models import Notification, NotificationPreference


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(email='alice@example.com', password='strong-password-1')
        self.bob = User.objects.create_user(email='bob@example.com', password='strong-password-1')

    def test_notify_service_creates_in_app_notification(self):
        from notifications.services import notify
        notified = notify(self.bob, 'communication', 'New message', 'hi', target=None)
        self.assertIsNotNone(notified)
        self.assertEqual(notification_for := Notification.objects.get(pk=notified.id).recipient, self.bob)

    def test_list_requires_auth(self):
        resp = self.client.get(reverse('notifications:notification-list'))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_shows_only_own(self):
        Notification.objects.create(recipient=self.bob, category='commerce', title='yours', message='x')
        Notification.objects.create(recipient=self.alice, category='commerce', title='mine', message='x')
        self.client.force_authenticate(user=self.alice)
        resp = self.client.get(reverse('notifications:notification-list'))
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['title'], 'mine')

    def test_unread_filter(self):
        Notification.objects.create(recipient=self.alice, category='commerce', title='a', message='x')
        Notification.objects.create(
            recipient=self.alice, category='commerce', title='b', message='x', read_at='2026-01-01T00:00:00Z'
        )
        self.client.force_authenticate(user=self.alice)
        resp = self.client.get(reverse('notifications:notification-list'), {'unread': 'true'})
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['title'], 'a')

    def test_mark_single_read(self):
        n = Notification.objects.create(recipient=self.alice, category='commerce', title='a', message='x')
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(reverse('notifications:notification-read', args=[n.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_read'])
        n.refresh_from_db()
        self.assertIsNotNone(n.read_at)

    def test_read_all(self):
        Notification.objects.create(recipient=self.alice, category='commerce', title='a', message='x')
        Notification.objects.create(recipient=self.alice, category='campaign', title='b', message='x')
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(reverse('notifications:notification-read-all'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['marked_read'], 2)

    def test_cannot_read_others_notification(self):
        n = Notification.objects.create(recipient=self.bob, category='commerce', title='a', message='x')
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(reverse('notifications:notification-read', args=[n.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_preferences_defaults(self):
        self.client.force_authenticate(user=self.alice)
        resp = self.client.get(reverse('notifications:notification-preferences'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['in_app'])
        self.assertFalse(resp.data['sms'])

    def test_preferences_patch(self):
        self.client.force_authenticate(user=self.alice)
        resp = self.client.patch(
            reverse('notifications:notification-preferences'), {'email': False, 'sms': True}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pref = NotificationPreference.objects.get(user=self.alice)
        self.assertFalse(pref.email)
        self.assertTrue(pref.sms)

    def test_new_message_event_notifies_other_party(self):
        conversation = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        self.client.force_authenticate(user=self.alice)
        self.client.post(
            reverse('conversations:conversation-messages', args=[conversation.id]),
            {'body': 'Hello Bob'},
            format='json',
        )
        n = Notification.objects.get(recipient=self.bob, category='communication')
        self.assertIn('Hello Bob', n.message)
        self.assertEqual(n.target, conversation)

    def test_new_order_event_notifies_business(self):
        from commerce.models import Offering, Order, OrderItem
        business = Business.objects.create(owner=self.bob, name='Shop', location='Accra')
        BusinessMembership.objects.create(user=self.bob, business=business, role=BusinessMembership.Role.OWNER)
        offering = Offering.objects.create(business=business, kind=Offering.Kind.PRODUCT, name='Item', price='10.00')
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(
            reverse('commerce:order-list'),
            {'business': str(business.id), 'items': [{'offering': str(offering.id), 'quantity': 2}]},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(pk=resp.data['id'])
        n = Notification.objects.get(
            recipient=self.bob,
            category='commerce',
            target_content_type=ContentType.objects.get_for_model(Order),
            target_object_id=order.id,
        )
        self.assertEqual(n.target, order)

    def test_contribution_event_notifies_creator(self):
        community = User.objects.create_user(email='creator@example.com', password='strong-password-1')
        campaign = Campaign.objects.create(
            creator=community, title='Water', goal_espees='100.00', status=Campaign.Status.ACTIVE
        )
        self.client.force_authenticate(user=self.alice)
        self.client.post(
            reverse('campaigns:campaign-contribute', args=[campaign.id]), {'amount_espees': '20.00'}, format='json'
        )
        n = Notification.objects.get(
            recipient=community,
            category='campaign',
            target_content_type=ContentType.objects.get_for_model(Campaign),
            target_object_id=campaign.id,
        )
        self.assertEqual(n.target, campaign)