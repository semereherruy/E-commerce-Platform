from decimal import Decimal,ROUND_HALF_UP
from django.db import transaction
from rest_framework import serializers
from likes.models import LikedItem
from .signals import order_created
from .models import (
    Collection,
    Product,
    Review,
    Cart,
    CartItem,
    Customer,
    Order,
    OrderItem,
    ProductImage,
    PromoBanner,
    PaymentMethodConfig,
    MembershipPlan,
)
import logging
logger = logging.getLogger(__name__)

class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields =['id','title','products_count']
    products_count = serializers.IntegerField(read_only=True)
    
    
class ProductImageSerializer(serializers.ModelSerializer):
    
    def create(self, validated_data):
        product_id = self.context['product_id']
        return ProductImage.objects.create(product_id=product_id, **validated_data)
    class Meta:
        model = ProductImage
        fields = ['id','image'] 
    
class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    total_likes = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    # Discount-related fields
    is_on_sale = serializers.SerializerMethodField()
    discount_type = serializers.SerializerMethodField()
    discount_value = serializers.SerializerMethodField()
    discount_active = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    discount_label = serializers.SerializerMethodField()

    # Price fields
    price = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    unit_price = serializers.DecimalField(max_digits=6, decimal_places=2, source="price", required=False)
    price_with_tax = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "title", "slug", "description", "inventory", "price",
            "unit_price", "price_with_tax", "collection", "images",
            "total_likes", "is_liked",
            "average_rating", "reviews_count",
            "is_on_sale", "discount_type", "discount_value",
            "discount_active", "discounted_price", "discount_label",
        ]
        extra_kwargs = {
            "collection": {"required": False, "allow_null": True},
            "slug": {"required": False},
        }

    def validate(self, data):
        # Ensure at least one of price or unit_price is provided on create
        if not self.instance:
            if 'price' not in data and 'price' not in self.initial_data and \
               'unit_price' not in data and 'unit_price' not in self.initial_data:
                raise serializers.ValidationError({"price": "This field is required."})
        return data

    # -------------------- LIKE SYSTEM --------------------
    def get_is_liked(self, obj):
        if "is_liked" in obj.__dict__:
            return obj.__dict__["is_liked"]

        request = self.context.get("request")
        user = getattr(request, "user", None)
        logger.debug("get_is_liked debug — request=%r user=%r type(user)=%s", request, user, type(user))
        if not getattr(user, "is_authenticated", False):
            return False
        return obj.likes.filter(user=user).exists()
    # -------------------- TAX CALCULATION --------------------
    def get_price_with_tax(self, obj: Product):
        """Apply 10% tax to the price."""
        return (obj.price * Decimal("1.1")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # -------------------- DISCOUNT FIELDS --------------------
    def get_is_on_sale(self, obj: Product):
        return obj.is_currently_on_sale

    def get_discount_active(self, obj: Product):
        return obj.discount_active or obj.get_active_promotion() is not None

    def get_discount_type(self, obj: Product):
        if obj.discount_active and obj.discount_type:
            return obj.discount_type
        promo = obj.get_active_promotion()
        if not promo:
            return None
        return "percent" if Decimal(str(promo.discount)) < Decimal("100") else "fixed"

    def get_discount_value(self, obj: Product):
        if obj.discount_active and obj.discount_value is not None:
            return obj.discount_value
        promo = obj.get_active_promotion()
        return getattr(promo, "discount", None) if promo else None

    def get_discounted_price(self, obj: Product):
        return obj.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)

    def get_discount_label(self, obj: Product):
        if obj.discount_active and obj.discount_label:
            return obj.discount_label
        promo = obj.get_active_promotion()
        return getattr(promo, "description", None)
        
class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id','date','name','description', 'rating']
        read_only_fields = ['name']
        
    def create(self, validated_data):
        product_id = self.context['product_id']
        request = self.context.get('request')
        user = request.user
        display_name = user.get_full_name() or user.username
        return Review.objects.create(
            product_id=product_id,
            user=user,
            name=display_name,
            **validated_data
        )
    
    
class SimpleProductSerializer(serializers.ModelSerializer):
    unit_price = serializers.SerializerMethodField()
    
    def get_unit_price(self, obj):
        from decimal import ROUND_HALF_UP, Decimal
        return obj.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)
        
    class Meta:
        model = Product
        fields = ['id','title','price', 'unit_price']
        
        
class CartItemSerializer(serializers.ModelSerializer):
    product = SimpleProductSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    class Meta:
        model = CartItem
        fields = ['id','product','quantity','total_price']
    
    def get_total_price(self, cart_item: CartItem):
        from decimal import ROUND_HALF_UP, Decimal
        unit_price = cart_item.product.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)
        return cart_item.quantity * unit_price 
        
            
class CartSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    
    def get_total_price(self, cart):
        from decimal import ROUND_HALF_UP, Decimal
        total = sum([
            item.quantity * item.product.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)
            for item in cart.items.all()
        ])
        return total
    class Meta:
        model = Cart
        fields = ['id','items','total_price']
        
        
