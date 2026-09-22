"""Service layer for the accounts domain.

Network-facing operations (Espees API, local gateways) are isolated here so that
the rest of the application depends only on stable Python functions. This keeps
the core models and views free of any external API coupling.
"""

import logging

from .models import Wallet

logger = logging.getLogger(__name__)


def provision_espees_wallet(user_id):
    """Record that wallet provisioning is pending official Espees support.

    Doc16 §7/§33: programmatic User wallet provisioning is DEPENDENT /
    UNCONFIRMED — there is no public User API to call. Per the interim
    rules we must NOT invent an Espees wallet identity or mark the wallet
    active. This records PENDING_EXTERNAL so the UI can render a
    capability-driven "pending enablement" state instead of a fake
    ready wallet.
    """
    # TODO(espees-api): replace with a real call once Espees confirms a
    # User provisioning / wallet-linking mechanism (Doc16 §32 Q3-Q5).
    wallet = Wallet.objects.get(user_id=user_id)
    wallet.status = Wallet.Status.PENDING_EXTERNAL
    wallet.status_detail = (
        'Awaiting official Espees user provisioning / wallet-linking mechanism.'
    )
    wallet.save(update_fields=['status', 'status_detail', 'updated_at'])
    logger.info('Wallet for user %s is pending external Espees provisioning', user_id)
    return wallet