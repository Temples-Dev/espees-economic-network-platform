from django.test import RequestFactory, TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts import security
from accounts.models import User
from businesses import services
from businesses.models import Business, BusinessMembership, VerificationRequest
from commerce.models import Order
from core import audit
from core.models import AuditLog


class AuditHelperTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ama@example.com', password='pw-strong-1')

    def test_records_who_did_what_to_which_object(self):
        business = Business.objects.create(owner=self.user, name='Shop')
        entry = audit.record(self.user, 'business.updated', target=business, changed=['name'])
        self.assertEqual(entry.actor, self.user)
        self.assertEqual(entry.action, 'business.updated')
        self.assertEqual(entry.target_type, 'business')
        self.assertEqual(entry.target_id, str(business.pk))
        self.assertEqual(entry.metadata, {'changed': ['name']})

    def test_captures_the_client_ip_from_a_request(self):
        request = RequestFactory().post('/', REMOTE_ADDR='102.5.5.5')
        entry = audit.record(self.user, 'x.y', request=request)
        self.assertEqual(entry.ip_address, '102.5.5.5')

    def test_works_without_a_target_or_actor(self):
        entry = audit.record(None, 'system.tick')
        self.assertIsNone(entry.actor)
        self.assertEqual(entry.target_type, '')

    def test_an_audit_failure_never_breaks_the_caller(self):
        from unittest import mock

        with mock.patch.object(AuditLog.objects, 'create', side_effect=RuntimeError('db down')):
            self.assertIsNone(audit.record(self.user, 'x.y'))

    def test_entries_cannot_be_edited_through_admin(self):
        from django.contrib.admin.sites import site

        model_admin = site._registry[AuditLog]
        request = RequestFactory().get('/')
        request.user = User.objects.create_superuser(email='root@example.com', password='pw-strong-1')
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))


class AuditedActionsTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.customer = User.objects.create_user(email='cust@example.com', password='pw-strong-1')
        self.staff = User.objects.create_user(email='staff@example.com', password='pw-strong-1', is_staff=True)
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role='owner')

    def actions(self):
        return set(AuditLog.objects.values_list('action', flat=True))

    def test_order_status_changes_are_audited(self):
        order = Order.objects.create(customer=self.customer, business=self.business)
        self.client.force_authenticate(self.owner)
        self.client.patch(reverse('commerce:order-update-status', args=[order.id]), {'status': 'confirmed'}, format='json')
        entry = AuditLog.objects.get(action='order.status_changed')
        self.assertEqual(entry.actor, self.owner)
        self.assertEqual(entry.metadata, {'from': 'pending', 'to': 'confirmed'})

    def test_verification_decisions_are_audited(self):
        req = VerificationRequest.objects.create(business=self.business, submitted_by=self.owner, legal_name='T Ltd')
        services.approve_verification(req, self.staff)
        self.assertIn('business.verification_approved', self.actions())
        req2 = VerificationRequest.objects.create(business=self.business, submitted_by=self.owner, legal_name='T Ltd')
        services.reject_verification(req2, self.staff, 'blurry')
        self.assertIn('business.verification_rejected', self.actions())

    def test_adding_a_business_admin_is_audited(self):
        self.client.force_authenticate(self.owner)
        self.client.post(reverse('businesses:business-members', args=[self.business.id]), {'email': 'cust@example.com'}, format='json')
        self.assertIn('business.member_added', self.actions())

    def test_security_events_are_audited(self):
        security.notify_security(self.customer, 'Password reset', 'Your password was reset.')
        entry = AuditLog.objects.get(action='security.password_reset')
        self.assertEqual(entry.actor, self.customer)
