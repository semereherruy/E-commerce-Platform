from .common import *

DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='dev-insecure-key')

# Use PostgreSQL for local development
DATABASES = {
    'default': env.db('DATABASE_URL', default='postgres://client:market123@localhost:5432/ecommerce_db')
}

# Add connection pooling for consistency with production if desired
DATABASES['default']['CONN_MAX_AGE'] = 600
DATABASES['default']['CONN_HEALTH_CHECKS'] = True
