from decimal import Decimal, ROUND_HALF_UP
import re
from django.contrib.auth import get_user_model
User = get_user_model()
from django.db import transaction
from django.db.models import F
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
    price = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, help_text="The canonical product price.")
    unit_price = serializers.DecimalField(max_digits=6, decimal_places=2, source="price", required=False, help_text="Legacy field; use 'price' instead.")
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
        # Ensure at least one of price or unit_price is provided on create.
        # Also prevent ambiguous payloads where both are provided but differ.
        if not self.instance:
            if (
                "price" not in data
                and "price" not in self.initial_data
                and "unit_price" not in data
                and "unit_price" not in self.initial_data
            ):
                raise serializers.ValidationError({"price": "This field is required."})

        raw_price = self.initial_data.get("price")
        raw_unit = self.initial_data.get("unit_price")
        if raw_price not in (None, "") and raw_unit not in (None, ""):
            try:
                if Decimal(str(raw_price)) != Decimal(str(raw_unit)):
                    raise serializers.ValidationError(
                        {"unit_price": "Must match price when both are provided."}
                    )
            except Exception:
                # Leave parsing validation to DRF field-level validation.
                pass
        return data

    # -------------------- LIKE SYSTEM --------------------
    def get_is_liked(self, obj) -> bool:
        if "is_liked" in obj.__dict__:
            return obj.__dict__["is_liked"]

        request = self.context.get("request")
        user = getattr(request, "user", None)
        logger.debug("get_is_liked debug — request=%r user=%r type(user)=%s", request, user, type(user))
        if not getattr(user, "is_authenticated", False):
            return False
        return obj.likes.filter(user=user).exists()
    # -------------------- TAX CALCULATION --------------------
    def get_price_with_tax(self, obj: Product) -> Decimal:
        """Apply 10% tax to the price."""
        return (obj.price * Decimal("1.1")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # -------------------- DISCOUNT FIELDS --------------------
    def get_is_on_sale(self, obj: Product) -> bool:
        return obj.is_currently_on_sale

    def get_discount_active(self, obj: Product) -> bool:
        return obj.discount_active or obj.get_active_promotion() is not None

    def get_discount_type(self, obj: Product) -> str | None:
        if obj.discount_active and obj.discount_type:
            return obj.discount_type
        promo = obj.get_active_promotion()
        if not promo:
            return None
        return "percent" if Decimal(str(promo.discount)) < Decimal("100") else "fixed"

    def get_discount_value(self, obj: Product) -> Decimal | None:
        if obj.discount_active and obj.discount_value is not None:
            return obj.discount_value
        promo = obj.get_active_promotion()
        return getattr(promo, "discount", None) if promo else None

    def get_discounted_price(self, obj: Product) -> Decimal:
        return obj.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)

    def get_discount_label(self, obj: Product) -> str | None:
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
    image = serializers.SerializerMethodField()
    
    def get_unit_price(self, obj) -> Decimal:
        from decimal import ROUND_HALF_UP, Decimal
        return obj.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)

    def get_image(self, obj) -> str | None:
        first_image = obj.images.first()
        if first_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None
        
    class Meta:
        model = Product
        fields = ['id', 'title', 'price', 'unit_price', 'image']
        
        
class CartItemSerializer(serializers.ModelSerializer):
    product = SimpleProductSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()
    class Meta:
        model = CartItem
        fields = ['id','product','quantity','total_price']
    
    def get_total_price(self, cart_item: CartItem) -> Decimal:
        from decimal import ROUND_HALF_UP, Decimal
        unit_price = cart_item.product.get_discounted_price().quantize(Decimal("0.01"), ROUND_HALF_UP)
        return cart_item.quantity * unit_price 
        
            
class CartSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    
    def get_total_price(self, cart) -> Decimal:
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
    product_id = serializers.IntegerField()

    def validate_product_id(self, value):
        if not Product.objects.filter(pk=value).exists():
            raise serializers.ValidationError("No product with the given ID was found.")
        return value

    def validate(self, data):
        """
        Check that the requested quantity does not exceed available stock,
        accounting for any quantity already in the cart for this product.
        """
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        cart_id = self.context.get('cart_id')

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return data  # already caught by validate_product_id

        # How many units are already in the cart for this product?
        already_in_cart = 0
        if cart_id:
            try:
                existing = CartItem.objects.get(cart_id=cart_id, product_id=product_id)
                already_in_cart = existing.quantity
            except CartItem.DoesNotExist:
                pass

        total_requested = already_in_cart + quantity
        if total_requested > product.inventory:
            available = max(product.inventory - already_in_cart, 0)
            raise serializers.ValidationError(
                f"Only {product.inventory} unit(s) in stock. "
                f"You already have {already_in_cart} in your cart, "
                f"so you can add at most {available} more."
            )

        return data

    def save(self, **kwargs):
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
        fields = ['id', 'product_id', 'quantity']

        
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
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', required=False)

    class Meta:
        model = Customer
        fields = ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone', 'birth_date']

    def validate_email(self, value):
        user = self.instance.user
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_phone(self, value):
        if value in (None, ""):
            return value

        # Ethiopian format: +251XXXXXXXXX (13 chars) where X are digits.
        # Valid starting prefixes: +2519... or +2517...
        pattern = r"^\+251(9|7)\d{8}$"
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                "Enter a valid Ethiopian mobile number in the format +2519XXXXXXXX or +2517XXXXXXXX."
            )
        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save()
        return super().update(instance, validated_data)
        
class OrderItemSerializer(serializers.ModelSerializer):
    product = SimpleProductSerializer()
    total_price = serializers.SerializerMethodField()

    def get_total_price(self, order_item) -> Decimal:
        return order_item.quantity * order_item.unit_price

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'total_price']
         
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, source='total', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer',
            'placed_at',
            'payment_status',
            'payment_method',
            'items',
            'total_price',
        ]
        

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

            # ----------------------------------------------------------------
            # Stock reservation + validation using DB-conditional updates.
            #
            # This prevents race conditions where two concurrent checkouts both
            # observe the same inventory and then subtract, driving inventory
            # negative.
            # ----------------------------------------------------------------
            insufficient = []
            order_items = []

            for item in cart_items:
                updated = Product.objects.filter(
                    pk=item.product_id,
                    inventory__gte=item.quantity,
                ).update(
                    inventory=F('inventory') - item.quantity
                )

                if updated == 0:
                    insufficient.append(
                        f"'{item.product.title}': requested {item.quantity}, "
                        f"only {item.product.inventory} in stock."
                    )
                    continue

                order_items.append(
                    OrderItem(
                        order=order,
                        product=item.product,
                        unit_price=item.product.price,
                        quantity=item.quantity,
                    )
                )

            if insufficient:
                # Raising here aborts the whole transaction, rolling back any
                # successful conditional updates.
                raise serializers.ValidationError(
                    "Some items are out of stock or exceed available quantity: "
                    + " | ".join(insufficient)
                )

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

    def get_images(self, obj: PromoBanner) -> list[dict]:
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


class PaymentInitiateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    return_url = serializers.URLField(required=False, allow_blank=True)
    payment_method = serializers.CharField(required=False, allow_blank=True, default="chapa")


class PaymentVerifySerializer(serializers.Serializer):
    tx_ref = serializers.CharField()


class PaymentWebhookSerializer(serializers.Serializer):
    tx_ref = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    data = serializers.DictField(required=False)

    def validate(self, attrs):
        tx_ref = attrs.get("tx_ref")
        if not tx_ref and isinstance(attrs.get("data"), dict):
            tx_ref = attrs["data"].get("tx_ref")
        if not tx_ref:
            raise serializers.ValidationError({"tx_ref": "Transaction reference is required."})
        attrs["tx_ref"] = tx_ref
        return attrs
