import requests
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Exists, OuterRef
from django.conf import settings
from django.db.models.aggregates import Count, Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter,OrderingFilter
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated,AllowAny,IsAdminUser
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.mixins import CreateModelMixin ,RetrieveModelMixin,\
                                  DestroyModelMixin ,UpdateModelMixin
from rest_framework.viewsets import ModelViewSet,GenericViewSet
from rest_framework import status
from store.filters import ProductFilter
from store.pagination import DefaultPagination
from django.http import JsonResponse
#from store.utils.chapa import verify_chapa_transaction
from django.contrib.contenttypes.models import ContentType
from likes.models import LikedItem
from .permissions import IsAdminOrReadOnly,ViewCustomerHistoryPermission
from .models import (
    Product,
    Collection,
    OrderItem,
    Review,
    Cart,
    CartItem,
    Customer,
    Order,
    ProductImage,
    Payment,
    PromoBanner,
    PaymentMethodConfig,
    MembershipPlan,
)
from django.db.models import Sum, F
from .serializers import (
    ProductSerializer,
    CollectionSerializer,
    ReviewSerializer,
    CartSerializer,
    CartItemSerializer,
    AddCartItemSerializer,
    UpdateCartItemSerializer,
    CustomerSerializer,
    CustomerMeUpdateSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    UpdateOrderSerializer,

    ProductImageSerializer,
    PromoBannerSerializer,
    PaymentMethodConfigSerializer,
    MembershipPlanSerializer,
)
from django.urls import reverse


_product_content_type = None

def get_product_content_type():
    global _product_content_type
    if _product_content_type is None:
        _product_content_type = ContentType.objects.get_for_model(Product, for_concrete_model=False)
    return _product_content_type

