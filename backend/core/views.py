from django.shortcuts import render

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


class LogoutSerializer(serializers.Serializer):
    """
    Accepts a SimpleJWT refresh token and blacklists it.

    Frontend commonly sends this as `refresh` (SimpleJWT standard), but we
    also accept `refresh_token` for flexibility.
    """

    refresh = serializers.CharField(required=False, allow_blank=False)
    refresh_token = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        token = attrs.get("refresh") or attrs.get("refresh_token")
        if not token:
            raise serializers.ValidationError(
                {"refresh": "This field is required."},
            )
        attrs["refresh"] = token
        return attrs


class JwtLogoutView(GenericAPIView):
    """
    POST /api/v1/auth/logout/

    Blacklists the provided refresh token so it cannot be reused.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            # Avoid leaking details; blacklist failures typically indicate misconfiguration.
            return Response(
                {"detail": "Unable to logout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )
