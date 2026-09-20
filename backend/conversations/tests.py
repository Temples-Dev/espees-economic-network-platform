from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from commerce.models import Offering, Order
from conversations.models import Conversation, Message


class ConversationApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(email='alice@example.com', password='strong-password-1')
        self.bob = User.objects.create_user(email='bob@example.com', password='strong-password-1')
        self.carol = User.objects.create_user(email='carol@example.com', password='strong-password-1')

        self.business = Business.objects.create(owner=self.bob, name='Tante Grill', location='Accra')
        BusinessMembership.objects.create(user=self.bob, business=self.business, role=BusinessMembership.Role.OWNER)
        self.product = Offering.objects.create(
            business=self.business, kind=Offering.Kind.PRODUCT, name='Jollof Combo', price='25.00'
        )

    def list_url(self):
        return reverse('conversations:conversation-list')

    def detail_url(self, conversation):
        return reverse('conversations:conversation-detail', args=[conversation.id])

    def messages_url(self, conversation):
        return reverse('conversations:conversation-messages', args=[conversation.id])

    def read_url(self, conversation):
        return reverse('conversations:conversation-read', args=[conversation.id])

    def test_create_requires_auth(self):
        resp = self.client.post(self.list_url(), {'other_party': str(self.bob.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_conversation(self):
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(self.list_url(), {'other_party': str(self.bob.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['initiator']['email'], 'alice@example.com')
        self.assertEqual(resp.data['other_party']['email'], 'bob@example.com')

    def test_create_with_self_rejected(self):
        self.client.force_authenticate(user=self.alice)
        resp = self.client.post(self.list_url(), {'other_party': str(self.alice.id)}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_direct_thread_is_reused(self):
        self.client.force_authenticate(user=self.alice)
        payload = {'other_party': str(self.bob.id)}
        first = self.client.post(self.list_url(), payload, format='json')
        second = self.client.post(self.list_url(), payload, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_order_context_requires_involvement(self):
        self.client.force_authenticate(user=self.alice)
        Order.objects.create(customer=self.alice, business=self.business)
        order = Order.objects.create(customer=self.bob, business=self.business)
        self.client.post(
            self.list_url(), {'other_party': str(self.bob.id), 'order': str(order.id)}, format='json'
        )
        resp = self.client.post(
            self.list_url(), {'other_party': str(self.bob.id), 'order': str(order.id)}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_and_list_messages(self):
        self.client.force_authenticate(user=self.alice)
        conversation = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        msg = self.client.post(self.messages_url(conversation), {'body': 'Hi Bob!'}, format='json')
        self.assertEqual(msg.status_code, status.HTTP_201_CREATED)
        self.assertEqual(msg.data['body'], 'Hi Bob!')

        detail = self.client.get(self.detail_url(conversation))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data['messages']), 1)
        self.assertEqual(detail.data['messages'][0]['sender_email'], 'alice@example.com')

    def test_only_participants_can_send(self):
        conversation = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        self.client.force_authenticate(user=self.carol)
        resp = self.client.post(self.messages_url(conversation), {'body': 'intrusion'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.messages_url(conversation), {'body': 'hi'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_non_participant_cannot_read(self):
        conversation = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        self.client.force_authenticate(user=self.carol)
        resp = self.client.get(self.detail_url(conversation))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_shows_own_conversations(self):
        c1 = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        c2 = Conversation.objects.create(initiator=self.bob, other_party=self.carol)
        self.client.force_authenticate(user=self.alice)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in resp.data['results']]
        self.assertIn(str(c1.id), ids)
        self.assertNotIn(str(c2.id), ids)

    def test_message_ordering_and_read(self):
        conversation = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        self.client.force_authenticate(user=self.alice)
        self.client.post(self.messages_url(conversation), {'body': 'first'}, format='json')
        self.client.post(self.messages_url(conversation), {'body': 'second'}, format='json')
        detail = self.client.get(self.detail_url(conversation))
        bodies = [m['body'] for m in detail.data['messages']]
        self.assertEqual(bodies, ['first', 'second'])

        self.client.force_authenticate(user=self.bob)
        resp = self.client.post(self.read_url(conversation), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['marked_read'], 2)
        self.assertTrue(Message.objects.filter(read_at__isnull=False).count(), 2)

    def test_unread_count_and_ordering(self):
        conv = Conversation.objects.create(initiator=self.alice, other_party=self.bob)
        self.client.force_authenticate(user=self.alice)
        self.client.post(self.messages_url(conv), {'body': 'one'}, format='json')
        self.client.force_authenticate(user=self.bob)
        self.client.post(self.messages_url(conv), {'body': 'two'}, format='json')

        self.client.force_authenticate(user=self.alice)
        listing = self.client.get(self.list_url())
        results = listing.data['results']
        self.assertEqual(results[0]['id'], str(conv.id))
        self.assertEqual(results[0]['unread_count'], 1)