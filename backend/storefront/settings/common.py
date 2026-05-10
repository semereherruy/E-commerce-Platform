import environ
import os
from pathlib import Path
from datetime import timedelta
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Initialize environment variables
env = environ.Env(
    # set casting, default value
    DEBUG=(bool, False)
)

# Reading .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

DOMAIN = env('DOMAIN', default='localhost:3000')
SITE_NAME = 'Nebi Store'


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework_simplejwt.token_blacklist',
    'djoser',
    "corsheaders",
    'django_filters',
    'drf_spectacular',
    'rest_framework',
    'store.apps.StoreConfig',
    'analytics.apps.AnalyticsConfig',
    'tags.apps.TagsConfig',
    'likes.apps.LikesConfig',
    'core.apps.CoreConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # 'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.JWTToSessionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]

if env('DEBUG'):
    pass
    
    
INTERNAL_IPS = [
    # ...
    "127.0.0.1",
    # ...
]

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
])

ROOT_URLCONF = 'storefront.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, "templates")],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'storefront.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'COERCE_DECIMAL_TO_STRING': False,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
}

SIMPLE_JWT = {
    # Use a single auth header type to keep OpenAPI schema unambiguous.
    'AUTH_HEADER_TYPES': ('JWT',),
    # Short-lived access tokens for better security (applies to users and admins)
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    # Longer-lived refresh tokens with rotation and blacklisting
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}


DJOSER ={
    'SERIALIZERS':{
        'user_create':'core.serializers.UserCreateSerializer',
        'current_user':'core.serializers.UserSerializer',
        'user': 'core.serializers.UserSerializer',
    },
    'PASSWORD_RESET_CONFIRM_URL': 'reset/{uid}/{token}',
    'DOMAIN': env('DOMAIN', default='localhost:3000'),
    'SITE_NAME': env('SITE_NAME', default='Nebi Store'),
}

AUTH_USER_MODEL= 'core.User'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_PORT = env.int('EMAIL_PORT', default=2525)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='admin@ecommerce.com')

ADMINS = [
    (env('ADMIN_NAME', default='Admin'), env('ADMIN_EMAIL', default='admin@ecommerce.com'))
]
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/1')
CELERY_BEAT_SCHEDULE = {
    'notify_customers':{
        'task':'playground.tasks.notify_customers',
        'schedule': crontab(hour=7, minute=30),
        'args':['hello world']
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env('REDIS_URL', default='redis://127.0.0.1:6379/2'),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}
#CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

LOGGING = {
    
    'version':1,
    'disable_existing_loggers': False,
    'handlers':{
         'console':{
             'class':'logging.StreamHandler',
             },
         'file':{
             'class': 'logging.handlers.RotatingFileHandler',
             'filename': 'general.log',
             'maxBytes': 1024 * 1024 * 10, # 10 MB
             'backupCount': 5,
             'formatter': 'verbose'
         }
    },
    'loggers':{
        '':{
            'handlers':['console','file'],
            'level': env('DJANGO_LOG_LEVEL', default='INFO')
        }
    },
    'formatters':{
        'verbose':{
            'format':'{asctime}({levelname}-{name} - {message})',
            'style':'{'
        }
    }
}

