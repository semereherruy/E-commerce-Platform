from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from store.models import Order, OrderItem, Customer

def get_dashboard_stats():
    """
    Collects and aggregates all statistics required for the analytics dashboard.
    """
    # 1. Sales over time (Last 30 days)
    last_30_days = timezone.now() - timedelta(days=30)
    
    daily_sales = (
        OrderItem.objects
        .filter(order__placed_at__gte=last_30_days)
        .annotate(date=TruncDate('order__placed_at'))
        .values('date')
        .annotate(total_sales=Sum(F('quantity') * F('unit_price')))
        .order_by('date')
    )
    
    dates = [entry['date'].strftime('%Y-%m-%d') for entry in daily_sales]
    sales_values = [float(entry['total_sales']) for entry in daily_sales]
    
    # 2. Sales by Collection (Top 5)
    collection_sales = (
        OrderItem.objects
        .values('product__collection__title')
        .annotate(total_sales=Sum(F('quantity') * F('unit_price')))
        .order_by('-total_sales')[:5]
    )
    
    collection_labels = [entry['product__collection__title'] or 'Unknown' for entry in collection_sales]
    collection_values = [float(entry['total_sales']) for entry in collection_sales]

    # 3. Top Selling Products
    top_products = (
        OrderItem.objects
        .values('product__title')
        .annotate(total_sold=Sum('quantity'))
        .order_by('-total_sold')[:5]
    )
    product_labels = [entry['product__title'] for entry in top_products]
    product_values = [entry['total_sold'] for entry in top_products]

    # 4. Customer Membership Distribution
    membership_dist = (
        Customer.objects
        .values('membership')
        .annotate(count=Count('id'))
    )
    membership_map = {'B': 'Bronze', 'S': 'Silver', 'G': 'Gold'}
    membership_labels = [membership_map.get(entry['membership'], 'Unknown') for entry in membership_dist]
    membership_values = [entry['count'] for entry in membership_dist]

    # 5. Order Value Distribution
    orders = Order.objects.prefetch_related('items').all()
    ranges = {'$0-50': 0, '$50-100': 0, '$100-500': 0, '$500+': 0}
    for order in orders:
        val = order.total
        if val <= 50: ranges['$0-50'] += 1
        elif val <= 100: ranges['$50-100'] += 1
        elif val <= 500: ranges['$100-500'] += 1
        else: ranges['$500+'] += 1
    
    # 6. Overall Statistics
    total_orders_count = Order.objects.count()
    total_revenue_agg = OrderItem.objects.aggregate(total=Sum(F('quantity') * F('unit_price')))
    total_revenue = total_revenue_agg['total'] or 0

    return {
        'chart_data': {
            'dates': dates,
            'sales': sales_values,
        },
        'pie_data': {
            'labels': collection_labels,
            'values': collection_values,
        },
        'top_products': {
            'labels': product_labels,
            'values': product_values,
        },
        'membership_dist': {
            'labels': membership_labels,
            'values': membership_values,
        },
        'order_distribution': {
            'labels': list(ranges.keys()),
            'values': list(ranges.values()),
        },
        'summary': {
            'total_orders': total_orders_count,
            'total_revenue': float(total_revenue),
        }
    }
