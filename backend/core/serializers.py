from djoser.serializers import UserSerializer as BaseUserSerializer, \
    UserCreateSerializer as BaseUserCreateSerializer
from rest_framework import serializers
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError


class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        fields = ['id', 'username', 'password', 'email',
                  'first_name', 'last_name']
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
            'password': {'write_only': True, 'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if '@' not in value:
            raise serializers.ValidationError('Enter a valid email address.')
        _local, domain = value.rsplit('@', 1)
        if not domain or '.' not in domain:
            raise serializers.ValidationError('Enter a valid email address.')
        labels = domain.split('.')
        if len(labels) < 2:
            raise serializers.ValidationError('Enter a valid email address.')
        tld = labels[-1]
        if len(tld) < 2 or not tld.isalpha():
            raise serializers.ValidationError('Enter a valid email address.')
        sld = labels[-2]
        if sld.isdigit():
            raise serializers.ValidationError(
                'That email domain is not accepted. Use a valid provider address.'
            )
        if self.Meta.model.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                'A user with this email address already exists.'
            )
        return value

    def validate_username(self, value):
        if self.Meta.model.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get('first_name'):
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        if not attrs.get('last_name'):
            raise serializers.ValidationError({'last_name': 'Last name is required.'})
        return attrs


class UserSerializer(BaseUserSerializer):
    role = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = ['is_staff', 'is_superuser']

    def get_role(self, obj) -> str:
        # Backward-compatible default expected by the frontend is "admin" or "user".
        # If the user is not staff, but is assigned to one of the supported role
        # groups, we return that role (useful for future RBAC).
        if obj.is_staff:
            return "admin"

        group_names = set(obj.groups.values_list("name", flat=True))
        for role in ("manager", "support", "nutritionist", "analytics_admin"):
            if role in group_names:
                return role
        return "user"
