from rest_framework import routers

from . import views

app_name = 'quotes'

router = routers.DefaultRouter()
router.register('supplier-requests', views.SupplierRequestViewSet, basename='supplier-request')
router.register('quotes', views.QuoteViewSet, basename='quote')

urlpatterns = router.urls