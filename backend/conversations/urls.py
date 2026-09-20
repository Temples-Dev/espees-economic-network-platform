from rest_framework import routers

from . import views

app_name = 'conversations'

router = routers.DefaultRouter()
router.register('conversations', views.ConversationViewSet, basename='conversation')

urlpatterns = router.urls