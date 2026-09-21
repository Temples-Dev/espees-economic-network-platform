from rest_framework import serializers

from .models import User, Wallet


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'full_name', 'password']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['id', 'espees_wallet_id', 'status', 'created_at', 'updated_at']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    wallet = WalletSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'phone',
            'full_name',
            'is_verified',
            'is_staff',
            'created_at',
            'wallet',
        ]
        read_only_fields = fields

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """The only fields a member may change about themselves (email, verification and roles are not among them)."""

    full_name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['full_name', 'phone']

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Enter your name.')
        return value

    def validate_phone(self, value):
        value = value.strip()
        if value and len(''.join(ch for ch in value if ch.isdigit())) < 7:
            raise serializers.ValidationError('Enter a valid phone number.')
        if value and not all(ch.isdigit() or ch in '+ -()' for ch in value):
            raise serializers.ValidationError('Enter a valid phone number.')
        return value
