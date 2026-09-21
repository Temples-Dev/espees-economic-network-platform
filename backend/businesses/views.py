from django.contrib.auth import get_user_model
from django.db.models import F, FloatField, Q, Value
from django.db.models.functions import ACos, Cast, Cos, Greatest, Least, Radians, Sin
from rest_framework.exceptions import ValidationError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core import audit
from .models import Business, BusinessMembership, Category, VerificationRequest
from .permissions import IsBusinessOwnerOrAdmin, ReadOnlyOrAuthenticated
from .serializers import (
    VerificationRequestSerializer,
    BusinessDetailSerializer,
    BusinessSerializer,
    CategorySerializer,
    MembershipSerializer,
)


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.select_related('owner').prefetch_related('members')
    permission_classes = [IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset().filter(is_active=True)
        qs = BusinessSerializer.setup_eager_loading(qs)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if self.request.query_params.get('verified') in ('1', 'true'):
            qs = qs.filter(verification_status=Business.VerificationStatus.VERIFIED)
        qs = self._apply_near(qs)
        qs = self._apply_sort(qs)
        if self.request.query_params.get('mine') in ('1', 'true'):
            user = self.request.user
            if not user.is_authenticated:
                return qs.none()
            qs = qs.filter(
                members__user=user,
                members__role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
            ).distinct()
        return qs

    def _apply_near(self, qs):
        """`?near=lat,lng&radius_km=25`: businesses within the radius, closest first, with `distance_km`."""
        near = self.request.query_params.get('near')
        if not near:
            return qs
        try:
            lat_s, lng_s = near.split(',')
            lat, lng = float(lat_s), float(lng_s)
            radius = float(self.request.query_params.get('radius_km', 25))
            if not (-90 <= lat <= 90 and -180 <= lng <= 180) or radius <= 0:
                raise ValueError
        except ValueError:
            raise ValidationError({'near': 'Use near=<latitude>,<longitude> with valid coordinates.'})
        # Spherical law of cosines; clamped so rounding can never push acos out of its domain.
        b_lat = Cast(F('latitude'), FloatField())
        b_lng = Cast(F('longitude'), FloatField())
        cosine = (
            Cos(Radians(Value(lat))) * Cos(Radians(b_lat)) * Cos(Radians(b_lng) - Radians(Value(lng)))
            + Sin(Radians(Value(lat))) * Sin(Radians(b_lat))
        )
        distance = Value(6371.0) * ACos(Greatest(Value(-1.0), Least(Value(1.0), cosine)))
        return (
            qs.filter(latitude__isnull=False, longitude__isnull=False)
            .annotate(distance_km=distance)
            .filter(distance_km__lte=radius)
            .order_by('distance_km')
        )

    def _apply_sort(self, qs):
        sort = self.request.query_params.get('sort')
        if sort in ('name', '-name'):
            return qs.order_by(sort)
        if sort == 'newest':
            return qs.order_by('-created_at')
        if sort == 'rating':
            return qs.order_by(F('average_rating').desc(nulls_last=True))
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BusinessDetailSerializer
        return BusinessSerializer

    def perform_create(self, serializer):
        business = serializer.save(owner=self.request.user)
        BusinessMembership.objects.create(
            user=self.request.user, business=business, role=BusinessMembership.Role.OWNER
        )

    def destroy(self, request, *args, **kwargs):
        business = self.get_object()
        # Only the owner may delete a business.
        if business.owner != request.user:
            return Response(
                {'detail': 'Only the business owner can delete this business.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def members(self, request, pk=None):
        business = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({'email': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response({'email': ['No member with this email.']}, status=status.HTTP_404_NOT_FOUND)

        membership, created = BusinessMembership.objects.get_or_create(
            user=target, business=business, defaults={'role': BusinessMembership.Role.ADMIN}
        )
        if created:
            audit.record(request.user, 'business.member_added', target=business, request=request, member=target.email)
        serializer = MembershipSerializer(membership)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


    @action(detail=True, methods=['get', 'post'], url_path='verification')
    def verification(self, request, pk=None):
        """Apply for verification (POST) or read the latest application (GET); members only."""
        business = self.get_object()
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        is_manager = BusinessMembership.objects.filter(
            user=request.user,
            business=business,
            role__in=[BusinessMembership.Role.OWNER, BusinessMembership.Role.ADMIN],
        ).exists()
        if not is_manager:
            return Response(
                {'detail': 'Only a business owner or admin can manage verification.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == 'GET':
            latest = business.verification_requests.first()
            if latest is None:
                return Response({'detail': 'No verification request yet.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(VerificationRequestSerializer(latest, context={'request': request}).data)

        if business.verification_status == Business.VerificationStatus.VERIFIED:
            return Response({'detail': 'This business is already verified.'}, status=status.HTTP_400_BAD_REQUEST)
        if business.verification_status == Business.VerificationStatus.PENDING:
            return Response(
                {'detail': 'A verification request is already pending.'}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = VerificationRequestSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business, submitted_by=request.user)
        Business.objects.filter(pk=business.pk).update(verification_status=Business.VerificationStatus.PENDING)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]