from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from . import services
from . import utils

@staff_member_required
def dashboard(request):
    return render(request, "analytics/admin_dashboard.html")

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_analytics_data(request):
    """
    API Endpoint to fetch real-time analytics data via the service layer.
    """
    stats = services.get_dashboard_stats()
    return Response(stats)

@staff_member_required
def export_sales_report(request):
    """
    Generates and returns a PNG sales report using Matplotlib/Pandas.
    """
    df = utils.get_sales_data()
    if df.empty:
        return HttpResponse("No sales data available to generate report.", status=404)
        
    daily_sales, moving_avg = utils.analyze_sales(df)
    image_data = utils.plot_sales(daily_sales, moving_avg, as_base64=False)
    
    response = HttpResponse(image_data, content_type="image/png")
    response['Content-Disposition'] = 'attachment; filename="sales_report.png"'
    return response

