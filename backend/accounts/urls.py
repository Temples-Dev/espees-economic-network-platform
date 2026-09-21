from django.urls import path

from . import views

app_name = 'accounts'

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', views.RotatingRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/sessions/', views.SessionsView.as_view(), name='sessions'),
    path('me/', views.MeView.as_view(), name='me'),
]