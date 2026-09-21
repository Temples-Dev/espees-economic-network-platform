from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership
from commerce.models import Order
from notifications.models import Notification


class OrderLifecycleTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw-strong-1')
        self.customer = User.objects.create_user(email='cust@example.com', password='pw-strong-1')
        self.stranger = User.objects.create_user(email='x@example.com', password='pw-strong-1')
        self.business = Business.objects.create(owner=self.owner, name='Tante Grill')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)

    def order(self, st=Order.Status.PENDING):
        return Order.objects.create(customer=self.customer, business=self.business, status=st)

    def set_status(self, order, value, user):
        self.client.force_authenticate(user)
        return self.client.patch(reverse('commerce:order-update-status', args=[order.id]), {'status': value}, format='json')

    def test_business_follows_pending_confirmed_fulfilled(self):
        o = self.order()
        self.assertEqual(self.set_status(o, 'confirmed', self.owner).status_code, status.HTTP_200_OK)
        self.assertEqual(self.set_status(o, 'fulfilled', self.owner).status_code, status.HTTP_200_OK)
        o.refresh_from_db()
        self.assertEqual(o.status, 'fulfilled')

    def test_business_cannot_skip_confirmation(self):
        o = self.order()
        resp = self.set_status(o, 'fulfilled', self.owner)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        o.refresh_from_db()
        self.assertEqual(o.status, 'pending')

    def test_fulfilled_orders_are_final(self):
        o = self.order('fulfilled')
        self.assertEqual(self.set_status(o, 'cancelled', self.owner).status_code, status.HTTP_400_BAD_REQUEST)

    def test_business_can_decline_pending_and_cancel_confirmed(self):
        self.assertEqual(self.set_status(self.order(), 'cancelled', self.owner).status_code, status.HTTP_200_OK)
        self.assertEqual(self.set_status(self.order('confirmed'), 'cancelled', self.owner).status_code, status.HTTP_200_OK)

    def test_invalid_status_value_is_rejected(self):
        self.assertEqual(self.set_status(self.order(), 'teleported', self.owner).status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_cancel_their_pending_order(self):
        o = self.order()
        resp = self.set_status(o, 'cancelled', self.customer)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        o.refresh_from_db()
        self.assertEqual(o.status, 'cancelled')

    def test_customer_cannot_cancel_once_confirmed(self):
        o = self.order('confirmed')
        self.assertEqual(self.set_status(o, 'cancelled', self.customer).status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_do_anything_but_cancel(self):
        self.assertEqual(self.set_status(self.order(), 'confirmed', self.customer).status_code, status.HTTP_403_FORBIDDEN)

    def test_strangers_cannot_touch_an_order(self):
        o = self.order()
        self.assertEqual(self.set_status(o, 'cancelled', self.stranger).status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_is_notified_when_the_business_updates_the_order(self):
        o = self.order()
        self.set_status(o, 'confirmed', self.owner)
        self.assertTrue(Notification.objects.filter(recipient=self.customer, message__icontains='confirmed').exists())

    def test_business_is_notified_when_the_customer_cancels(self):
        o = self.order()
        self.set_status(o, 'cancelled', self.customer)
        self.assertTrue(Notification.objects.filter(recipient=self.owner, message__icontains='cancelled').exists())

    def test_orders_can_be_filtered_by_status(self):
        self.order('pending')
        self.order('fulfilled')
        self.client.force_authenticate(self.customer)
        resp = self.client.get(reverse('commerce:order-list'), {'status': 'fulfilled'})
        self.assertEqual([o['status'] for o in resp.data['results']], ['fulfilled'])
