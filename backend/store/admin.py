from django.contrib import admin, messages
#from django.contrib.contenttypes.admin import GenericTabularInline
from django.contrib.contenttypes.admin import GenericTabularInline
from django.db.models import Count, Exists, OuterRef
from django.contrib.contenttypes.models import ContentType
from likes.models import LikedItem
from django.db import models
from django.db.models.aggregates import Count
from django.urls import reverse
from django.utils.html import format_html,urlencode
from .models import Collection,Product,Customer,Order,OrderItem,Address,ProductImage


class InventoryFilter(admin.SimpleListFilter):
    title = 'inventory'
    parameter_name = 'inventory'
    
    
    def lookups(self, request, model_admin):
          return [
            ('<10','Low')
       ]
    
    
    def queryset(self, request, queryset):
        if self.value() == '<10':
            return queryset.filter(inventory__lt=10)
        return queryset

      
      
@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'products_count']
    search_fields = ['title']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            products_count=Count('products')  # annotation name matches list_display
        )

    @admin.display(ordering='products_count')
    def products_count(self, collection):
        url = (
            reverse('admin:store_product_changelist')
            + '?'
            + urlencode({'collection__id': str(collection.id)})
        )
        return format_html('<a href="{}">{}</a>', url, collection.products_count)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    readonly_fields = ['thumbnail']
    extra = 0
    
    def thumbnail(self, instance):
        if instance.image.name != '':
            return format_html('<img src="{}" class="thumbnail"/>', instance.image.url)
        return ''


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'price', 'inventory_status', 'collection_title',
        'is_on_sale', 'discount_active', 'discount_label', 'discount_type',
        'discount_value', 'discounted_price_display', 'inventory',
        'total_likes_display', 'is_liked_display'
    )

    list_filter = ('is_on_sale', 'discount_active', 'discount_type', 'collection')
    search_fields = ('title', 'description', 'discount_label')
    readonly_fields = ('discounted_price_display',)
    list_editable = ['price']
    list_per_page = 10
    list_select_related = ['collection']
    inlines = [ProductImageInline]

    fieldsets = (
        (None, {'fields': ('title', 'slug', 'description', 'collection', 'promotions')}),
        ('Pricing & Inventory', {'fields': ('price', 'inventory')}),
        ('Discount / Sale (admin)', {
            'classes': ('collapse',),
            'fields': ('is_on_sale', 'discount_active', 'discount_type', 'discount_value', 'discount_label', 'discounted_price_display')
        }),
    )

    actions = ['activate_discount', 'deactivate_discount', 'mark_on_sale', 'mark_not_on_sale', 'clear_inventory']

    # --- Optimized queryset ---
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related("collection").prefetch_related("promotions")

        # Pre-annotate total likes
        qs = qs.annotate(total_likes=Count("likes", distinct=True))

        # Use ContentType for Exists annotation
        product_ct = ContentType.objects.get_for_model(Product)
        qs = qs.annotate(
            is_liked=Exists(
                LikedItem.objects.filter(
                    object_id=OuterRef("pk"),
                    content_type=product_ct
                )
            )
        )
        return qs

    # --- Display helpers ---
    def collection_title(self, obj):
        return obj.collection.title

    @admin.display(ordering='inventory')
    def inventory_status(self, obj):
        return 'Low' if obj.inventory < 10 else 'OK'

    @admin.display(description='Discounted Price')
    def discounted_price_display(self, obj):
        return obj.get_discounted_price()

    @admin.display(description='Total Likes')
    def total_likes_display(self, obj):
        return getattr(obj, 'total_likes', 0)

    @admin.display(boolean=True, description='Liked?')
    def is_liked_display(self, obj):
        return getattr(obj, 'is_liked', False)

    # --- Actions ---
    @admin.action(description='clear inventory')
    def clear_inventory(self, request, queryset):
        updated_count = queryset.update(inventory=0)
        self.message_user(request, f'{updated_count} products were updated.', messages.WARNING)

    def activate_discount(self, request, queryset):
        updated = queryset.update(discount_active=True)
        self.message_user(request, f'{updated} product(s) discount activated.')

    def deactivate_discount(self, request, queryset):
        updated = queryset.update(discount_active=False)
        self.message_user(request, f'{updated} product(s) discount deactivated.')

    def mark_on_sale(self, request, queryset):
        updated = queryset.update(is_on_sale=True)
        self.message_user(request, f'{updated} product(s) marked on sale.')

    def mark_not_on_sale(self, request, queryset):
        updated = queryset.update(is_on_sale=False)
        self.message_user(request, f'{updated} product(s) unmarked from sale.')

    class Media:
        css = {'all': ['store/style.css']}

            
class AddressItemInline(admin.TabularInline):
    autocomplete_fields = ['customer'] 
    min_num = 0
    max_num = 10 
    model = Address  
    extra = 0  



@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'membership', 'orders_count']
    list_editable = ['membership']
    list_per_page = 10
    inlines = [AddressItemInline]
    list_select_related = ['user']
    ordering = ['user__first_name', 'user__last_name']
    search_fields = ['first_name__istartswith', 'last_name__istartswith']

    def get_queryset(self, request):
        # Annotate each customer with the number of orders
        return super().get_queryset(request).annotate(orders_count=Count('order'))
    
    @admin.display(ordering='orders_count')
    def orders_count(self, customer):
        url = (
            reverse('admin:store_order_changelist')
            + '?'
            + urlencode({'customer__id': str(customer.id)})
        )
        return format_html('<a href="{}">{}</a>', url, customer.orders_count)


class OrderItemInline(admin.TabularInline):
    autocomplete_fields = ['product']
    min_num = 0
    max_num = 10
    model = OrderItem
    extra = 0
    
     
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    autocomplete_fields = ['customer']
    inlines = [OrderItemInline]
    list_display = ['id','placed_at','customer']
    

    