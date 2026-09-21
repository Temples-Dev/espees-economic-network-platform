from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class MeUpdateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='ama@example.com', password='pw-strong-1', full_name='Ama')
        self.url = reverse('accounts:me')

    def test_requires_authentication(self):
        self.assertEqual(self.client.patch(self.url, {'full_name': 'X'}, format='json').status_code, 401)

    def test_updates_name_and_phone(self):
        self.client.force_authenticate(self.user)
        resp = self.client.patch(self.url, {'full_name': 'Ama Mensah', 'phone': '+233201234567'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['full_name'], 'Ama Mensah')
        self.assertEqual(resp.data['phone'], '+233201234567')
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, 'Ama Mensah')

    def test_can_clear_the_phone_number(self):
        User.objects.filter(pk=self.user.pk).update(phone='+233201234567')
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        resp = self.client.patch(self.url, {'phone': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['phone'], '')

    def test_cannot_change_email_verification_or_privileges(self):
        self.client.force_authenticate(self.user)
        self.client.patch(
            self.url, {'email': 'x@example.com', 'is_verified': True, 'is_staff': True}, format='json'
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'ama@example.com')
        self.assertFalse(self.user.is_verified)
        self.assertFalse(self.user.is_staff)

    def test_rejects_an_implausible_phone_number(self):
        self.client.force_authenticate(self.user)
        resp = self.client.patch(self.url, {'phone': 'abc'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', resp.data)

    def test_rejects_a_blank_name(self):
        self.client.force_authenticate(self.user)
        resp = self.client.patch(self.url, {'full_name': '   '}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('full_name', resp.data)
