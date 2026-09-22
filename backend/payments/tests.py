from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, Wallet
from payments import adapters
from payments.models import Payment, ReconciliationRecord
from payments.services import get_wallet_capabilities, normalize_external_status


class FakeMerchantAdapter(adapters.MerchantAdapter):
    def __init__(self, product_resp=None, confirm_resp=None, fail_create=False):
        self.product_resp = product_resp or {'payment_ref': 'ref-123', 'statusCode': 200}
        self.confirm_resp = confirm_resp
        self.fail_create = fail_create
        self.create_calls = 0
        self.last_create_kwargs = None

    def create_merchant_product(self, **kwargs):
        self.create_calls += 1
        self.last_create_kwargs = kwargs
        if self.fail_create:
            raise RuntimeError('network down')
        return self.product_resp

    def confirm_merchant_payment(self, **kwargs):
        return self.confirm_resp or {}


class PaymentServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='pay@example.com', password='strong-password-1')

    def test_status_mapping(self):
        self.assertEqual(normalize_external_status('APPROVED'), Payment.Status.COMPLETED)
        self.assertEqual(normalize_external_status('DECLINE'), Payment.Status.FAILED)
        self.assertEqual(normalize_external_status('PENDING'), Payment.Status.PENDING)
        self.assertEqual(normalize_external_status('NOT FOUND'), Payment.Status.UNKNOWN)
        self.assertEqual(normalize_external_status('weird'), Payment.Status.UNKNOWN)

    def test_create_is_idempotent(self):
        from payments.services import create_merchant_payment

        adapter = FakeMerchantAdapter()
        p1, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-1', adapter=adapter,
        )
        p2, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-1', adapter=adapter,
        )
        self.assertEqual(p1.id, p2.id)
        self.assertEqual(adapter.create_calls, 1)
        self.assertEqual(p1.status, Payment.Status.PENDING)
        self.assertEqual(p1.espees_payment_ref, 'ref-123')

    def test_create_without_configuration_stays_initiated(self):
        from payments.services import create_merchant_payment

        class Unconfigured(adapters.MerchantAdapter):
            def create_merchant_product(self, **kwargs):
                raise adapters.IntegrationNotConfigured('nope')

        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='10.00',
            idempotency_key='idem-unconfigured', adapter=Unconfigured(),
        )
        self.assertEqual(payment.status, Payment.Status.INITIATED)
        self.assertEqual(payment.espees_payment_ref, '')
        recon = ReconciliationRecord.objects.get(payment=payment)
        self.assertEqual(recon.reconciliation_status, ReconciliationRecord.ReconStatus.MISSING_EXTERNAL)

    def test_confirm_approved_completes(self):
        from payments.services import create_merchant_payment, confirm_merchant_payment

        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-confirm', adapter=FakeMerchantAdapter(),
        )
        payment = confirm_merchant_payment(
            payment,
            adapter=FakeMerchantAdapter(confirm_resp={
                'transaction_status': 'APPROVED',
                'customer_username': 'usertest01',
                'status_details': 'Successfully Done',
                'transaction_date': '18-01-2023 5:50:23',
                'price': 25.00,
                'user_data': {
                    'eenp_payment_id': str(payment.id),
                    'eenp_correlation_id': str(payment.correlation_id),
                },
            }),
        )
        self.assertEqual(payment.status, Payment.Status.COMPLETED)
        self.assertEqual(payment.external_status, 'APPROVED')
        self.assertEqual(payment.customer_username, 'usertest01')
        self.assertEqual(payment.status_details, 'Successfully Done')
        self.assertEqual(payment.transaction_date_raw, '18-01-2023 5:50:23')
        self.assertIsNotNone(payment.confirmed_at)

    def test_confirm_not_found_requires_reconciliation(self):
        from payments.services import create_merchant_payment, confirm_merchant_payment

        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-unknown', adapter=FakeMerchantAdapter(),
        )
        payment = confirm_merchant_payment(
            payment, adapter=FakeMerchantAdapter(confirm_resp={'transaction_status': 'NOT FOUND'}),
        )
        self.assertEqual(payment.status, Payment.Status.REQUIRES_RECONCILIATION)
        self.assertEqual(payment.external_status, 'NOT FOUND')

    def test_create_injects_join_keys_and_default_return_urls(self):
        from payments.services import create_merchant_payment

        adapter = FakeMerchantAdapter()
        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-join', adapter=adapter,
        )
        self.assertEqual(payment.user_data['eenp_payment_id'], str(payment.id))
        self.assertEqual(payment.user_data['eenp_correlation_id'], str(payment.correlation_id))
        self.assertEqual(adapter.last_create_kwargs['user_data'], payment.user_data)
        self.assertIn(str(payment.id), payment.success_url)
        self.assertIn(str(payment.id), payment.fail_url)
        self.assertIn('/return/', payment.success_url)

    def test_confirm_echo_mismatch_requires_reconciliation(self):
        from payments.services import create_merchant_payment, confirm_merchant_payment

        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-echo', adapter=FakeMerchantAdapter(),
        )
        payment = confirm_merchant_payment(
            payment,
            adapter=FakeMerchantAdapter(confirm_resp={
                'transaction_status': 'APPROVED',
                'price': 25.00,
                'user_data': {'eenp_payment_id': 'some-other-id'},
            }),
        )
        self.assertEqual(payment.status, Payment.Status.REQUIRES_RECONCILIATION)
        recon = ReconciliationRecord.objects.filter(payment=payment).latest('created_at')
        self.assertEqual(recon.reconciliation_status, ReconciliationRecord.ReconStatus.MISMATCHED)

    def test_confirm_amount_mismatch_requires_reconciliation(self):
        from payments.services import create_merchant_payment, confirm_merchant_payment

        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='25.00',
            idempotency_key='idem-amount', adapter=FakeMerchantAdapter(),
        )
        payment = confirm_merchant_payment(
            payment,
            adapter=FakeMerchantAdapter(confirm_resp={
                'transaction_status': 'APPROVED',
                'price': 99.99,
                'user_data': {'eenp_payment_id': str(payment.id)},
            }),
        )
        self.assertEqual(payment.status, Payment.Status.REQUIRES_RECONCILIATION)
        self.assertIn('amount', payment.status_detail)

    def test_dependent_surfaces_raise(self):
        with self.assertRaises(adapters.ExternalDependencyPending):
            adapters.get_user_balance()
        with self.assertRaises(adapters.ExternalDependencyPending):
            adapters.transfer_user_to_user()
        with self.assertRaises(adapters.ExternalDependencyPending):
            adapters.withdraw_to_local_rails()
        with self.assertRaises(adapters.ExternalDependencyPending):
            adapters.GatewayPort().initiate()

    def test_capabilities_default_closed(self):
        caps = get_wallet_capabilities()
        self.assertFalse(caps['BALANCE_AVAILABLE'])
        self.assertFalse(caps['FUNDING_AVAILABLE'])
        self.assertFalse(caps['WITHDRAWAL_AVAILABLE'])

    @override_settings(ESPEES_API_KEY='k', ESPEES_MERCHANT_WALLET='w')
    def test_payment_available_when_configured(self):
        self.assertTrue(get_wallet_capabilities()['PAYMENT_AVAILABLE'])

    def test_wallet_endpoint_reports_pending_and_capabilities(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse('payments:wallet'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('wallet', resp.data)
        self.assertIn('capabilities', resp.data)
        self.assertFalse(resp.data['capabilities']['WITHDRAWAL_AVAILABLE'])

    def test_registration_leaves_wallet_pending_external(self):
        self.client.post(
            reverse('accounts:register'),
            {'email': 'newdoc16@example.com', 'password': 'strong-password-1'},
            format='json',
        )
        wallet = Wallet.objects.get(user__email='newdoc16@example.com')
        self.assertEqual(wallet.status, Wallet.Status.PENDING_EXTERNAL)
        self.assertEqual(wallet.espees_wallet_id, '')


class WalletLinkTests(APITestCase):
    ADDRESS = '0xd15c259d11dfe0bb39383fd3270d74f6d124a13b'

    def setUp(self):
        self.user = User.objects.create_user(email='linker@example.com', password='strong-password-1')
        self.staff = User.objects.create_user(
            email='staff@example.com', password='strong-password-1', is_staff=True
        )

    def test_link_claims_address_as_requires_action(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            reverse('payments:wallet_link'), {'espees_wallet_address': self.ADDRESS}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.status, Wallet.Status.REQUIRES_ACTION)
        self.assertEqual(wallet.espees_wallet_address, self.ADDRESS)

    def test_link_rejects_bad_address(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            reverse('payments:wallet_link'), {'espees_wallet_address': 'not-an-address'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_link_rejects_address_verified_elsewhere(self):
        other = User.objects.create_user(email='other@example.com', password='strong-password-1')
        Wallet.objects.create(user=other, espees_wallet_address=self.ADDRESS,
                              status=Wallet.Status.ASSOCIATED)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            reverse('payments:wallet_link'), {'espees_wallet_address': self.ADDRESS}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(
            reverse('payments:wallet_link'), {'espees_wallet_address': self.ADDRESS}, format='json'
        )
        resp = self.client.post(
            reverse('payments:wallet_verify'), {'user_id': str(self.user.id)}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_verify_associates(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(
            reverse('payments:wallet_link'), {'espees_wallet_address': self.ADDRESS}, format='json'
        )
        self.client.force_authenticate(user=self.staff)
        resp = self.client.post(
            reverse('payments:wallet_verify'), {'user_id': str(self.user.id)}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.status, Wallet.Status.ASSOCIATED)
        self.assertIsNotNone(wallet.provisioned_at)

    def test_verify_without_claim_is_rejected(self):
        self.client.force_authenticate(user=self.staff)
        resp = self.client.post(
            reverse('payments:wallet_verify'), {'user_id': str(self.user.id)}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class PaymentReturnTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='return@example.com', password='strong-password-1')

    def test_return_confirms_and_redirects(self):
        from payments.services import create_merchant_payment

        adapter = FakeMerchantAdapter()
        payment, _ = create_merchant_payment(
            user=self.user, narration='Meal', amount_espees='5.00',
            idempotency_key='idem-return', adapter=adapter,
        )
        # No Espees ref while unconfigured in this path (fake returns ref-123,
        # so stub the ref away to exercise the no-ref branch deterministically).
        payment.espees_payment_ref = ''
        payment.save(update_fields=['espees_payment_ref'])
        resp = self.client.get(reverse('payments:payment_return', kwargs={'id': payment.id}))
        self.assertEqual(resp.status_code, 302)
        self.assertIn('/payments/return', resp.url)
        self.assertIn(f'status={Payment.Status.REQUIRES_RECONCILIATION}', resp.url)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REQUIRES_RECONCILIATION)
