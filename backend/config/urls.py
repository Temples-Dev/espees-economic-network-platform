"""
URL configuration for the Espees Economic Network Platform backend.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'{settings.API_PREFIX}/', include('core.urls')),
    path(f'{settings.API_PREFIX}/', include('accounts.urls')),
    path(f'{settings.API_PREFIX}/', include('businesses.urls')),
    path(f'{settings.API_PREFIX}/', include('commerce.urls')),
    path(f'{settings.API_PREFIX}/', include('reviews.urls')),
]