class AddCartItemSerializer(serializers.ModelSerializer):
    product_id=serializers.IntegerField()
    
    def validate_product_id(self, value):
        if not Product.objects.filter(pk=value).exists():
            raise serializers.ValidationError("No product with the given ID was found.")
        return value
       
    def save(self,**Kwargs):
        cart_id = self.context['cart_id']
        product_id = self.validated_data['product_id']
        quantity = self.validated_data['quantity']
        
        try:
            cart_item = CartItem.objects.get(cart_id=cart_id, product_id=product_id)
            cart_item.quantity += quantity
            cart_item.save()
            self.instance = cart_item
        except CartItem.DoesNotExist:
            self.instance = CartItem.objects.create(cart_id=cart_id, **self.validated_data)
            
        return self.instance
    class Meta:
        model = CartItem
        fields = ['id','product_id','quantity']
        
        
class UpdateCartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['quantity']
        

class CustomerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    class Meta:
        model = Customer
        fields = ['id','user_id','phone','birth_date','membership']


class CustomerMeUpdateSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'user_id', 'phone', 'birth_date']
        
class OrderItemSerializer(serializers.ModelSerializer):
    product = SimpleProductSerializer()
    total_price = serializers.SerializerMethodField()

    def get_total_price(self, order_item):
        return order_item.quantity * order_item.unit_price

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'total_price']
         
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, source='total', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'placed_at', 'payment_status', 'items', 'total_price']
        

class UpdateOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model =  Order
        fields = ['payment_status']


class CreateOrderSerializer(serializers.Serializer):
    cart_id = serializers.UUIDField()
    
    def validate_cart_id(self, cart_id):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not Cart.objects.filter(pk=cart_id).exists():
            raise serializers.ValidationError('No Card With The given Id is Found')
        if not user or not user.is_authenticated:
            raise serializers.ValidationError('Authentication is required.')
        if not Cart.objects.filter(pk=cart_id, customer__user=user).exists():
            raise serializers.ValidationError('You do not have access to this cart.')
        elif CartItem.objects.filter(cart_id=cart_id).count() == 0:
            raise serializers.ValidationError('The Cart is empty!')
        return cart_id
    
    def save(self, **kwargs):
        with transaction.atomic():
            cart_id = self.validated_data['cart_id']
            
            # Get the logged-in user from context
            request = self.context.get('request')
            if not request:
                raise serializers.ValidationError("Request is required in serializer context")
            user = request.user

            # Get customer linked to the logged-in user (created via signal)
            customer = Customer.objects.get(user=user)

            order = Order.objects.create(customer=customer)
            
            cart_items = CartItem.objects.select_related('product').filter(cart_id=cart_id)
            order_items = [
                OrderItem(
                    order=order,
                    product=item.product,
                    unit_price=item.product.price,
                    quantity=item.quantity
                ) for item in cart_items
            ]
            
            OrderItem.objects.bulk_create(order_items)
            Cart.objects.filter(pk=cart_id).delete()
            
            order_created.send_robust(sender=order.__class__, order=order)
            
            return order


class PromoBannerSerializer(serializers.ModelSerializer):
    """
    Serializer mapping PromoBanner to the frontend Promo type.
    Exposes a single image_url as images[0].image.
    """
    images = serializers.SerializerMethodField()

    class Meta:
        model = PromoBanner
        fields = [
            "id",
            "title",
            "subtitle",
            "images",
            "image_url",
            "link",
            "link_type",
            "start_date",
            "end_date",
            "active",
            "animation",
            "zone",
            "clicks",
            "impressions",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            # Frontend sends a single image_url string which we expose as images[] on read.
            "image_url": {"write_only": True, "required": False, "allow_blank": True},
            # Make all optional configuration fields lenient to avoid 400s for empty/omitted values.
            "link": {"required": False, "allow_blank": True},
            "link_type": {"required": False, "allow_blank": True},
            "start_date": {"required": False, "allow_null": True},
            "end_date": {"required": False, "allow_null": True},
            "animation": {"required": False, "allow_blank": True},
            "zone": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        """
        Provide safe defaults for optional choice fields so the serializer
        doesn't reject partial payloads from the admin UI.
        """
        if not attrs.get("link_type"):
            attrs["link_type"] = PromoBanner.LINK_CATEGORY
        if not attrs.get("zone"):
            attrs["zone"] = PromoBanner.ZONE_HERO
        if not attrs.get("animation"):
            attrs["animation"] = PromoBanner.ANIM_NONE
        return attrs

    def get_images(self, obj: PromoBanner):
        if not obj.image_url:
            return []
        return [{"id": obj.id, "image": obj.image_url}]


class PaymentMethodConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethodConfig
        fields = [
            "id",
            "name",
            "display_name",
            "description",
            "enabled",
            "coming_soon",
            "eta",
            "icon",
        ]


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = [
            "id",
            "level",
            "name",
            "discount_percent",
            "perks_description",
            "price",
            "is_active",
        ]
