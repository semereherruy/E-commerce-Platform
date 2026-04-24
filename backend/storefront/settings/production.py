from .common import *

DEBUG = False

SECRET_KEY = env('SECRET_KEY')

# Strictly define ALLOWED_HOSTS from environment variables
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

DATABASES = {
    'default': env.db('DATABASE_URL')
}

# Ensure connection pooling is active
DATABASES['default']['CONN_MAX_AGE'] = 600
DATABASES['default']['CONN_HEALTH_CHECKS'] = True