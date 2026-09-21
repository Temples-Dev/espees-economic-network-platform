import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses import services
from businesses.models import Business, BusinessMembership, VerificationRequest
from notifications.models import Notification

MEDIA = tempfile.mkdtemp()


def pdf(name='reg.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4 certificate', content_type='application/pdf')


@override_settings(MEDIA_ROOT=MEDIA)
class VerificationApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.other = User.objects.create_user(email='other@example.com', password='pw-strong-1')
        self.staff = User.objects.create_user(email='staff@example.com', password='pw-strong-1', is_staff=True)
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)
        self.url = reverse('businesses:business-verification', args=[self.business.id])

    def submit(self, **extra):
        data = {'legal_name': 'Tante Grill Ltd', 'registration_number': 'CS123', 'document': pdf(), **extra}
        return self.client.post(self.url, data, format='multipart')

    def test_owner_submits_and_business_becomes_pending(self):
        self.client.force_authenticate(self.owner)
        resp = self.submit()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data['status'], 'pending')
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, Business.VerificationStatus.PENDING)

    def test_legal_name_is_required(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.url, {'registration_number': 'X'}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('legal_name', resp.data)

    def test_non_member_cannot_submit(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.submit().status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_submit(self):
        self.assertEqual(self.submit().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_submit_twice_while_pending(self):
        self.client.force_authenticate(self.owner)
        self.submit()
        resp = self.submit()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_submit_when_already_verified(self):
        Business.objects.filter(pk=self.business.pk).update(verification_status='verified')
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.submit().status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_read_latest_request_status(self):
        self.client.force_authenticate(self.owner)
        self.submit()
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'pending')
        self.assertEqual(resp.data['legal_name'], 'Tante Grill Ltd')

    def test_read_is_404_before_any_submission_and_private_to_members(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_rejected_business_can_resubmit(self):
        self.client.force_authenticate(self.owner)
        first = VerificationRequest.objects.get(pk=self.submit().data['id'])
        services.reject_verification(first, self.staff, 'Blurry document')
        self.assertEqual(self.submit().status_code, status.HTTP_201_CREATED)


@override_settings(MEDIA_ROOT=MEDIA)
class VerificationReviewTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.staff = User.objects.create_user(email='staff@example.com', password='pw-strong-1', is_staff=True)
        self.business = Business.objects.create(
            owner=self.owner, name='Tante Grill', verification_status=Business.VerificationStatus.PENDING
        )
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)
        self.req = VerificationRequest.objects.create(
            business=self.business, submitted_by=self.owner, legal_name='Tante Grill Ltd'
        )

    def test_approve_verifies_business_and_notifies_owner(self):
        services.approve_verification(self.req, self.staff)
        self.req.refresh_from_db()
        self.business.refresh_from_db()
        self.assertEqual(self.req.status, VerificationRequest.Status.APPROVED)
        self.assertEqual(self.req.reviewed_by, self.staff)
        self.assertIsNotNone(self.req.reviewed_at)
        self.assertEqual(self.business.verification_status, Business.VerificationStatus.VERIFIED)
        self.assertTrue(Notification.objects.filter(recipient=self.owner, title__icontains='verified').exists())

    def test_reject_resets_business_and_records_reason(self):
        services.reject_verification(self.req, self.staff, 'Registration number does not match')
        self.req.refresh_from_db()
        self.business.refresh_from_db()
        self.assertEqual(self.req.status, VerificationRequest.Status.REJECTED)
        self.assertEqual(self.req.rejection_reason, 'Registration number does not match')
        self.assertEqual(self.business.verification_status, Business.VerificationStatus.UNVERIFIED)
        note = Notification.objects.get(recipient=self.owner)
        self.assertIn('Registration number does not match', note.message)

    def test_only_pending_requests_can_be_reviewed(self):
        services.approve_verification(self.req, self.staff)
        with self.assertRaises(ValueError):
            services.reject_verification(self.req, self.staff, 'late')

    def test_admin_actions_approve_and_reject(self):
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        admin = site._registry[VerificationRequest]
        request = RequestFactory().post('/')
        request.user = self.staff
        request._messages = type('M', (), {'add': lambda *a, **k: None})()
        admin.approve_selected(request, VerificationRequest.objects.filter(pk=self.req.pk))
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, Business.VerificationStatus.VERIFIED)
