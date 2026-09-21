from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from commerce.models import Offering


class SearchTests(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(email='o@example.com', password='pw-strong-1')
        self.tech = Category.objects.create(name='Technology')
        self.food = Category.objects.create(name='Food & Dining')

        def biz(name, category, location, verified=False, description=''):
            b = Business.objects.create(
                owner=owner, name=name, category=category, location=location, description=description,
                verification_status='verified' if verified else 'unverified',
            )
            BusinessMembership.objects.create(user=owner, business=b, role='owner')
            return b

        self.kofi = biz('Kofi Repairs', self.tech, 'Accra', True, 'Laptop and phone repair')
        self.kumasi_fix = biz('Kumasi Fixers', self.tech, 'Kumasi', False, 'Laptop repair experts')
        self.grill = biz('Tante Grill', self.food, 'Accra', False, 'Grilled food')
        Offering.objects.create(business=self.kofi, kind='service', name='Laptop Screen Repair', price='80.00')
        Offering.objects.create(business=self.grill, kind='product', name='Jollof Combo', price='25.00')
        self.url = reverse('core:search')

    def search(self, q, **params):
        return self.client.get(self.url, {'q': q, **params})

    def test_query_is_required(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.search('   ').status_code, status.HTTP_400_BAD_REQUEST)

    def test_finds_businesses_products_and_services_together(self):
        resp = self.search('laptop')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual({b['name'] for b in resp.data['businesses']}, {'Kofi Repairs', 'Kumasi Fixers'})
        self.assertEqual([s['name'] for s in resp.data['services']], ['Laptop Screen Repair'])
        self.assertEqual(resp.data['products'], [])

    def test_natural_language_is_reduced_to_keywords_category_and_place(self):
        resp = self.search('I need someone to do laptop repair in Accra')
        self.assertEqual(resp.data['interpreted']['location'], 'Accra')
        self.assertEqual(resp.data['interpreted']['category'], 'Technology')
        self.assertIn('laptop', resp.data['interpreted']['keywords'])
        self.assertNotIn('need', resp.data['interpreted']['keywords'])
        names = [b['name'] for b in resp.data['businesses']]
        self.assertEqual(names[0], 'Kofi Repairs')
        self.assertNotIn('Kumasi Fixers', names)

    def test_category_words_match_category_members(self):
        resp = self.search('food')
        self.assertEqual(resp.data['interpreted']['category'], 'Food & Dining')
        self.assertEqual([b['name'] for b in resp.data['businesses']], ['Tante Grill'])

    def test_verified_businesses_rank_first_among_equal_matches(self):
        resp = self.search('laptop repair')
        self.assertEqual([b['name'] for b in resp.data['businesses']][:2], ['Kofi Repairs', 'Kumasi Fixers'])

    def test_no_matches_is_an_empty_result_not_an_error(self):
        resp = self.search('spaceship')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual((resp.data['businesses'], resp.data['products'], resp.data['services']), ([], [], []))

    def test_limit_caps_each_group(self):
        resp = self.search('laptop', limit='1')
        self.assertEqual(len(resp.data['businesses']), 1)

    def test_inactive_businesses_are_hidden(self):
        Business.objects.filter(pk=self.kofi.pk).update(is_active=False)
        resp = self.search('laptop')
        self.assertEqual([b['name'] for b in resp.data['businesses']], ['Kumasi Fixers'])
