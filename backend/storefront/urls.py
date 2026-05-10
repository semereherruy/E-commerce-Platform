import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.http import FileResponse, Http404
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from core.views import JwtLogoutView

def serve_media_debug(request, path):
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'))
    raise Http404(f"Media file not found at: {file_path}")

admin.site.site_header = 'Ecommerce Admin'
admin.site.index_title = 'admin'
admin.site.site_url = 'http://localhost:3000'

# Core API + app routes (safe in production).
urlpatterns = [
    path("api/", include("store.api_urls")),
    path("admin/", admin.site.urls),
    path("api/v1/analytics/", include("analytics.urls")),
    path("api/v1/store/", include("store.urls")),
    path("api/v1/auth/", include("djoser.urls")),
    path("api/v1/auth/", include("djoser.urls.jwt")),
    path("api/v1/auth/logout/", JwtLogoutView.as_view(), name="api-auth-logout"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("", include("core.urls")),
]

# Debug-only routes (never enable in production).
if settings.DEBUG:
    # Serve media/static via Django only in DEBUG.
    urlpatterns = [
        path("media/<path:path>", serve_media_debug),
        path("static/<path:path>", serve, {"document_root": settings.STATIC_ROOT}),
    ] + urlpatterns

    # Playground is a dev utility and should not be mounted in production.
    if "playground" in settings.INSTALLED_APPS:
        urlpatterns += [path("playground/", include("playground.urls"))]