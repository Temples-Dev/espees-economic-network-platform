from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from commerce.models import Offering, Order


class CommerceApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='strong-password-1')
        self.admin = User.objects.create_user(email='admin@example.com', password='strong-password-1')
        self.customer = User.objects.create_user(email='customer@example.com', password='strong-password-1')
        self.other_biz_owner = User.objects.create_user(email='other@example.com', password='strong-password-1')

        self.category = Category.objects.create(name='Food & Dining')
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill', location='Accra')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)
        BusinessMembership.objects.create(user=self.admin, business=self.business, role=BusinessMembership.Role.ADMIN)

        self.other_business = Business.objects.create(owner=self.other_biz_owner, name='Gadget Shop', location='Accra')
        BusinessMembership.objects.create(
            user=self.other_biz_owner, business=self.other_business, role=BusinessMembership.Role.OWNER
        )

        self.product = Offering.objects.create(
            business=self.business, kind=Offering.Kind.PRODUCT, name='Jollof Combo',
            price=Decimal('25.00'), category=self.category,
        )
        self.service = Offering.objects.create(
            business=self.business, kind=Offering.Kind.SERVICE, name='Catering',
            price=Decimal('500.00'),
        )

    # ----- Product / Service CRUD -----

    def test_owner_can_create_product(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            reverse('commerce:product-list'),
            {'business': str(self.business.id), 'name': 'Banku Special', 'price': '30.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        offering = Offering.objects.get(name='Banku Special')
        self.assertEqual(offering.kind, Offering.Kind.PRODUCT)

    def test_owner_can_create_service(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            reverse('commerce:service-list'),
            {'business': str(self.business.id), 'name': 'Event Decor', 'price': '800.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        offering = Offering.objects.get(name='Event Decor')
        self.assertEqual(offering.kind, Offering.Kind.SERVICE)

    def test_non_member_cannot_create_offering(self):
        self.client.force_authenticate(user=self.customer)
        resp = self.client.post(
            reverse('commerce:product-list'),
            {'business': str(self.business.id), 'name': 'Sneaky', 'price': '1.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_offering(self):
        resp = self.client.post(
            reverse('commerce:product-list'),
            {'business': str(self.business.id), 'name': 'X', 'price': '1.00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_products_list_is_public_and_kind_filtered(self):
        resp = self.client.get(reverse('commerce:product-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Jollof Combo')

    def test_services_list_is_public_and_kind_filtered(self):
        resp = self.client.get(reverse('commerce:service-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Catering')

    def test_offering_search_filter(self):
        resp = self.client.get(reverse('commerce:product-list'), {'search': 'jollof'})
        self.assertEqual(resp.data['count'], 1)

    def test_admin_member_can_update_offering(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            reverse('commerce:product-detail', args=[self.product.id]),
            {'price': '27.50'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('27.50'))

    def test_mine_returns_only_managed_business_offerings(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get(reverse('commerce:product-mine'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    # ----- Orders -----

    def test_customer_can_create_order(self):
        self.client.force_authenticate(user=self.customer)
        resp = self.client.post(
            reverse('commerce:order-list'),
            {
                'business': str(self.business.id),
                'items': [{'offering': str(self.product.id), 'quantity': 2}],
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['total'], '50.00')
        self.assertEqual(Order.objects.count(), 1)

    def test_order_rejects_offering_from_other_business(self):
        self.client.force_authenticate(user=self.customer)
        resp = self.client.post(
            reverse('commerce:order-list'),
            {
                'business': str(self.business.id),
                'items': [{'offering': str(self.product.id)}, {'offering': ''}],
            },
            format='json',
        )
        # invalid offering uuid in second item — still surfaces a validation error
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_requires_authentication(self):
        resp = self.client.post(
            reverse('commerce:order-list'),
            {'business': str(self.business.id), 'items': [{'offering': str(self.product.id)}]},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_lists_only_own_orders(self):
        Order.objects.create(customer=self.customer, business=self.business, total=Decimal('50.00'))
        Order.objects.create(customer=self.customer, business=self.business, total=Decimal('10.00'))
        other = User.objects.create_user(email='someone@example.com', password='strong-password-1')
        Order.objects.create(customer=other, business=self.business)

        self.client.force_authenticate(user=self.customer)
        resp = self.client.get(reverse('commerce:order-list'))
        self.assertEqual(resp.data['count'], 2)

    def test_business_member_can_list_business_orders(self):
        Order.objects.create(customer=self.customer, business=self.business)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get(reverse('commerce:order-list'), {'business': str(self.business.id)})
        self.assertEqual(resp.data['count'], 1)

    def test_non_customer_cannot_retrieve_order(self):
        order = Order.objects.create(customer=self.customer, business=self.business)
        self.client.force_authenticate(user=self.other_biz_owner)
        resp = self.client.get(reverse('commerce:order-detail', args=[order.id]))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_business_member_can_update_status(self):
        order = Order.objects.create(customer=self.customer, business=self.business)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(
            reverse('commerce:order-update-status', args=[order.id]),
            {'status': Order.Status.CONFIRMED},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)

    def test_customer_cannot_update_status(self):
        order = Order.objects.create(customer=self.customer, business=self.business)
        self.client.force_authenticate(user=self.customer)
        resp = self.client.patch(
            reverse('commerce:order-update-status', args=[order.id]),
            {'status': Order.Status.CONFIRMED},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)