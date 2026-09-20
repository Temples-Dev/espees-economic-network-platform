from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.full_name', read_only=True)
    reviewer_email = serializers.EmailField(source='reviewer.email', read_only=True)
    target_name = serializers.SerializerMethodField()
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Review
        fields = [
            'id',
            'reviewer',
            'reviewer_name',
            'reviewer_email',
            'business',
            'offering',
            'target_name',
            'rating',
            'comment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewer_name', 'reviewer_email', 'target_name', 'created_at', 'updated_at']

    def get_target_name(self, obj):
        if obj.business:
            return obj.business.name
        if obj.offering:
            return obj.offering.name
        return None

    def validate(self, attrs):
        business = attrs.get('business')
        offering = attrs.get('offering')

        if self.instance is None:
            # Only on create: exactly one target is required.
            if not business and not offering:
                raise serializers.ValidationError('A review must target a business or an offering.')
            if business and offering:
                raise serializers.ValidationError('A review must target exactly one of business or offering.')
            # A reviewer may review a given target only once.
            targets = Review.objects.filter(reviewer=self.context['request'].user)
            if business:
                duplicate = targets.filter(business=business).exists()
            else:
                duplicate = targets.filter(offering=offering).exists()
            if duplicate:
                raise serializers.ValidationError('You have already reviewed this target.')
        elif business and offering:
            raise serializers.ValidationError('A review must target exactly one of business or offering.')
        return attrs

    def create(self, validated_data):
        validated_data['reviewer'] = self.context['request'].user
        return super().create(validated_data)