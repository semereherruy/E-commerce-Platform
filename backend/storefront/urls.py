import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.http import FileResponse, Http404
from django.views.static import serve
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

def serve_media_debug(request, path):
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'))
    raise Http404(f"Media file not found at: {file_path}")

admin.site.site_header = 'Ecommerce Admin'
admin.site.index_title = 'admin'
admin.site.site_url = 'http://localhost:3000'

# Define standard patterns
standard_patterns = [
    path('api/', include('store.api_urls')),
    path('admin/', admin.site.urls),
    path('playground/',include('playground.urls')),
    path('api/v1/analytics/', include("analytics.urls")),
    path('api/v1/store/',include('store.urls')),
    path('api/v1/auth/', include('djoser.urls')),
    path('api/v1/auth/', include('djoser.urls.jwt')),
    path('__debug__/',include('debug_toolbar.urls')),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path('',include('core.urls')),
]

# Use manual serving for BOTH static and media to ensure they are found
urlpatterns = [
    path('media/<path:path>', serve_media_debug),
    path('static/<path:path>', serve, {'document_root': settings.STATIC_ROOT}),
] + standard_patterns

if settings.DEBUG:
    urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]