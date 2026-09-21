from django.urls import path

from . import views

app_name = 'accounts'

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', views.RotatingRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/login/2fa/', views.TwoFactorLoginView.as_view(), name='login_2fa'),
    path('auth/2fa/enroll/', views.TwoFactorEnrollView.as_view(), name='two_factor_enroll'),
    path('auth/2fa/confirm/', views.TwoFactorConfirmView.as_view(), name='two_factor_confirm'),
    path('auth/2fa/disable/', views.TwoFactorDisableView.as_view(), name='two_factor_disable'),
    path('auth/password-reset/', views.PasswordResetView.as_view(), name='password_reset'),
    path(
        'auth/password-reset/confirm/',
        views.PasswordResetConfirmView.as_view(),
        name='password_reset_confirm',
    ),
    path('auth/verify-email/request/', views.VerifyEmailRequestView.as_view(), name='verify_email_request'),
    path('auth/verify-email/confirm/', views.VerifyEmailConfirmView.as_view(), name='verify_email_confirm'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/sessions/', views.SessionsView.as_view(), name='sessions'),
    path('me/', views.MeView.as_view(), name='me'),
]