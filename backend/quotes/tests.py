from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from quotes.models import Quote, SupplierRequest


class QuoteApiTests(APITestCase):
    def setUp(self):
        self.requester = User.objects.create_user(email='requester@example.com', password='strong-password-1')
        self.requester_business = Business.objects.create(owner=self.requester, name='Imports GH', location='Accra')
        BusinessMembership.objects.create(
            user=self.requester, business=self.requester_business, role=BusinessMembership.Role.OWNER
        )

        self.supplier = User.objects.create_user(email='supplier@example.com', password='strong-password-1')
        self.supplier_business = Business.objects.create(owner=self.supplier, name='Big Tractor Parts', location='Kumasi')
        BusinessMembership.objects.create(
            user=self.supplier, business=self.supplier_business, role=BusinessMembership.Role.OWNER
        )

        self.outsider = User.objects.create_user(email='outsider@example.com', password='strong-password-1')
        self.category = Category.objects.create(name='Machinery')

    def create_request(self, **overrides):
        payload = {
            'requesting_business': str(self.requester_business.id),
            'category': str(self.category.id),
            'title': 'Need 10 spare tractor parts',
            'description': 'OEM or compatible.',
            'quantity': 10,
            'budget_espees': '5000.00',
        }
        payload.update(overrides)
        return self.client.post(
            reverse('quotes:supplier-request-list'), payload, format='json'
        )

    def test_requests_list_is_public(self):
        self.client.force_authenticate(user=self.requester)
        self.create_request()
        resp = self.client.get(reverse('quotes:supplier-request-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_only_manager_can_create_request(self):
        resp = self.client.post(reverse('quotes:supplier-request-list'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.outsider)
        resp = self.create_request()
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.requester)
        resp = self.create_request()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_get_open_requests_by_status(self):
        self.client.force_authenticate(user=self.requester)
        self.create_request()
        resp = self.client.get(reverse('quotes:supplier-request-list'), {'status': 'open'})
        self.assertEqual(resp.data['count'], 1)
        resp = self.client.get(reverse('quotes:supplier-request-list'), {'status': 'closed'})
        self.assertEqual(resp.data['count'], 0)

    def test_requester_can_close_request(self):
        self.client.force_authenticate(user=self.requester)
        resp = self.create_request()
        request_id = resp.data['id']
        url = reverse('quotes:supplier-request-detail', args=[request_id])
        closed = self.client.patch(url, {'status': 'closed'}, format='json')
        self.assertEqual(closed.status_code, status.HTTP_200_OK)
        self.assertEqual(closed.data['status'], 'closed')

    def test_only_requester_can_close(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        url = reverse('quotes:supplier-request-detail', args=[request_id])
        self.client.force_authenticate(user=self.requester)  # requester closes
        self.client.patch(url, {'status': 'closed'}, format='json')
        self.client.force_authenticate(user=self.supplier)
        resp = self.client.patch(url, {'status': 'open'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_supplier_quotes_on_open_request(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        url = reverse('quotes:quote-list')
        self.client.force_authenticate(user=self.supplier)
        resp = self.client.post(
            url,
            {
                'request': request_id,
                'supplier_business': str(self.supplier_business.id),
                'amount_espees': '4800.00',
                'delivery_days': 14,
                'message': 'Available in 2 weeks.',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['amount_espees'], '4800.00')

    def test_requester_cannot_quote_own_request(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        resp = self.client.post(
            reverse('quotes:quote-list'),
            {
                'request': request_id,
                'supplier_business': str(self.requester_business.id),
                'amount_espees': '100.00',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_quoting_on_closed_request(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        self.client.patch(reverse('quotes:supplier-request-detail', args=[request_id]), {'status': 'closed'}, format='json')
        self.client.force_authenticate(user=self.supplier)
        resp = self.client.post(
            reverse('quotes:quote-list'),
            {
                'request': request_id,
                'supplier_business': str(self.supplier_business.id),
                'amount_espees': '100.00',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_quote_rejected(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        url = reverse('quotes:quote-list')
        payload = {
            'request': request_id,
            'supplier_business': str(self.supplier_business.id),
            'amount_espees': '4800.00',
        }
        self.client.force_authenticate(user=self.supplier)
        self.client.post(url, payload, format='json')
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_flow_closes_request_and_declines_others(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']

        self.client.force_authenticate(user=self.supplier)
        quote_id = self.client.post(
            reverse('quotes:quote-list'),
            {
                'request': request_id,
                'supplier_business': str(self.supplier_business.id),
                'amount_espees': '4800.00',
            },
            format='json',
        ).data['id']

        self.client.force_authenticate(user=self.requester)
        resp = self.client.post(reverse('quotes:quote-accept', args=[quote_id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'accepted')

        request_data = self.client.get(reverse('quotes:supplier-request-detail', args=[request_id])).data
        self.assertEqual(request_data['status'], 'closed')
        self.assertEqual(request_data['accepted_quote']['id'], quote_id)
        self.assertEqual(str(request_data['accepted_quote']['amount_espees']), '4800.00')

    def test_accept_rejects_declined_quote(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        self.client.force_authenticate(user=self.supplier)
        quote = Quote.objects.create(
            request=SupplierRequest.objects.get(pk=request_id),
            supplier_business=self.supplier_business,
            amount_espees=Decimal('1.00'),
            status=Quote.Status.DECLINED,
        )
        self.client.force_authenticate(user=self.requester)
        resp = self.client.post(reverse('quotes:quote-accept', args=[quote.id]), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_quote_filters_by_request(self):
        self.client.force_authenticate(user=self.requester)
        request_id = self.create_request().data['id']
        self.client.force_authenticate(user=self.supplier)
        self.client.post(
            reverse('quotes:quote-list'),
            {
                'request': request_id,
                'supplier_business': str(self.supplier_business.id),
                'amount_espees': '4800.00',
            },
            format='json',
        )
        resp = self.client.get(reverse('quotes:quote-list'), {'request': request_id})
        self.assertEqual(resp.data['count'], 1)