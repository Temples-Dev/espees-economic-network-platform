import re
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class EmailVerificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ama@example.com', password='pw-strong-1')
        self.request_url = reverse('accounts:verify_email_request')
        self.confirm_url = reverse('accounts:verify_email_confirm')

    def token_from_outbox(self):
        body = mail.outbox[-1].body
        return re.search(r'token=([^\s&]+)', body).group(1)

    def test_request_requires_authentication(self):
        self.assertEqual(self.client.post(self.request_url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_request_emails_a_link_with_a_token(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(self.request_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['ama@example.com'])
        self.assertIn('verify-email?token=', mail.outbox[0].body)

    def test_confirming_the_token_verifies_the_account(self):
        self.client.force_authenticate(self.user)
        self.client.post(self.request_url)
        self.client.force_authenticate(None)
        resp = self.client.post(self.confirm_url, {'token': self.token_from_outbox()}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_me_reflects_verification(self):
        self.client.force_authenticate(self.user)
        self.client.post(self.request_url)
        self.client.post(self.confirm_url, {'token': self.token_from_outbox()}, format='json')
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        self.assertTrue(self.client.get(reverse('accounts:me')).data['is_verified'])

    def test_garbage_token_is_rejected(self):
        resp = self.client.post(self.confirm_url, {'token': 'nonsense'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)

    def test_missing_token_is_rejected(self):
        self.assertEqual(self.client.post(self.confirm_url, {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_token_is_rejected(self):
        self.client.force_authenticate(self.user)
        self.client.post(self.request_url)
        token = self.token_from_outbox()
        from accounts import verification

        with mock.patch.object(verification, 'MAX_AGE', timedelta(seconds=-1).total_seconds()):
            resp = self.client.post(self.confirm_url, {'token': token}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_stops_working_if_the_email_changed(self):
        self.client.force_authenticate(self.user)
        self.client.post(self.request_url)
        token = self.token_from_outbox()
        User.objects.filter(pk=self.user.pk).update(email='new@example.com')
        resp = self.client.post(self.confirm_url, {'token': token}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_verified_users_are_not_emailed_again(self):
        User.objects.filter(pk=self.user.pk).update(is_verified=True)
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        resp = self.client.post(self.request_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_registration_sends_a_verification_email(self):
        resp = self.client.post(
            reverse('accounts:register'),
            {'email': 'new@example.com', 'password': 'Sup3r-strong-pass'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual([m.to for m in mail.outbox], [['new@example.com']])
        self.assertIn('verify-email?token=', mail.outbox[0].body)
