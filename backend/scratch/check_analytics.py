import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'storefront.settings.developer')
django.setup()

from analytics.services import get_dashboard_stats
import json

try:
    stats = get_dashboard_stats()
    print(json.dumps(stats, indent=4, default=str))
except Exception as e:
    print(f"Error: {e}")
