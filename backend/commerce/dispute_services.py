from django.db import transaction
from django.utils import timezone

from core import audit
from notifications.services import notify, notify_business_managers

from .models import Dispute


@transaction.atomic
def resolve_dispute(dispute, staff, outcome, note):
    """Record a staff decision on an open dispute and tell both parties."""
    if dispute.status != Dispute.Status.OPEN:
        raise ValueError('Only open disputes can be resolved.')
    if not (note or '').strip():
        raise ValueError('A resolution note is required.')
    dispute.status = Dispute.Status.RESOLVED
    dispute.outcome = outcome
    dispute.resolution_note = note.strip()
    dispute.resolved_by = staff
    dispute.resolved_at = timezone.now()
    dispute.save()

    order = dispute.order
    text = f'Your dispute on order {order.pk} was resolved: {dispute.get_outcome_display().lower()}. {dispute.resolution_note}'
    notify(order.customer, 'commerce', 'Dispute resolved', text, target=dispute)
    notify_business_managers(order.business, 'commerce', 'Dispute resolved', text, target=dispute)
    audit.record(staff, 'dispute.resolved', target=dispute, outcome=outcome)
