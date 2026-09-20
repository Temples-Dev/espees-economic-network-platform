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