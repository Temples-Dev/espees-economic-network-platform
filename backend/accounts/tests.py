from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User, Wallet


class AuthFlowTests(APITestCase):
    def test_registration_creates_user_with_wallet(self):
        url = reverse('accounts:register')
        resp = self.client.post(
            url,
            {
                'email': 'member@example.com',
                'password': 'strong-password-1',
                'full_name': 'Ada Lomo',
                'phone': '+233551234567',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        user = User.objects.get(email='member@example.com')
        self.assertEqual(user.full_name, 'Ada Lomo')
        self.assertTrue(user.wallet.espees_wallet_id.startswith('stub-espees-wallet-'))
        self.assertEqual(user.wallet.status, Wallet.Status.ACTIVE)
        self.assertIn('wallet', resp.data)
        self.assertEqual(resp.data['wallet']['status'], Wallet.Status.ACTIVE)

    def test_registration_requires_unique_email(self):
        url = reverse('accounts:register')
        payload = {'email': 'a@b.com', 'password': 'strong-password-1'}
        self.client.post(url, payload, format='json')
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_rejects_short_password(self):
        resp = self.client.post(
            reverse('accounts:register'),
            {'email': 'a@b.com', 'password': 'short'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        User.objects.create_user(email='login@example.com', password='strong-password-1')
        resp = self.client.post(
            reverse('accounts:login'),
            {'email': 'login@example.com', 'password': 'strong-password-1'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_me_requires_authentication(self):
        resp = self.client.get(reverse('accounts:me'))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        user = User.objects.create_user(email='me@example.com', password='strong-password-1')
        self.client.force_authenticate(user=user)
        resp = self.client.get(reverse('accounts:me'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'me@example.com')