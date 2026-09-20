from rest_framework.routers import DefaultRouter

from . import views

app_name = 'commerce'

router = DefaultRouter()
router.register('products', views.ProductViewSet, basename='product')
router.register('services', views.ServiceViewSet, basename='service')
router.register('orders', views.OrderViewSet, basename='order')

urlpatterns = router.urls