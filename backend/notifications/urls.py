from django.urls import path
from rest_framework import routers

from . import views

app_name = 'notifications'

router = routers.DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notification')

urlpatterns = router.urls + [
    path('notification-preferences/', views.NotificationPreferencesView.as_view(), name='notification-preferences'),
]