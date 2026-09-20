from django.db.models.query import QuerySet
from rest_framework import serializers

from reviews.models import Review

from .models import Business, BusinessMembership, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id']


class MembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = BusinessMembership
        fields = ['id', 'user_email', 'user_full_name', 'role', 'created_at']
        read_only_fields = fields


class BusinessSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(
        slug_field='name', queryset=Category.objects.all(), required=False, allow_null=True
    )
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'category',
            'location',
            'contact_email',
            'contact_phone',
            'verification_status',
            'is_active',
            'average_rating',
            'review_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'slug', 'verification_status', 'is_active',
            'average_rating', 'review_count', 'created_at', 'updated_at',
        ]

    def get_average_rating(self, obj):
        average = getattr(obj, 'average_rating', None)
        return round(average, 2) if average else None

    def get_review_count(self, obj):
        return getattr(obj, 'review_count', 0)

    @classmethod
    def setup_eager_loading(cls, queryset):
        from django.db.models import Avg, Count
        return queryset.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews'),
        )


class BusinessDetailSerializer(BusinessSerializer):
    owner = serializers.EmailField(source='owner.email', read_only=True)
    members = MembershipSerializer(many=True, read_only=True)

    class Meta(BusinessSerializer.Meta):
        fields = BusinessSerializer.Meta.fields + ['owner', 'members']