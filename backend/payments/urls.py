from django.urls import path

from . import views

app_name = 'payments'

urlpatterns = [
    path('wallet/', views.WalletView.as_view(), name='wallet'),
    path('wallet/capabilities/', views.WalletCapabilitiesView.as_view(), name='wallet_capabilities'),
    path('wallet/link/', views.WalletLinkView.as_view(), name='wallet_link'),
    path('wallet/verify/', views.WalletVerifyView.as_view(), name='wallet_verify'),
    path('payments/', views.PaymentListView.as_view(), name='payment_list'),
    path('payments/merchant/', views.MerchantPaymentCreateView.as_view(), name='merchant_payment'),
    path('payments/<uuid:id>/', views.PaymentDetailView.as_view(), name='payment_detail'),
    path('payments/<uuid:id>/confirm/', views.PaymentConfirmView.as_view(), name='payment_confirm'),
    path('payments/<uuid:id>/return/', views.PaymentReturnView.as_view(), name='payment_return'),
]
