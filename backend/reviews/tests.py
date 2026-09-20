from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from commerce.models import Offering
from reviews.models import Review


class ReviewApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='strong-password-1')
        self.owner.full_name = 'Kwame B'
        self.owner.save()
        self.reviewer = User.objects.create_user(email='reviewer@example.com', password='strong-password-1')
        self.other = User.objects.create_user(email='other@example.com', password='strong-password-1')

        self.business = Business.objects.create(owner=self.owner, name='Tante Grill', location='Accra')
        BusinessMembership.objects.create(user=self.owner, business=self.business, role=BusinessMembership.Role.OWNER)
        self.product = Offering.objects.create(
            business=self.business, kind=Offering.Kind.PRODUCT, name='Jollof Combo', price='25.00'
        )

    def test_review_business(self):
        self.client.force_authenticate(user=self.reviewer)
        resp = self.client.post(
            reverse('reviews:review-list'),
            {'business': str(self.business.id), 'rating': 5, 'comment': 'Great food!'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        review = Review.objects.first()
        self.assertEqual(review.reviewer, self.reviewer)
        self.assertEqual(review.rating, 5)

    def test_review_offering(self):
        self.client.force_authenticate(user=self.reviewer)
        resp = self.client.post(
            reverse('reviews:review-list'),
            {'offering': str(self.product.id), 'rating': 4},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_review_requires_target(self):
        self.client.force_authenticate(user=self.reviewer)
        resp = self.client.post(reverse('reviews:review-list'), {'rating': 3}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_requires_auth(self):
        resp = self.client.post(
            reverse('reviews:review-list'),
            {'business': str(self.business.id), 'rating': 5},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rating_range_validated(self):
        self.client.force_authenticate(user=self.reviewer)
        resp = self.client.post(
            reverse('reviews:review-list'),
            {'business': str(self.business.id), 'rating': 9},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_review_prevented(self):
        self.client.force_authenticate(user=self.reviewer)
        url = reverse('reviews:review-list')
        payload = {'business': str(self.business.id), 'rating': 4}
        self.client.post(url, payload, format='json')
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviewer_can_update_review(self):
        review = Review.objects.create(reviewer=self.reviewer, business=self.business, rating=4)
        self.client.force_authenticate(user=self.reviewer)
        resp = self.client.patch(
            reverse('reviews:review-detail', args=[review.id]), {'rating': 2}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.rating, 2)

    def test_only_reviewer_can_update(self):
        review = Review.objects.create(reviewer=self.reviewer, business=self.business, rating=4)
        self.client.force_authenticate(user=self.other)
        resp = self.client.patch(
            reverse('reviews:review-detail', args=[review.id]), {'rating': 1}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_reviews_list_is_public_and_filterable(self):
        Review.objects.create(reviewer=self.reviewer, business=self.business, rating=5)
        Review.objects.create(reviewer=self.other, business=self.business, rating=3)
        resp = self.client.get(reverse('reviews:review-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)

        filtered = self.client.get(reverse('reviews:review-list'), {'reviewer': str(self.reviewer.id)})
        self.assertEqual(filtered.data['count'], 1)

    def test_business_serializer_exposes_average_rating(self):
        Review.objects.create(reviewer=self.reviewer, business=self.business, rating=5)
        Review.objects.create(reviewer=self.other, business=self.business, rating=3)
        resp = self.client.get(reverse('businesses:business-detail', args=[self.business.id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['average_rating'], 4.0)
        self.assertEqual(resp.data['review_count'], 2)

    def test_offering_serializer_exposes_average_rating(self):
        Review.objects.create(reviewer=self.reviewer, offering=self.product, rating=4)
        resp = self.client.get(reverse('commerce:product-detail', args=[self.product.id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['average_rating'], 4.0)
        self.assertEqual(resp.data['review_count'], 1)