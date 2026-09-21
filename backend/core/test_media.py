import io
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from commerce.models import Offering

MEDIA = tempfile.mkdtemp()


def png(name='pic.png', size=(20, 20)):
    buf = io.BytesIO()
    Image.new('RGB', size, (24, 55, 156)).save(buf, 'PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


@override_settings(MEDIA_ROOT=MEDIA)
class MediaUploadTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.other = User.objects.create_user(email='other@example.com', password='pw-strong-1')
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)
        self.url = reverse('businesses:business-detail', args=[self.business.id])

    def test_owner_uploads_logo_and_cover_and_gets_absolute_urls(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.patch(self.url, {'logo': png(), 'cover_image': png('c.png')}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertTrue(resp.data['logo'].startswith('http://testserver/media/business-logos/'))
        self.assertTrue(resp.data['cover_image'].startswith('http://testserver/media/business-covers/'))

    def test_images_are_null_until_uploaded(self):
        resp = self.client.get(self.url)
        self.assertIsNone(resp.data['logo'])
        self.assertIsNone(resp.data['cover_image'])

    def test_non_member_cannot_upload(self):
        self.client.force_authenticate(self.other)
        resp = self.client.patch(self.url, {'logo': png()}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejects_a_file_that_is_not_an_image(self):
        self.client.force_authenticate(self.owner)
        bad = SimpleUploadedFile('x.png', b'not really a png', content_type='image/png')
        resp = self.client.patch(self.url, {'logo': bad}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('logo', resp.data)

    @override_settings(MAX_IMAGE_UPLOAD_BYTES=100)
    def test_rejects_oversized_images(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.patch(self.url, {'logo': png(size=(200, 200))}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('logo', resp.data)

    def test_offering_image_on_create_and_in_listing(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            reverse('commerce:product-list'),
            {'business': str(self.business.id), 'name': 'Jollof', 'price': '25.00', 'image': png()},
            format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(resp.data['image'].startswith('http://testserver/media/offerings/'))
        listing = self.client.get(reverse('commerce:product-list'))
        self.assertTrue(listing.data['results'][0]['image'].startswith('http://testserver/media/offerings/'))

    def test_offering_without_image_has_null_image(self):
        Offering.objects.create(business=self.business, kind='product', name='Plain', price='1.00')
        listing = self.client.get(reverse('commerce:product-list'))
        self.assertIsNone(listing.data['results'][0]['image'])
