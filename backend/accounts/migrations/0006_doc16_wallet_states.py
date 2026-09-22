"""Convert pre-Doc16 stub wallet states to PENDING_EXTERNAL (Doc16 §7, §9)."""

from django.db import migrations


def forwards(apps, schema_editor):
    Wallet = apps.get_model('accounts', 'Wallet')
    Wallet.objects.filter(status='pending').update(
        status='pending_external',
        status_detail='Awaiting official Espees user provisioning / wallet-linking mechanism.',
    )
    for wallet in Wallet.objects.filter(status='active'):
        detail = (
            'Pre-Doc16 stub identity; not authoritative. '
            'Awaiting official Espees provisioning / linking.'
        )
        Wallet.objects.filter(pk=wallet.pk).update(
            status='pending_external', status_detail=detail
        )


def backwards(apps, schema_editor):
    Wallet = apps.get_model('accounts', 'Wallet')
    Wallet.objects.filter(status='pending_external').update(status='pending', status_detail='')


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0005_wallet_espees_wallet_address_and_more'),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
