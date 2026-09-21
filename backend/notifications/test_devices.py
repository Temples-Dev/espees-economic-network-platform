from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from notifications.models import DeviceToken


class DeviceTokenTests(APITestCase):
    def setUp(self):
        self.ama = User.objects.create_user(email='ama@example.com', password='pw-strong-1')
        self.kofi = User.objects.create_user(email='kofi@example.com', password='pw-strong-1')
        self.url = reverse('notifications:devices')

    def register(self, user, token='ExponentPushToken[abc]', platform='android'):
        self.client.force_authenticate(user)
        return self.client.post(self.url, {'token': token, 'platform': platform}, format='json')

    def test_requires_authentication(self):
        self.assertEqual(self.client.post(self.url, {}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registers_a_device(self):
        resp = self.register(self.ama)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(DeviceToken.objects.filter(user=self.ama, token='ExponentPushToken[abc]').exists())

    def test_registering_the_same_token_again_is_idempotent(self):
        self.register(self.ama)
        resp = self.register(self.ama)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(DeviceToken.objects.count(), 1)

    def test_a_token_moves_to_whoever_signs_in_on_the_device(self):
        self.register(self.ama)
        self.register(self.kofi)
        self.assertEqual(DeviceToken.objects.get().user, self.kofi)

    def test_validates_token_and_platform(self):
        self.client.force_authenticate(self.ama)
        self.assertEqual(self.client.post(self.url, {'platform': 'ios'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'token': 'x', 'platform': 'palm'}, format='json').status_code, 400)

    def test_unregister_removes_only_your_token(self):
        self.register(self.ama)
        self.client.force_authenticate(self.kofi)
        gone = self.client.delete(self.url, {'token': 'ExponentPushToken[abc]'}, format='json')
        self.assertEqual(gone.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(DeviceToken.objects.count(), 1)  # not Kofi's, so untouched
        self.client.force_authenticate(self.ama)
        self.client.delete(self.url, {'token': 'ExponentPushToken[abc]'}, format='json')
        self.assertEqual(DeviceToken.objects.count(), 0)
