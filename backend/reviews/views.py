from rest_framework import permissions, viewsets

from .models import Review
from .permissions import IsReviewerOrReadOnly
from .serializers import ReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('reviewer', 'business', 'offering')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsReviewerOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        business = self.request.query_params.get('business')
        if business:
            qs = qs.filter(business_id=business)
        offering = self.request.query_params.get('offering')
        if offering:
            qs = qs.filter(offering_id=offering)
        reviewer = self.request.query_params.get('reviewer')
        if reviewer:
            qs = qs.filter(reviewer_id=reviewer)
        return qs