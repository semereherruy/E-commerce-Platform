from .common import *

DEBUG = env('DEBUG')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='dev-insecure-key')

# Use PostgreSQL for local development
DATABASES = {
    'default': env.db('DATABASE_URL', default='postgres://client:market123@localhost:5432/ecommerce_db')
}

# Add connection pooling for consistency with production if desired
DATABASES['default']['CONN_MAX_AGE'] = 600
DATABASES['default']['CONN_HEALTH_CHECKS'] = True

# ---------------------------------------------------------------------------
# Cache – use in-process memory cache so Redis is NOT required locally.
# Remove this block (or set REDIS_URL) if you start Redis for local dev.
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# INSTALLED_APPS += [
#     'silk',
#     'debug_toolbar',
#     'playground.apps.PlaygroundConfig',
# ]

# MIDDLEWARE += [
#     'debug_toolbar.middleware.DebugToolbarMiddleware',
#     'silk.middleware.SilkyMiddleware',
# ]

# Use console backend for development to see emails in terminal
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Force Djoser to use frontend URL
DOMAIN = 'localhost:3000'
DJOSER['DOMAIN'] = DOMAIN
DJOSER['PROTOCOL'] = 'http'
DJOSER['SITE_NAME'] = 'Nebi Store'
