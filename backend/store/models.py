from django.contrib import admin
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Sum, F
from decimal import Decimal
from django.utils import timezone
from uuid import uuid4
from .validators import validate_file_size

class Promotion(models.Model):
    description = models.CharField(max_length=255)
    discount = models.FloatField()


class Collection(models.Model):
    title = models.CharField(max_length=255)
    featured_product = models.ForeignKey(
        'Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,       
        related_name='+'
    )

    
    
    def __str__(self) -> str:
        return self.title
    
    class Meta:
        ordering = ['title']

class Product(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Percent'),
        ('fixed', 'Fixed'),
    ]
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, null=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(1)])
    inventory = models.IntegerField(validators=[MinValueValidator(1)])
    last_update = models.DateTimeField(auto_now=True)
    collection = models.ForeignKey(Collection, on_delete=models.PROTECT, related_name='products')
    promotions = models.ManyToManyField(Promotion, blank=True)
    likes = GenericRelation("likes.LikedItem", related_query_name="liked_products")
    is_on_sale = models.BooleanField(default=False, db_index=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, null=True, blank=True)
    discount_value = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    discount_active = models.BooleanField(default=False, db_index=True)
    discount_label = models.CharField(max_length=50, null=True, blank=True)

    def get_active_promotion(self):
        """
        Helper to get the first available promotion. 
        Uses prefetched cache if available to avoid N+1 queries.
        """
        promos = getattr(self, "_prefetched_promotions_cache", None)
        if promos is not None:
            return promos[0] if promos else None
        return self.promotions.first()

    def get_discounted_price(self):
        """
        Unified logic: 
        1. Prefer inline product discount (percent or fixed).
        2. Fallback to promotion discount.
        3. Default to regular price.
        """
        # 1. Product-specific inline discount
        if self.discount_active and self.discount_value:
            if self.discount_type == "percent":
                return self.price - (self.price * (self.discount_value / Decimal('100')))
            elif self.discount_type == "fixed":
                return max(self.price - self.discount_value, Decimal('0.00'))

        # 2. Promotion-based discount
        promo = self.get_active_promotion()
        if promo:
            promo_disc = Decimal(str(promo.discount))
            # Handle fractional (0.2), percentage (20), or fixed (>100)
            if promo_disc < Decimal("1"):
                return self.price * (Decimal("1") - promo_disc)
            if promo_disc <= Decimal("100"):
                return self.price * (Decimal("1") - (promo_disc / Decimal("100")))
            return max(self.price - promo_disc, Decimal("0.00"))

        return self.price
    
    @property
    def is_currently_on_sale(self):
        return self.discount_active or self.promotions.exists()
    
    @property
    def likes_count(self):
        """
        Safe way to return annotated value or fallback count.
        Avoids recursion when annotated with .annotate(likes_count=...).
        """
        if "likes_count" in self.__dict__:
            return self.__dict__["likes_count"]
        return self.likes.count()

    def is_liked_by(self, user):
        if user is None or user.is_anonymous:
            return False
        return self.likes.filter(user=user).exists()

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['title']



class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(
                            upload_to='store/images',
                            validators=[validate_file_size]) 
    
        
class Customer(models.Model):
    
    MEMBERSHIP_BRONZE = 'B'
    MEMBERSHIP_SILVER = 'S'
    MEMBERSHIP_GOLD = 'G'
    
    MEMBERSHIP_CHOICES = [
        (MEMBERSHIP_BRONZE,'Bronze'),
        (MEMBERSHIP_SILVER,'Silver'),
        (MEMBERSHIP_GOLD,'Gold'),
    ]
    phone = models.CharField(max_length=255, blank=True, null=True)
    birth_date = models.DateTimeField(null=True )
    membership = models.CharField(max_length=1,choices=MEMBERSHIP_CHOICES ,default=MEMBERSHIP_BRONZE)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    def __str__(self) -> str:
        return f'{self.user.first_name} {self.user.last_name}'
    
    @admin.display(ordering='user__first_name')
    def first_name(self):
        return self.user.first_name
    
    @admin.display(ordering='user__last_name')
    def last_name(self):
        return self.user.last_name
    
    def update_membership(self):
        # Sum all completed orders using database aggregation to avoid N+1 queries
        agg = self.order_set.filter(payment_status='C').aggregate(
            total_spent=Sum(F('items__unit_price') * F('items__quantity'))
        )
        total_spent = agg['total_spent'] or Decimal('0.00')
        if total_spent > 1000:
            self.membership = self.MEMBERSHIP_GOLD
        elif total_spent > 500:
            self.membership = self.MEMBERSHIP_SILVER
        else:
            self.membership = self.MEMBERSHIP_BRONZE
        self.save()
    class Meta:
        ordering = ['user__first_name','user__last_name']
        permissions = [
            ('view_history', 'Can view history')
        ]

class Address(models.Model):
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    customer = models.ForeignKey(Customer,on_delete=models.CASCADE)


