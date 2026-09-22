"""
URL configuration for the Espees Economic Network Platform backend.
"""
from django.conf import settings
from django.contrib import admin
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path(f'{settings.API_PREFIX}/', include('core.urls')),
    path(f'{settings.API_PREFIX}/', include('accounts.urls')),
    path(f'{settings.API_PREFIX}/', include('businesses.urls')),
    path(f'{settings.API_PREFIX}/', include('commerce.urls')),
    path(f'{settings.API_PREFIX}/', include('reviews.urls')),
    path(f'{settings.API_PREFIX}/', include('conversations.urls')),
    path(f'{settings.API_PREFIX}/', include('quotes.urls')),
    path(f'{settings.API_PREFIX}/', include('campaigns.urls')),
    path(f'{settings.API_PREFIX}/', include('notifications.urls')),
    path(f'{settings.API_PREFIX}/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
