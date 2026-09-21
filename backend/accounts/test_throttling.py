from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


@override_settings(AUTH_THROTTLE_RATE='3/min')
class AuthThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user(email='ama@example.com', password='pw-strong-1')

    def tearDown(self):
        cache.clear()

    def attempt(self, name='accounts:login', data=None):
        return self.client.post(reverse(name), data or {'email': 'ama@example.com', 'password': 'wrong'}, format='json')

    def test_repeated_login_attempts_are_throttled(self):
        codes = [self.attempt().status_code for _ in range(5)]
        self.assertEqual(codes[:3], [status.HTTP_401_UNAUTHORIZED] * 3)
        self.assertEqual(codes[3:], [status.HTTP_429_TOO_MANY_REQUESTS] * 2)

    def test_throttled_response_says_when_to_retry(self):
        for _ in range(3):
            self.attempt()
        resp = self.attempt()
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Retry-After', resp.headers)

    def test_password_reset_requests_are_throttled(self):
        codes = [self.attempt('accounts:password_reset', {'email': 'ama@example.com'}).status_code for _ in range(4)]
        self.assertEqual(codes[-1], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_registration_is_throttled(self):
        codes = [
            self.attempt('accounts:register', {'email': f'u{i}@example.com', 'password': 'Sup3r-strong-pass'}).status_code
            for i in range(4)
        ]
        self.assertEqual(codes[:3], [status.HTTP_201_CREATED] * 3)
        self.assertEqual(codes[3], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_other_endpoints_are_not_throttled(self):
        for _ in range(10):
            self.assertEqual(self.client.get(reverse('businesses:business-list')).status_code, status.HTTP_200_OK)
