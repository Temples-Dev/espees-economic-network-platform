from django.db import transaction
from django.utils import timezone

from core import audit
from notifications.services import notify_business_managers

from .models import Business, VerificationRequest


def _review(request, reviewer, status):
    if request.status != VerificationRequest.Status.PENDING:
        raise ValueError('Only pending verification requests can be reviewed.')
    request.status = status
    request.reviewed_by = reviewer
    request.reviewed_at = timezone.now()


@transaction.atomic
def approve_verification(request, reviewer):
    _review(request, reviewer, VerificationRequest.Status.APPROVED)
    request.save()
    Business.objects.filter(pk=request.business_id).update(verification_status=Business.VerificationStatus.VERIFIED)
    notify_business_managers(
        request.business,
        'commerce',
        'Your business is verified',
        f'{request.business.name} is now a verified business.',
        target=request.business,
    )
    audit.record(reviewer, 'business.verification_approved', target=request.business)


@transaction.atomic
def reject_verification(request, reviewer, reason):
    _review(request, reviewer, VerificationRequest.Status.REJECTED)
    request.rejection_reason = reason
    request.save()
    Business.objects.filter(pk=request.business_id).update(verification_status=Business.VerificationStatus.UNVERIFIED)
    notify_business_managers(
        request.business,
        'commerce',
        'Verification not approved',
        f'{request.business.name}: {reason}. You can correct this and apply again.',
        target=request.business,
    )
    audit.record(reviewer, 'business.verification_rejected', target=request.business, reason=reason)
