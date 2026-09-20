from django.urls import reverse
from notifications.models import Notification
from rest_framework import status
from rest_framework.test import APITestCase

from .models import LoginActivity, User, Wallet


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


class LoginHardeningTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:login')
        self.user = User.objects.create_user(email='secure@example.com', password='strong-password-1')

    def test_failed_login_records_activity(self):
        resp = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'wrong'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(LoginActivity.objects.filter(email='secure@example.com', success=False).exists())

    def test_failed_attempts_lock_account(self):
        for i in range(5):
            resp = self.client.post(
                self.login_url, {'email': 'secure@example.com', 'password': 'wrong'}, format='json'
            )
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        resp = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('retry_after', resp.data)

    def test_new_device_signin_raises_security_notification(self):
        resp = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, category='security', title='New device sign-in').count(), 1
        )

    def test_known_device_does_not_re_notify(self):
        self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, category='security').count(), 1
        )

    def test_logout_blacklists_refresh_token(self):
        tokens = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        ).data
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(reverse('accounts:logout'), {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

        resp = self.client.post(reverse('accounts:token_refresh'), {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_validates_and_notifies(self):
        tokens = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json'
        ).data
        self.client.force_authenticate(user=self.user)

        wrong = self.client.post(
            reverse('accounts:change_password'),
            {'old_password': 'nope', 'new_password': 'new-strong-password-2'},
            format='json',
        )
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)

        good = self.client.post(
            reverse('accounts:change_password'),
            {'old_password': 'strong-password-1', 'new_password': 'new-strong-password-2'},
            format='json',
        )
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('new-strong-password-2'))
        self.assertTrue(
            Notification.objects.filter(recipient=self.user, category='security', title='Password changed').exists()
        )
        # Old session is revoked even though the token was never explicitly logged out.
        resp = self.client.post(reverse('accounts:token_refresh'), {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        # New password works.
        resp = self.client.post(
            self.login_url, {'email': 'secure@example.com', 'password': 'new-strong-password-2'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_sessions_listing(self):
        self.client.post(self.login_url, {'email': 'secure@example.com', 'password': 'strong-password-1'}, format='json')
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse('accounts:sessions'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['sessions']), 1)
        self.assertIn('device_key', resp.data['sessions'][0])