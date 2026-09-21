import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from businesses.models import Business, BusinessMembership, Category
from campaigns.models import Campaign, CampaignContribution
from commerce.models import Offering, Order, OrderItem
from conversations.models import Conversation, Message
from core import demo_data as data
from notifications.models import Notification
from reviews.models import Review


def demo_email(slug):
    return f'{slug}@{data.DEMO_DOMAIN}'


class Command(BaseCommand):
    help = 'Seed the database with demo businesses, listings, reviews and campaigns.'

    def add_arguments(self, parser):
        parser.add_argument('--member', help='Email of an existing member to give orders, messages and notifications.')
        parser.add_argument('--reset', action='store_true', help='Delete the demo data instead of creating it.')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            self.reset()
            return

        member = None
        if options['member']:
            try:
                member = User.objects.get(email__iexact=options['member'])
            except User.DoesNotExist:
                raise CommandError(f"No member with email {options['member']}.")

        random.seed(7)
        self.password_hash = make_password(data.DEMO_PASSWORD)
        categories = self.seed_categories()
        reviewers = self.seed_reviewers()
        businesses = self.seed_businesses(categories, reviewers)
        self.seed_campaigns(businesses, reviewers)
        if member:
            self.seed_member(member, businesses)

        self.stdout.write(self.style.SUCCESS(
            f'Demo data ready: {Business.objects.filter(owner__email__endswith=data.DEMO_DOMAIN).count()} businesses, '
            f'{Offering.objects.filter(business__owner__email__endswith=data.DEMO_DOMAIN).count()} listings, '
            f'{Campaign.objects.filter(creator__email__endswith=data.DEMO_DOMAIN).count()} campaigns.'
        ))
        self.stdout.write(f'Demo owner login: any <slug>@{data.DEMO_DOMAIN} / {data.DEMO_PASSWORD}')

    def reset(self):
        demo_users = User.objects.filter(email__endswith=f'@{data.DEMO_DOMAIN}')
        Order.objects.filter(business__owner__in=demo_users).delete()
        Order.objects.filter(customer__in=demo_users).delete()
        Conversation.objects.filter(business__owner__in=demo_users).delete()
        Notification.objects.filter(recipient__in=demo_users).delete()
        Campaign.objects.filter(creator__in=demo_users).delete()
        deleted = demo_users.delete()[0]
        Category.objects.filter(businesses__isnull=True, offerings__isnull=True).delete()
        self.stdout.write(self.style.WARNING(f'Removed demo data ({deleted} rows).'))

    def make_user(self, slug, full_name):
        user, created = User.objects.get_or_create(
            email=demo_email(slug), defaults={'full_name': full_name, 'is_verified': True}
        )
        if created:
            user.password = self.password_hash
            user.save(update_fields=['password'])
        return user

    def seed_categories(self):
        return {name: Category.objects.get_or_create(name=name)[0] for name in data.CATEGORIES}

    def seed_reviewers(self):
        return [self.make_user(f'reviewer-{slug}', name) for name, slug in data.REVIEWERS]

    def seed_businesses(self, categories, reviewers):
        businesses = {}
        for name, slug, category, location, status, phone, description, ratings, offerings in data.BUSINESSES:
            owner = self.make_user(slug, f'{name} Owner')
            business, _ = Business.objects.get_or_create(
                owner=owner,
                name=name,
                defaults={
                    'category': categories[category],
                    'location': location,
                    'description': description,
                    'contact_email': demo_email(slug),
                    'contact_phone': phone,
                    'verification_status': status,
                },
            )
            BusinessMembership.objects.get_or_create(
                user=owner, business=business, defaults={'role': BusinessMembership.Role.OWNER}
            )
            for kind, offering_name, price, offering_description in offerings:
                Offering.objects.get_or_create(
                    business=business,
                    name=offering_name,
                    defaults={
                        'kind': kind,
                        'price': Decimal(price),
                        'description': offering_description,
                        'category': categories[category],
                    },
                )
            for reviewer, rating in zip(reviewers, ratings):
                Review.objects.get_or_create(
                    reviewer=reviewer,
                    business=business,
                    defaults={'rating': rating, 'comment': random.choice(data.COMMENTS[rating])},
                )
            businesses[slug] = business
        return businesses

    def seed_campaigns(self, businesses, reviewers):
        for title, description, purpose, goal, percent, contributors, slug in data.CAMPAIGNS:
            business = businesses[slug]
            campaign, created = Campaign.objects.get_or_create(
                creator=business.owner,
                title=title,
                defaults={
                    'business': business,
                    'description': description,
                    'purpose': purpose,
                    'goal_espees': Decimal(goal),
                    'status': Campaign.Status.ACTIVE,
                    'end_date': timezone.now() + timedelta(days=45),
                },
            )
            if not created:
                continue
            raised = (Decimal(goal) * percent / 100).quantize(Decimal('0.01'))
            share = (raised / contributors).quantize(Decimal('0.01'))
            amounts = [share] * (contributors - 1)
            amounts.append(raised - sum(amounts))
            for i, amount in enumerate(amounts):
                CampaignContribution.objects.create(
                    campaign=campaign,
                    contributor=reviewers[i % len(reviewers)],
                    amount_espees=amount,
                    note='Proud to support this.' if i % 2 == 0 else '',
                )

    def seed_member(self, member, businesses):
        by_name = {b.name: b for b in businesses.values()}
        now = timezone.now()

        for business_name, offering_name, quantity, status, hours_ago in data.MEMBER_ORDERS:
            business = by_name[business_name]
            if Order.objects.filter(customer=member, business=business, status=status).exists():
                continue
            offering = Offering.objects.get(business=business, name=offering_name)
            order = Order.objects.create(customer=member, business=business, status=status)
            OrderItem.objects.create(
                order=order,
                offering=offering,
                quantity=quantity,
                unit_price=offering.price,
                line_total=offering.price * quantity,
            )
            order.recalculate_total()
            Order.objects.filter(pk=order.pk).update(created_at=now - timedelta(hours=hours_ago))

        for category, title, message, read, hours_ago in data.MEMBER_NOTIFICATIONS:
            if Notification.objects.filter(recipient=member, title=title, message=message).exists():
                continue
            note = Notification.objects.create(
                recipient=member, category=category, title=title, message=message,
                read_at=now if read else None,
            )
            Notification.objects.filter(pk=note.pk).update(created_at=now - timedelta(hours=hours_ago))

        for business_name, script in data.MEMBER_CONVERSATIONS:
            business = by_name[business_name]
            conversation, created = Conversation.objects.get_or_create(
                initiator=member, other_party=business.owner, business=business
            )
            if not created:
                continue
            for i, (from_business, body) in enumerate(script):
                sender = business.owner if from_business else member
                message = Message.objects.create(
                    conversation=conversation,
                    sender=sender,
                    body=body,
                    read_at=None if from_business else now,
                )
                Message.objects.filter(pk=message.pk).update(created_at=now - timedelta(hours=6 - i))
