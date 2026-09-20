"""Service layer for the accounts domain.

Network-facing operations (Espees API, local gateways) are isolated here so that
the rest of the application depends only on stable Python functions. This keeps
the core models and views free of any external API coupling.
"""

import logging

from .models import Wallet

logger = logging.getLogger(__name__)


def provision_espees_wallet(user_id):
    """Provision an Espees wallet for a member via the Espees API.

    Currently a stub: returns a stubbed wallet identity without calling the
    Espees network. Wire the real Espees API integration here later; the rest of
    the platform does not need to change.
    """
    # TODO(espees-api): replace with a real call to the Espees API.
    wallet = Wallet.objects.get(user_id=user_id)
    wallet.espees_wallet_id = f'stub-espees-wallet-{user_id.hex[:12]}'
    wallet.status = Wallet.Status.ACTIVE
    wallet.save(update_fields=['espees_wallet_id', 'status', 'updated_at'])
    logger.info('Provisioned stub Espees wallet %s for user %s', wallet.espees_wallet_id, user_id)
    return wallet