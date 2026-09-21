from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from commerce import dispute_services
from commerce.models import Dispute, Order
from core.models import AuditLog
from notifications.models import Notification


class DisputeApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.customer = User.objects.create_user(email='cust@example.com', password='pw-strong-1')
        self.stranger = User.objects.create_user(email='x@example.com', password='pw-strong-1')
        self.staff = User.objects.create_user(email='staff@example.com', password='pw-strong-1', is_staff=True)
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role='owner')
        self.order = Order.objects.create(customer=self.customer, business=self.business, status='confirmed', total='40.00')
        self.url = reverse('commerce:dispute-list')

    def open(self, user, **extra):
        self.client.force_authenticate(user)
        data = {'order': str(self.order.id), 'reason': 'not_received', 'description': 'It never arrived', **extra}
        return self.client.post(self.url, data, format='json')

    def test_requires_authentication(self):
        self.assertEqual(self.client.post(self.url, {}, format='json').status_code, 401)

    def test_customer_opens_a_dispute_and_the_business_is_notified(self):
        resp = self.open(self.customer)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data['status'], 'open')
        self.assertEqual(resp.data['reason'], 'not_received')
        self.assertTrue(Notification.objects.filter(recipient=self.owner, title__icontains='dispute').exists())

    def test_business_can_also_open_a_dispute(self):
        resp = self.open(self.owner, reason='wrong_amount')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(Notification.objects.filter(recipient=self.customer, title__icontains='dispute').exists())

    def test_strangers_cannot_dispute_an_order(self):
        self.assertEqual(self.open(self.stranger).status_code, status.HTTP_400_BAD_REQUEST)

    def test_description_and_valid_reason_are_required(self):
        self.assertEqual(self.open(self.customer, description='').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.open(self.customer, reason='vibes').status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_one_open_dispute_per_order(self):
        self.open(self.customer)
        self.assertEqual(self.open(self.customer).status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_orders_cannot_be_disputed(self):
        Order.objects.filter(pk=self.order.pk).update(status='cancelled')
        self.assertEqual(self.open(self.customer).status_code, status.HTTP_400_BAD_REQUEST)

    def test_pending_orders_cannot_be_disputed_yet(self):
        Order.objects.filter(pk=self.order.pk).update(status='pending')
        self.assertEqual(self.open(self.customer).status_code, status.HTTP_400_BAD_REQUEST)

    def test_listing_shows_only_your_disputes_and_filters_by_status(self):
        self.open(self.customer)
        self.client.force_authenticate(self.customer)
        self.assertEqual(len(self.client.get(self.url).data['results']), 1)
        self.client.force_authenticate(self.owner)
        self.assertEqual(len(self.client.get(self.url).data['results']), 1)
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(self.url).data['results'], [])
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(self.url, {'status': 'resolved'}).data['results'], [])
        self.assertEqual(len(self.client.get(self.url, {'order': str(self.order.id)}).data['results']), 1)

    def test_detail_is_visible_to_the_parties_only(self):
        dispute_id = self.open(self.customer).data['id']
        detail = reverse('commerce:dispute-detail', args=[dispute_id])
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(detail).status_code, 200)
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(detail).status_code, 404)

    def test_disputes_cannot_be_edited_or_deleted_through_the_api(self):
        dispute_id = self.open(self.customer).data['id']
        detail = reverse('commerce:dispute-detail', args=[dispute_id])
        self.assertEqual(self.client.patch(detail, {'status': 'resolved'}, format='json').status_code, 405)
        self.assertEqual(self.client.delete(detail).status_code, 405)

    def test_opening_a_dispute_is_audited(self):
        self.open(self.customer)
        self.assertTrue(AuditLog.objects.filter(actor=self.customer, action='dispute.opened').exists())


class DisputeResolutionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.customer = User.objects.create_user(email='cust@example.com', password='pw-strong-1')
        self.staff = User.objects.create_user(email='staff@example.com', password='pw-strong-1', is_staff=True)
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role='owner')
        order = Order.objects.create(customer=self.customer, business=self.business, status='confirmed')
        self.dispute = Dispute.objects.create(order=order, opened_by=self.customer, reason='not_received', description='x')

    def test_resolving_records_the_outcome_and_notifies_both_parties(self):
        dispute_services.resolve_dispute(self.dispute, self.staff, Dispute.Outcome.FOR_CUSTOMER, 'Confirmed non-delivery')
        self.dispute.refresh_from_db()
        self.assertEqual(self.dispute.status, Dispute.Status.RESOLVED)
        self.assertEqual(self.dispute.outcome, 'for_customer')
        self.assertEqual(self.dispute.resolution_note, 'Confirmed non-delivery')
        self.assertEqual(self.dispute.resolved_by, self.staff)
        self.assertIsNotNone(self.dispute.resolved_at)
        for user in (self.owner, self.customer):
            self.assertTrue(Notification.objects.filter(recipient=user, title__icontains='dispute').exists())
        self.assertTrue(AuditLog.objects.filter(actor=self.staff, action='dispute.resolved').exists())

    def test_a_resolved_dispute_cannot_be_resolved_again(self):
        dispute_services.resolve_dispute(self.dispute, self.staff, Dispute.Outcome.DISMISSED, 'No evidence')
        with self.assertRaises(ValueError):
            dispute_services.resolve_dispute(self.dispute, self.staff, Dispute.Outcome.FOR_BUSINESS, 'again')

    def test_a_note_is_required(self):
        with self.assertRaises(ValueError):
            dispute_services.resolve_dispute(self.dispute, self.staff, Dispute.Outcome.DISMISSED, '  ')

    def test_after_resolution_a_new_dispute_can_be_opened(self):
        dispute_services.resolve_dispute(self.dispute, self.staff, Dispute.Outcome.DISMISSED, 'No evidence')
        self.client.force_authenticate(self.customer)
        resp = self.client.post(
            reverse('commerce:dispute-list'),
            {'order': str(self.dispute.order_id), 'reason': 'other', 'description': 'New info'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
