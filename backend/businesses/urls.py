from rest_framework.routers import DefaultRouter

from . import views

app_name = 'businesses'

router = DefaultRouter()
router.register('businesses', views.BusinessViewSet, basename='business')
router.register('categories', views.CategoryViewSet, basename='category')

urlpatterns = router.urls