from django.test import override_settings
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
        # Doc16 §7/§33: no public User API exists, so provisioning stays
        # PENDING_EXTERNAL — never a faked ACTIVE wallet.
        self.assertEqual(user.wallet.espees_wallet_id, '')
        self.assertEqual(user.wallet.status, Wallet.Status.PENDING_EXTERNAL)
        self.assertIn('wallet', resp.data)
        self.assertEqual(resp.data['wallet']['status'], Wallet.Status.PENDING_EXTERNAL)

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


class RefreshRotationTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:login')
        self.refresh_url = reverse('accounts:token_refresh')
        self.user = User.objects.create_user(email='rotate@example.com', password='strong-password-1')

    def _login(self):
        return self.client.post(
            self.login_url, {'email': 'rotate@example.com', 'password': 'strong-password-1'}, format='json'
        ).data

    def test_refresh_rotates_pair(self):
        tokens = self._login()
        resp = self.client.post(self.refresh_url, {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertNotEqual(resp.data['refresh'], tokens['refresh'])
        # The fresh token works for a further rotation.
        again = self.client.post(self.refresh_url, {'refresh': resp.data['refresh']}, format='json')
        self.assertEqual(again.status_code, status.HTTP_200_OK)

    def test_reused_token_revokes_family_and_notifies(self):
        first = self._login()
        second = self._login()
        rotated = self.client.post(self.refresh_url, {'refresh': first['refresh']}, format='json')
        self.assertEqual(rotated.status_code, status.HTTP_200_OK)

        replay = self.client.post(self.refresh_url, {'refresh': first['refresh']}, format='json')
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('revoked', replay.data['detail'])
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.user, category='security', title='Suspicious sign-in activity'
            ).exists()
        )
        # The whole family is revoked: the other live session is dead too.
        dead = self.client.post(self.refresh_url, {'refresh': second['refresh']}, format='json')
        self.assertEqual(dead.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logged_out_token_is_plain_401(self):
        tokens = self._login()
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse('accounts:logout'), {'refresh': tokens['refresh']}, format='json')
        resp = self.client.post(self.refresh_url, {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('revoked', resp.data['detail'])
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.user, category='security', title='Suspicious sign-in activity'
            ).exists()
        )

    def test_malformed_refresh_is_401(self):
        resp = self.client.post(self.refresh_url, {'refresh': 'not-a-token'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TwoFactorTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:login')
        self.login_2fa_url = reverse('accounts:login_2fa')
        self.user = User.objects.create_user(email='totp@example.com', password='strong-password-1')

    def _current_code(self):
        import pyotp

        self.user.refresh_from_db()
        return pyotp.totp.TOTP(self.user.totp_secret).now()

    def _enable_2fa(self):
        self.client.force_authenticate(user=self.user)
        enroll = self.client.post(reverse('accounts:two_factor_enroll'), {}, format='json')
        self.assertEqual(enroll.status_code, status.HTTP_200_OK)
        self.assertIn('provisioning_uri', enroll.data)
        self.user.refresh_from_db()
        confirm = self.client.post(
            reverse('accounts:two_factor_confirm'), {'code': self._current_code()}, format='json'
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.totp_enabled)

    def test_enroll_requires_authentication(self):
        resp = self.client.post(reverse('accounts:two_factor_enroll'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirm_rejects_wrong_code(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse('accounts:two_factor_enroll'), {}, format='json')
        resp = self.client.post(
            reverse('accounts:two_factor_confirm'), {'code': '000000'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.totp_enabled)

    def test_login_issues_challenge_then_tokens(self):
        self._enable_2fa()
        first = self.client.post(
            self.login_url, {'email': 'totp@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(first.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(first.data['two_factor_required'])
        self.assertNotIn('access', first.data)

        bad = self.client.post(
            self.login_2fa_url, {'email': 'totp@example.com', 'code': '000000'}, format='json'
        )
        self.assertEqual(bad.status_code, status.HTTP_401_UNAUTHORIZED)

        good = self.client.post(
            self.login_2fa_url, {'email': 'totp@example.com', 'code': self._current_code()}, format='json'
        )
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.assertIn('access', good.data)
        self.assertIn('refresh', good.data)
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, category='security').count(), 1
        )

    def test_login_2fa_rejects_unknown_email(self):
        resp = self.client.post(
            self.login_2fa_url, {'email': 'nobody@example.com', 'code': '123456'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_2fa_rejects_when_not_enabled(self):
        resp = self.client.post(
            self.login_2fa_url, {'email': 'totp@example.com', 'code': '123456'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_restores_direct_login(self):
        self._enable_2fa()
        self.client.force_authenticate(user=self.user)
        wrong = self.client.post(
            reverse('accounts:two_factor_disable'), {'password': 'nope'}, format='json'
        )
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(
            reverse('accounts:two_factor_disable'), {'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        direct = self.client.post(
            self.login_url, {'email': 'totp@example.com', 'password': 'strong-password-1'}, format='json'
        )
        self.assertEqual(direct.status_code, status.HTTP_200_OK)
        self.assertIn('access', direct.data)

class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='reset@example.com', password='strong-password-1')

    def _request_reset(self, email='reset@example.com'):
        return self.client.post(
            reverse('accounts:password_reset'), {'email': email}, format='json'
        )

    def _link_parts(self, body):
        import re

        match = re.search(r'uid=([^\s&]+)&token=([^\s]+)', body)
        self.assertIsNotNone(match)
        assert match is not None
        return match.group(1), match.group(2)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_reset_sends_email_with_link(self):
        from django.core import mail

        resp = self._request_reset()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['reset@example.com'])
        uid, token = self._link_parts(mail.outbox[0].body)
        self.assertTrue(uid)
        self.assertTrue(token)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_reset_unknown_email_succeeds_silently(self):
        from django.core import mail

        resp = self._request_reset(email='nobody@example.com')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_confirm_resets_password_and_revokes_sessions(self):
        from django.core import mail

        tokens = self.client.post(
            reverse('accounts:login'),
            {'email': 'reset@example.com', 'password': 'strong-password-1'},
            format='json',
        ).data
        self._request_reset()
        uid, token = self._link_parts(mail.outbox[0].body)

        resp = self.client.post(
            reverse('accounts:password_reset_confirm'),
            {'uid': uid, 'token': token, 'new_password': 'new-strong-password-2'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(recipient=self.user, category='security', title='Password reset').exists()
        )
        # Old session is revoked.
        dead = self.client.post(reverse('accounts:token_refresh'), {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(dead.status_code, status.HTTP_401_UNAUTHORIZED)
        # New password works.
        login = self.client.post(
            reverse('accounts:login'),
            {'email': 'reset@example.com', 'password': 'new-strong-password-2'},
            format='json',
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_confirm_rejects_bad_token(self):
        resp = self.client.post(
            reverse('accounts:password_reset_confirm'),
            {'uid': 'Mg', 'token': 'bad-token', 'new_password': 'new-strong-password-2'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_confirm_rejects_weak_password(self):
        from django.core import mail

        self._request_reset()
        uid, token = self._link_parts(mail.outbox[0].body)
        resp = self.client.post(
            reverse('accounts:password_reset_confirm'),
            {'uid': uid, 'token': token, 'new_password': 'short'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)