class CollectionViewSet(ModelViewSet):
    queryset = Collection.objects.annotate(
        products_count=Count('products')
    ).all()
    serializer_class = CollectionSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        if Product.objects.filter(collection_id=kwargs['pk']).count() > 0 :
            return Response(
                {'error': 'Collection cannot be deleted because it includes products.'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        return super().destroy(request, *args, **kwargs)
    
class ProductViewSet(ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['collection_id']
    search_fields = ['title', 'description']
    ordering_fields = ['price', 'last_update']
    pagination_class = DefaultPagination
    filterset_class = ProductFilter

    @method_decorator(cache_page(5 * 60))
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        limit = request.query_params.get('limit')
        if limit and limit.isdigit():
            queryset = queryset[:int(limit)]
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user if self.request.user.is_authenticated else None
        queryset = (
            Product.objects
            .select_related("collection")
            .prefetch_related("images", "promotions")
            .annotate(
                total_likes=Count("likes", distinct=True),
                reviews_count=Count("reviews", distinct=True),
                average_rating=Avg("reviews__rating")
            )
            .order_by("title")
        )
        if user:
            queryset = queryset.annotate(
                is_liked=Exists(
                     LikedItem.objects.filter(
                        user=user,
                        object_id=OuterRef("pk"),
                        content_type=get_product_content_type(),
                    )
                )
            )
        return queryset
    
    def get_serializer_context(self):
        return {'request': self.request}

    def destroy(self, request, *args, **kwargs):
        # Prevent deleting products that are referenced by order items
        if OrderItem.objects.filter(product_id=kwargs['pk']).exists():
            return Response(
                {'error': 'product can not be deleted because it is associated with order items.'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        return super().destroy(request, *args, **kwargs)
    

class ProductImageViewSet(ModelViewSet):
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_context(self):
        return {'product_id':self.kwargs['product_pk']}
    
    
    def get_queryset(self):
        return ProductImage.objects.filter(product_id=self.kwargs['product_pk'])
    
class ReviewViewSet(ModelViewSet): 
    serializer_class = ReviewSerializer 

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        return Review.objects.filter(product_id=self.kwargs['product_pk'])
    
    def get_serializer_context(self):
        return {'product_id':self.kwargs['product_pk'], 'request': self.request}

    def perform_update(self, serializer):
        if serializer.instance.user_id != self.request.user.id and not self.request.user.is_staff:
            raise PermissionDenied("You are not allowed to edit this review.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user_id != self.request.user.id and not self.request.user.is_staff:
            raise PermissionDenied("You are not allowed to delete this review.")
        instance.delete()
    
    
class CartViewSet(CreateModelMixin,
                  RetrieveModelMixin,
                  DestroyModelMixin,
                  GenericViewSet):
    serializer_class = CartSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.db.models import Q
        qs = Cart.objects.prefetch_related("items__product").all()
        user = self.request.user
        if user.is_staff:
            return qs
        if user.is_authenticated:
            return qs.filter(Q(customer__user=user) | Q(customer__isnull=True))
        return qs.filter(customer__isnull=True)

    def perform_create(self, serializer):
        customer = None
        if self.request.user.is_authenticated:
            try:
                customer = Customer.objects.get(user_id=self.request.user.id)
            except Customer.DoesNotExist:
                # Fallback if signal hasn't finished or manual creation failed
                customer, _ = Customer.objects.get_or_create(user_id=self.request.user.id)
        
        serializer.save(customer=customer)


class CartItemViewSet(ModelViewSet):
    permission_classes = [AllowAny]
    http_method_names = ['get','post','patch','delete']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AddCartItemSerializer
        elif self.request.method == 'PATCH':
            return UpdateCartItemSerializer
        
        return CartItemSerializer
    

    def get_queryset(self):
        from django.db.models import Q
        qs = CartItem.objects.filter(cart_id=self.kwargs['cart_pk']).select_related('product')
        user = self.request.user
        if user.is_staff:
            return qs
        if user.is_authenticated:
            return qs.filter(Q(cart__customer__user=user) | Q(cart__customer__isnull=True))
        return qs.filter(cart__customer__isnull=True)
    
    def get_serializer_context(self):
        return {"cart_id": self.kwargs["cart_pk"]}
    
    
class CustomerViewSet(ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes =[IsAdminUser]
    
    @action(detail=True, permission_classes=[ViewCustomerHistoryPermission])
    def history(self, request , pk):
        return Response('ok')
    
    @action(detail=False, methods=['GET','PUT'], permission_classes=[IsAuthenticated])
    def me(self,request):
        customer = Customer.objects.get(user_id=request.user.id)
        if request.method == 'GET':
            serializer = CustomerSerializer(customer)
            return Response(serializer.data)
        elif request.method == 'PUT':
            serializer = CustomerMeUpdateSerializer(customer, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        
class OrderViewSet(ModelViewSet):
    queryset = Order.objects.prefetch_related('items__product').select_related('customer__user').all()
    serializer_class = OrderSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(customer__user=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateOrderSerializer
        elif self.request.method == 'PATCH':
            if not self.request.user.is_staff:
                return OrderSerializer
            return UpdateOrderSerializer

        return OrderSerializer


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        read_serializer = OrderSerializer(order, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "You are not allowed to update payment status."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)


class PromoBannerViewSet(ModelViewSet):
    """
    API for managing marketing promo banners (promotions) used across the site.
    """
    queryset = PromoBanner.objects.all().order_by("-created_at")
    serializer_class = PromoBannerSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def click(self, request, pk=None):
        """
        Track a click on a promo banner. Used for simple analytics.
        """
        promo = self.get_object()
        PromoBanner.objects.filter(pk=promo.pk).update(clicks=F("clicks") + 1)
        promo.refresh_from_db()
        return Response({"clicks": promo.clicks})

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def impression(self, request, pk=None):
        """
        Track an impression (view) of a promo banner.
        """
        promo = self.get_object()
        PromoBanner.objects.filter(pk=promo.pk).update(impressions=F("impressions") + 1)
        promo.refresh_from_db()
        return Response({"impressions": promo.impressions})


class PaymentMethodConfigViewSet(ModelViewSet):
    """
    API for configuring available payment methods.
    """
    queryset = PaymentMethodConfig.objects.all().order_by("id")
    serializer_class = PaymentMethodConfigSerializer
    permission_classes = [IsAdminOrReadOnly]


class MembershipPlanViewSet(ModelViewSet):
    """
    API for configuring membership plans (bronze / silver / gold).
    """
    queryset = MembershipPlan.objects.all().order_by("id")
    serializer_class = MembershipPlanSerializer
    permission_classes = [IsAdminOrReadOnly]


class AdminStatsView(APIView):
    """
    Lightweight admin stats endpoint used by the frontend admin dashboard.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        total_products = Product.objects.count()
        total_customers = Customer.objects.count()
        total_orders = Order.objects.count()
        total_sales = (
            OrderItem.objects.aggregate(
                total=Sum(F("unit_price") * F("quantity"))
            )["total"]
            or 0
        )

        return Response(
            {
                "total_sales": total_sales,
                "total_orders": total_orders,
                "total_products": total_products,
                "total_customers": total_customers,
            }
        )


class RecommendedProductsView(APIView):
    """
    Simple recommendation endpoint.
    Returns a small list of popular products based on likes or order items.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # Prefer products with most likes; fall back to arbitrary ordering.
        products = (
            Product.objects
            .select_related('collection')
            .prefetch_related('images', 'promotions')
            .annotate(total_likes=Count("likes", distinct=True))
            .order_by("-total_likes", "title")[:8]
        )
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)
from .utils.chapa import initialize_chapa_payment, verify_chapa_transaction

class PaymentViewSet(GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['POST'])
    def initiate(self, request):
        order_id = request.data.get('order_id')
        return_url = request.data.get('return_url')
        
        if not order_id:
            return Response({"error": "order_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.get(id=order_id, customer__user=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create or get existing payment record
        payment, created = Payment.objects.get_or_create(
            order=order,
            defaults={'amount': order.total}
        )
        
        # Call Chapa Utility
        res = initialize_chapa_payment(order, return_url)
        
        if res.get('status') == 'success':
            payment.transaction_id = res['data']['tx_ref']
            payment.save()
            return Response(res['data'])
        
        return Response({"error": res.get('message', 'Failed to initialize payment')}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def verify(self, request):
        tx_ref = request.data.get('tx_ref')
        if not tx_ref:
            return Response({"error": "tx_ref is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        res = verify_chapa_transaction(tx_ref)
        
        if res.get('status') == 'success':
            try:
                payment = Payment.objects.get(transaction_id=tx_ref)
                payment.mark_success()
                return Response({"status": "success", "message": "Payment verified"})
            except Payment.DoesNotExist:
                return Response({"error": "Payment record not found"}, status=status.HTTP_404_NOT_FOUND)
                
        return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)
