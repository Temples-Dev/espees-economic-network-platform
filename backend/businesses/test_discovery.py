from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from commerce.models import Offering

ACCRA = ('5.6037', '-0.1870')
TEMA = ('5.6698', '0.0166')      # ~24 km from Accra
KUMASI = ('6.6885', '-1.6244')   # ~200 km from Accra


class NearbyTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='o@example.com', password='pw-strong-1')
        mk = lambda name, at, **kw: Business.objects.create(  # noqa: E731
            owner=self.owner, name=name, latitude=at[0], longitude=at[1], **kw
        )
        self.accra = mk('Accra Cafe', ACCRA)
        self.tema = mk('Tema Tailors', TEMA)
        self.kumasi = mk('Kumasi Kitchen', KUMASI)
        self.nowhere = Business.objects.create(owner=self.owner, name='No Coordinates')
        BusinessMembership.objects.create(user=self.owner, business=self.nowhere, role='owner')
        self.url = reverse('businesses:business-list')

    def names(self, **params):
        resp = self.client.get(self.url, params)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        return [b['name'] for b in resp.data['results']], resp.data['results']

    def test_near_returns_businesses_within_radius_closest_first(self):
        names, rows = self.names(near='5.6037,-0.1870', radius_km='50')
        self.assertEqual(names, ['Accra Cafe', 'Tema Tailors'])
        self.assertLess(rows[0]['distance_km'], 1)
        self.assertTrue(20 < rows[1]['distance_km'] < 30)

    def test_larger_radius_includes_farther_businesses(self):
        names, _ = self.names(near='5.6037,-0.1870', radius_km='300')
        self.assertEqual(names, ['Accra Cafe', 'Tema Tailors', 'Kumasi Kitchen'])

    def test_default_radius_is_25_km(self):
        names, _ = self.names(near='5.6037,-0.1870')
        self.assertEqual(names, ['Accra Cafe', 'Tema Tailors'])

    def test_no_distance_without_near(self):
        _, rows = self.names()
        self.assertNotIn('distance_km', rows[0])

    def test_bad_near_is_rejected(self):
        for bad in ('abc', '1,2,3', '95,0', '0,200'):
            resp = self.client.get(self.url, {'near': bad})
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, bad)

    def test_owner_can_set_coordinates_and_they_are_validated(self):
        self.client.force_authenticate(self.owner)
        detail = reverse('businesses:business-detail', args=[self.nowhere.id])
        ok = self.client.patch(detail, {'latitude': '6.5', 'longitude': '3.4'}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK, ok.data)
        bad = self.client.patch(detail, {'latitude': '123.0'}, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)


class BusinessFilterTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='o@example.com', password='pw-strong-1')
        self.a = Business.objects.create(owner=self.owner, name='Alpha', verification_status='verified')
        self.b = Business.objects.create(owner=self.owner, name='Bravo')
        self.url = reverse('businesses:business-list')

    def test_verified_filter(self):
        resp = self.client.get(self.url, {'verified': 'true'})
        self.assertEqual([b['name'] for b in resp.data['results']], ['Alpha'])

    def test_sort_by_name(self):
        resp = self.client.get(self.url, {'sort': 'name'})
        self.assertEqual([b['name'] for b in resp.data['results']], ['Alpha', 'Bravo'])
        resp = self.client.get(self.url, {'sort': '-name'})
        self.assertEqual([b['name'] for b in resp.data['results']], ['Bravo', 'Alpha'])

    def test_sort_by_newest(self):
        resp = self.client.get(self.url, {'sort': 'newest'})
        self.assertEqual([b['name'] for b in resp.data['results']], ['Bravo', 'Alpha'])


class OfferingFilterTests(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(email='o@example.com', password='pw-strong-1')
        biz = Business.objects.create(owner=owner, name='Shop')
        BusinessMembership.objects.create(user=owner, business=biz, role='owner')
        for name, price in [('Cheap', '5.00'), ('Mid', '50.00'), ('Dear', '500.00')]:
            Offering.objects.create(business=biz, kind='product', name=name, price=price)
        self.url = reverse('commerce:product-list')

    def names(self, **params):
        return [o['name'] for o in self.client.get(self.url, params).data['results']]

    def test_price_range(self):
        self.assertEqual(sorted(self.names(min_price='10', max_price='100')), ['Mid'])
        self.assertEqual(sorted(self.names(min_price='10')), ['Dear', 'Mid'])
        self.assertEqual(sorted(self.names(max_price='10')), ['Cheap'])

    def test_ordering_by_price(self):
        self.assertEqual(self.names(sort='price'), ['Cheap', 'Mid', 'Dear'])
        self.assertEqual(self.names(sort='-price'), ['Dear', 'Mid', 'Cheap'])

    def test_bad_price_is_ignored_not_an_error(self):
        self.assertEqual(len(self.names(min_price='abc')), 3)
