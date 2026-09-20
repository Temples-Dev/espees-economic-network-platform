from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category


class BusinessApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='strong-password-1')
        self.admin = User.objects.create_user(email='admin@example.com', password='strong-password-1')
        self.other = User.objects.create_user(email='other@example.com', password='strong-password-1')
        self.category = Category.objects.create(name='Food & Dining')
        self.business = Business.objects.create(
            owner=self.owner, name='Tante Grill', description='Ghanaian grilled food',
            category=self.category, location='Accra', contact_email='hello@tantegrill.com',
        )
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)

        self.client.force_authenticate(user=self.owner)

    def test_create_business_sets_owner_and_membership(self):
        resp = self.client.post(
            reverse('businesses:business-list'),
            {'name': 'Kofi Repairs', 'description': 'Laptop repair', 'category': 'Food & Dining'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        business = Business.objects.get(name='Kofi Repairs')
        self.assertEqual(business.owner, self.owner)
        self.assertTrue(business.members.filter(user=self.owner, role=BusinessMembership.Role.OWNER).exists())

    def test_create_business_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            reverse('businesses:business-list'), {'name': 'No Auth Shop'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_is_public(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(reverse('businesses:business-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_retrieve_returns_members(self):
        resp = self.client.get(reverse('businesses:business-detail', args=[self.business.id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['owner'], 'owner@example.com')
        self.assertEqual(len(resp.data['members']), 1)

    def test_owner_can_update(self):
        resp = self.client.patch(
            reverse('businesses:business-detail', args=[self.business.id]),
            {'location': 'Kumasi'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.business.refresh_from_db()
        self.assertEqual(self.business.location, 'Kumasi')

    def test_non_member_cannot_update(self):
        self.client.force_authenticate(user=self.other)
        resp = self.client.patch(
            reverse('businesses:business-detail', args=[self.business.id]),
            {'location': 'Hacked'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_member_can_update(self):
        BusinessMembership.objects.create(user=self.admin, business=self.business, role=BusinessMembership.Role.ADMIN)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            reverse('businesses:business-detail', args=[self.business.id]),
            {'location': 'Tema'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_only_owner_can_delete(self):
        BusinessMembership.objects.create(user=self.admin, business=self.business, role=BusinessMembership.Role.ADMIN)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(reverse('businesses:business-detail', args=[self.business.id]))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.delete(reverse('businesses:business-detail', args=[self.business.id]))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_search_filter(self):
        Business.objects.create(owner=self.admin, name='Laptop Doctor', description='Computer clinic')
        resp = self.client.get(reverse('businesses:business-list'), {'search': 'computer'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Laptop Doctor')

    def test_category_filter(self):
        other_category = Category.objects.create(name='Tech')
        Business.objects.create(owner=self.admin, name='Gadget Shop', category=other_category)
        resp = self.client.get(reverse('businesses:business-list'), {'category': 'tech'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Gadget Shop')

    def test_owner_can_add_admin_member(self):
        url = reverse('businesses:business-members', args=[self.business.id])
        resp = self.client.post(url, {'email': 'admin@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        membership = BusinessMembership.objects.get(user=self.admin, business=self.business)
        self.assertEqual(membership.role, BusinessMembership.Role.ADMIN)

    def test_non_member_cannot_add_admin(self):
        self.client.force_authenticate(user=self.other)
        url = reverse('businesses:business-members', args=[self.business.id])
        resp = self.client.post(url, {'email': 'admin@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_slug_is_generated_and_unique(self):
        business = Business.objects.create(owner=self.owner, name='Same Name Shop')
        duplicate = Business.objects.create(owner=self.admin, name='Same Name Shop')
        self.assertNotEqual(business.slug, duplicate.slug)
        self.assertTrue(business.slug)


class CategoryApiTests(APITestCase):
    def test_categories_are_public(self):
        Category.objects.create(name='Restaurants')
        resp = self.client.get(reverse('businesses:category-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_category_creation_requires_staff(self):
        user = User.objects.create_user(email='member@example.com', password='strong-password-1')
        self.client.force_authenticate(user=user)
        resp = self.client.post(reverse('businesses:category-list'), {'name': 'New Cat'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)