class Order(models.Model):
    
    PAYMENT_STATUS_PENDING = 'P'
    PAYMENT_STATUS_COMPLETE = 'C'
    PAYMENT_STATUS_FAILED = 'F'
    
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_STATUS_PENDING,'Pending'),
        (PAYMENT_STATUS_COMPLETE,'Complete'),
        (PAYMENT_STATUS_FAILED,'Failed'),
    ]
    placed_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=1,
                        choices=PAYMENT_STATUS_CHOICES ,default=PAYMENT_STATUS_PENDING)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    
    @property
    def total(self):
        agg = self.items.aggregate(total=Sum(F('unit_price') * F('quantity')))
        return agg['total'] or Decimal('0.00')
    class Meta:
       permissions = [
           ('cancel_order', 'Can cancel order')
       ]

    
       
class OrderItem(models.Model):
    order = models.ForeignKey(Order,on_delete=models.PROTECT, related_name='items')
    product = models.ForeignKey(Product,on_delete=models.PROTECT,related_name='orderitems')
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(max_digits=6,decimal_places=2)
    
    

class Payment(models.Model):
    # link to an Order (one payment per order). Use FK instead of OneToOne if you want multiples.
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")

    # amount you expect the payment gateway to receive (mirror of order total)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=255, null=True, blank=True)

    # small enum for status
    STATUS_PENDING = 'P'
    STATUS_SUCCESS = 'S'
    STATUS_FAILED = 'F'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'pending'),
        (STATUS_SUCCESS, 'success'),
        (STATUS_FAILED, 'failed'),
    ]
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default=STATUS_PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def mark_success(self):
        self.status = self.STATUS_SUCCESS
        self.verified_at = timezone.now()
        self.save()
        self.order.payment_status = Order.PAYMENT_STATUS_COMPLETE
        self.order.save()
        
        self.order.customer.update_membership()

    def mark_failed(self):
        self.status = self.STATUS_FAILED
        self.verified_at = timezone.now()
        self.save()
        
class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='carts', null=True, blank=True)
    
class CartItem(models.Model):
    cart = models.ForeignKey(Cart,on_delete=models.CASCADE,related_name='items')
    product = models.ForeignKey(Product, on_delete = models.CASCADE)
    quantity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)]
    )
    
    class Meta:
        unique_together = [['cart','product']]
    
    
class Review(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=5
    )
    date = models.DateField(auto_now_add=True)


class PromoBanner(models.Model):
    """
    Marketing promo banner used on the homepage and product listing pages.
    This backs the frontend Promo type.
    """
    ZONE_HERO = 'hero'
    ZONE_PROMOTIONS_GRID = 'promotions-grid'
    ZONE_CATEGORY_BANNER = 'category-banner'
    ZONE_CHECKOUT_BANNER = 'checkout-banner'

    ZONE_CHOICES = [
        (ZONE_HERO, 'Hero'),
        (ZONE_PROMOTIONS_GRID, 'Promotions Grid'),
        (ZONE_CATEGORY_BANNER, 'Category Banner'),
        (ZONE_CHECKOUT_BANNER, 'Checkout Banner'),
    ]

    ANIM_NONE = 'none'
    ANIM_FADE = 'fade'
    ANIM_SLIDE = 'slide'
    ANIM_SCALE = 'scale'
    ANIM_BOUNCE = 'bounce'

    ANIMATION_CHOICES = [
        (ANIM_NONE, 'None'),
        (ANIM_FADE, 'Fade'),
        (ANIM_SLIDE, 'Slide'),
        (ANIM_SCALE, 'Scale'),
        (ANIM_BOUNCE, 'Bounce'),
    ]

    LINK_PRODUCT = 'product'
    LINK_CATEGORY = 'category'
    LINK_EXTERNAL = 'external'

    LINK_TYPE_CHOICES = [
        (LINK_PRODUCT, 'Product'),
        (LINK_CATEGORY, 'Category'),
        (LINK_EXTERNAL, 'External'),
    ]

    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    # Store a single main image URL; serializer will expose it as a one-item images[] list
    image_url = models.URLField(blank=True)
    link = models.CharField(max_length=512, blank=True)
    link_type = models.CharField(max_length=20, choices=LINK_TYPE_CHOICES, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    animation = models.CharField(max_length=20, choices=ANIMATION_CHOICES, default=ANIM_NONE)
    zone = models.CharField(max_length=32, choices=ZONE_CHOICES, default=ZONE_HERO)
    clicks = models.PositiveIntegerField(default=0)
    impressions = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


class PaymentMethodConfig(models.Model):
    """
    Configurable payment methods for the store (Chapa, Telebirr, etc.).
    Backing store for the frontend PaymentMethod type.
    """
    id = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=False)
    coming_soon = models.BooleanField(default=False)
    eta = models.CharField(max_length=50, blank=True)
    icon = models.CharField(max_length=255, blank=True)  # could be emoji or URL

    def __str__(self) -> str:
        return self.display_name


class MembershipPlan(models.Model):
    """
    Configurable membership levels (bronze, silver, gold) with benefits.
    This is separate from the Customer.membership code but can be mapped in the frontend.
    """
    LEVEL_BRONZE = 'bronze'
    LEVEL_SILVER = 'silver'
    LEVEL_GOLD = 'gold'

    LEVEL_CHOICES = [
        (LEVEL_BRONZE, 'Bronze'),
        (LEVEL_SILVER, 'Silver'),
        (LEVEL_GOLD, 'Gold'),
    ]

    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    name = models.CharField(max_length=100)
    discount_percent = models.PositiveIntegerField(default=0)
    perks_description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name