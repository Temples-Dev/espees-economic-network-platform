from rest_framework import routers

from . import views

app_name = 'campaigns'

router = routers.DefaultRouter()
router.register('campaigns', views.CampaignViewSet, basename='campaign')
router.register('campaign-milestones', views.CampaignMilestoneViewSet, basename='campaign-milestone')

urlpatterns = router.urls