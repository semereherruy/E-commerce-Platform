# like/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from store.permissions import DenyStaffForCustomerWrites
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from store.models import Product
from .models import LikedItem
from .serializers import LikedItemSerializer

@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(name="product_pk", location=OpenApiParameter.PATH, type=int),
        ]
    ),
    create=extend_schema(
        parameters=[
            OpenApiParameter(name="product_pk", location=OpenApiParameter.PATH, type=int),
        ]
    ),
    destroy=extend_schema(
        parameters=[
            OpenApiParameter(name="product_pk", location=OpenApiParameter.PATH, type=int),
            OpenApiParameter(name="pk", location=OpenApiParameter.PATH, type=int),
        ]
    ),
)
class ProductLikeViewSet(viewsets.GenericViewSet):
    """
    Nested under /products/{product_pk}/likes/
    POST -> toggle (like/unlike) for current user on the product.
    GET  -> list likes for product (optional)
    DELETE /products/{product_pk}/likes/{pk}/ -> delete a specific like record (owner/admin)
    """
    serializer_class = LikedItemSerializer

    def get_permissions(self):
        # Allow listing to anonymous but creating/deleting requires auth.
        if self.action in ("list",):
            return [AllowAny()]
        return [IsAuthenticated(), DenyStaffForCustomerWrites()]

    def get_queryset(self):
        product_pk = self.kwargs.get("product_pk")
        ct = ContentType.objects.get_for_model(Product)
        return LikedItem.objects.filter(content_type=ct, object_id=product_pk)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Toggle like for (request.user, product).
        If like exists => delete it and return liked:false.
        If not exists => create and return liked:true.
        Response includes current likes_count.
        """
        if request.user.is_anonymous:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        product_pk = self.kwargs.get("product_pk")
        product = get_object_or_404(Product, pk=product_pk)
        ct = ContentType.objects.get_for_model(Product)

        # Try to find existing like
        existing = LikedItem.objects.filter(user=request.user, content_type=ct, object_id=product.pk)
        if existing.exists():
            # unlike (toggle off)
            existing.delete()
            likes_count = product.likes.count()  # GenericRelation
            return Response({"liked": False, "likes_count": likes_count}, status=status.HTTP_200_OK)

        # create like
        like = LikedItem.objects.create(user=request.user, content_type=ct, object_id=product.pk)
        likes_count = product.likes.count()
        return Response({"liked": True, "likes_count": likes_count, "id": like.pk}, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None, *args, **kwargs):
        # delete a like instance by pk (only owner OR staff)
        product_pk = self.kwargs.get("product_pk")
        ct = ContentType.objects.get_for_model(Product)
        like = get_object_or_404(LikedItem, pk=pk, content_type=ct, object_id=product_pk)
        if like.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        like.delete()
        product = get_object_or_404(Product, pk=product_pk)
        return Response({"likes_count": product.likes.count()}, status=status.HTTP_204_NO_CONTENT)
