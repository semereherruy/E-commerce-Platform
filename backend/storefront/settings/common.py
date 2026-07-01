import os
from pathlib import Path
from datetime import timedelta

import cloudinary
import environ

from celery.schedules import crontab


# =========================================================
# BASE DIRECTORY
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent


# =========================================================
# ENVIRONMENT VARIABLES
# =========================================================

env = environ.Env(
    DEBUG=(bool, False),
)

environ.Env.read_env(os.path.join(BASE_DIR, ".env"))


# =========================================================
# PROJECT SETTINGS
# =========================================================

DOMAIN = env("DOMAIN", default="localhost:3000")
SITE_NAME = "Nebi Store"


# =========================================================
# INSTALLED APPLICATIONS
# =========================================================

INSTALLED_APPS = [
    # Django Apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-Party Apps
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "djoser",
    "cloudinary",
    "cloudinary_storage",

    # Local Apps
    "store.apps.StoreConfig",
    "analytics.apps.AnalyticsConfig",
    "tags.apps.TagsConfig",
    "likes.apps.LikesConfig",
    "core.apps.CoreConfig",
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.middleware.JWTToSessionMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =========================================================
# INTERNAL IPS
# =========================================================

INTERNAL_IPS = [
    "127.0.0.1",
]


# =========================================================
# URLS & WSGI
# =========================================================

ROOT_URLCONF = "storefront.urls"

WSGI_APPLICATION = "storefront.wsgi.application"


# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =========================================================
# PASSWORD VALIDATION
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# =========================================================
# INTERNATIONALIZATION
# =========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# =========================================================
# STATIC FILES
# =========================================================

STATIC_URL = "/static/"

STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

STATICFILES_DIRS = []


# =========================================================
# MEDIA FILES
# =========================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = os.path.join(BASE_DIR, "media")


# =========================================================
# CLOUDINARY CONFIGURATION
# =========================================================

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": env("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": env("CLOUDINARY_API_KEY"),
    "API_SECRET": env("CLOUDINARY_API_SECRET"),
}

cloudinary.config(
    cloud_name=env("CLOUDINARY_CLOUD_NAME"),
    api_key=env("CLOUDINARY_API_KEY"),
    api_secret=env("CLOUDINARY_API_SECRET"),
    secure=True,
)


# =========================================================
# STORAGE CONFIGURATION
# =========================================================

STORAGES = {
    # Media Files
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },

    # Static Files
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

STATICFILES_STORAGE = (
    "django.contrib.staticfiles.storage.StaticFilesStorage"
)

DEFAULT_FILE_STORAGE = (
    "cloudinary_storage.storage.MediaCloudinaryStorage"
)


# =========================================================
# DEFAULT PRIMARY KEY
# =========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =========================================================
# DJANGO REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "COERCE_DECIMAL_TO_STRING": False,

    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),

    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],

    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
    },
}


# =========================================================
# SIMPLE JWT
# =========================================================

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("JWT",),

    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": True,
}


# =========================================================
# DJOSER CONFIGURATION
# =========================================================

DJOSER = {
    "LOGIN_FIELD": "email",

    "SERIALIZERS": {
        "user_create": "core.serializers.UserCreateSerializer",
        "current_user": "core.serializers.UserSerializer",
        "user": "core.serializers.UserSerializer",
    },

    "PASSWORD_RESET_CONFIRM_URL": "reset/{uid}/{token}",

    "DOMAIN": DOMAIN,

    "SITE_NAME": SITE_NAME,
}


# =========================================================
# CUSTOM USER MODEL
# =========================================================

AUTH_USER_MODEL = "core.User"


# =========================================================
# EMAIL CONFIGURATION
# =========================================================

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = env("EMAIL_HOST")

EMAIL_HOST_USER = env("EMAIL_HOST_USER")

EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")

EMAIL_PORT = env.int("EMAIL_PORT", default=587)

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="admin@ecommerce.com",
)

ADMINS = [
    (
        env("ADMIN_NAME", default="Admin"),
        env("ADMIN_EMAIL", default="admin@ecommerce.com"),
    )
]


# =========================================================
# CELERY CONFIGURATION
# =========================================================

CELERY_BROKER_URL = env("REDIS_URL")

CELERY_RESULT_BACKEND = env("REDIS_URL")

CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_BEAT_SCHEDULE = {
    "notify_customers": {
        "task": "playground.tasks.notify_customers",
        "schedule": crontab(hour=7, minute=30),
        "args": ["hello world"],
    }
}


# =========================================================
# CACHE CONFIGURATION
# =========================================================

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",

        "LOCATION": env("REDIS_URL"),

        "OPTIONS": {
            "CLIENT_CLASS": (
                "django_redis.client.DefaultClient"
            ),
        },
    }
}


# =========================================================
# LOGGING CONFIGURATION
# =========================================================

LOGGING = {
    "version": 1,

    "disable_existing_loggers": False,

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },

        "file": {
            "class": "logging.handlers.RotatingFileHandler",

            "filename": "general.log",

            "maxBytes": 1024 * 1024 * 10,

            "backupCount": 5,

            "formatter": "verbose",
        },
    },

    "loggers": {
        "": {
            "handlers": ["console", "file"],

            "level": env(
                "DJANGO_LOG_LEVEL",
                default="INFO",
            ),
        }
    },

    "formatters": {
        "verbose": {
            "format": (
                "{asctime} ({levelname}) "
                "{name} - {message}"
            ),

            "style": "{",
        }
    },
}