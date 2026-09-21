from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from campaigns.models import Campaign, CampaignContribution
from commerce.models import Offering, Order
from conversations.models import Conversation, Message
from notifications.models import Notification
from reviews.models import Review


def seed(*args):
    out = StringIO()
    call_command('seed_demo', *args, stdout=out)
    return out.getvalue()


class SeedDemoTests(TestCase):
    def test_creates_a_browsable_marketplace(self):
        seed()
        self.assertEqual(Category.objects.count(), 8)
        self.assertEqual(Business.objects.count(), 14)
        self.assertGreaterEqual(Offering.objects.filter(kind=Offering.Kind.PRODUCT).count(), 10)
        self.assertGreaterEqual(Offering.objects.filter(kind=Offering.Kind.SERVICE).count(), 10)
        self.assertEqual(Campaign.objects.filter(status=Campaign.Status.ACTIVE).count(), 6)

    def test_every_business_has_a_category_owner_and_location(self):
        seed()
        for business in Business.objects.all():
            self.assertIsNotNone(business.category)
            self.assertTrue(business.location)
            self.assertTrue(business.contact_email)
            self.assertTrue(
                BusinessMembership.objects.filter(
                    business=business, user=business.owner, role=BusinessMembership.Role.OWNER
                ).exists()
            )

    def test_verification_statuses_are_mixed(self):
        seed()
        statuses = set(Business.objects.values_list('verification_status', flat=True))
        self.assertEqual(statuses, {'verified', 'pending', 'unverified'})

    def test_ratings_vary_and_some_businesses_are_new(self):
        seed()
        reviewed = Business.objects.filter(reviews__isnull=False).distinct().count()
        self.assertGreaterEqual(reviewed, 10)
        self.assertLess(reviewed, 14)
        ratings = set(Review.objects.values_list('rating', flat=True))
        self.assertTrue({3, 4, 5} <= ratings)

    def test_campaigns_show_a_spread_of_progress(self):
        seed()
        self.assertGreater(CampaignContribution.objects.count(), 20)
        percentages = []
        for campaign in Campaign.objects.all():
            raised = sum(c.amount_espees for c in campaign.contributions.all())
            percentages.append(float(raised / campaign.goal_espees))
        self.assertLess(min(percentages), 0.2)
        self.assertGreater(max(percentages), 0.8)
        self.assertLessEqual(max(percentages), 1.0)

    def test_running_twice_creates_no_duplicates(self):
        seed()
        counts = (
            User.objects.count(), Business.objects.count(), Offering.objects.count(),
            Review.objects.count(), Campaign.objects.count(), CampaignContribution.objects.count(),
        )
        seed()
        self.assertEqual(
            counts,
            (
                User.objects.count(), Business.objects.count(), Offering.objects.count(),
                Review.objects.count(), Campaign.objects.count(), CampaignContribution.objects.count(),
            ),
        )

    def test_member_option_fills_their_home(self):
        member = User.objects.create_user(email='jude@example.com', password='x-strong-pass-1', full_name='Jude')
        seed('--member', 'jude@example.com')

        self.assertEqual(
            set(Order.objects.filter(customer=member).values_list('status', flat=True)),
            {'pending', 'confirmed', 'fulfilled'},
        )
        for order in Order.objects.filter(customer=member):
            self.assertGreater(order.total, 0)
        self.assertGreaterEqual(Notification.objects.filter(recipient=member).count(), 4)
        self.assertTrue(Notification.objects.filter(recipient=member, read_at__isnull=True).exists())
        conversations = Conversation.objects.filter(initiator=member)
        self.assertGreaterEqual(conversations.count(), 2)
        self.assertTrue(
            Message.objects.filter(conversation__in=conversations, read_at__isnull=True)
            .exclude(sender=member)
            .exists()
        )

    def test_member_data_is_not_duplicated_on_a_second_run(self):
        member = User.objects.create_user(email='jude@example.com', password='x-strong-pass-1')
        seed('--member', 'jude@example.com')
        first = (
            Order.objects.filter(customer=member).count(),
            Notification.objects.filter(recipient=member).count(),
            Conversation.objects.filter(initiator=member).count(),
        )
        seed('--member', 'jude@example.com')
        second = (
            Order.objects.filter(customer=member).count(),
            Notification.objects.filter(recipient=member).count(),
            Conversation.objects.filter(initiator=member).count(),
        )
        self.assertEqual(first, second)

    def test_unknown_member_is_an_error(self):
        with self.assertRaises(CommandError):
            seed('--member', 'nobody@example.com')

    def test_reset_removes_demo_data_but_keeps_real_data(self):
        real_owner = User.objects.create_user(email='real@example.com', password='x-strong-pass-1')
        Business.objects.create(owner=real_owner, name='Real Shop')
        seed()
        seed('--reset')

        self.assertEqual(Business.objects.filter(name='Real Shop').count(), 1)
        self.assertEqual(Business.objects.count(), 1)
        self.assertEqual(Campaign.objects.count(), 0)
        self.assertTrue(User.objects.filter(email='real@example.com').exists())
        self.assertFalse(User.objects.filter(email__endswith='@demo.eenp.test').exists())
