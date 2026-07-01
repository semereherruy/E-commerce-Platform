#!/usr/bin/env bash
set -euo pipefail

pip install -r requirements.txt

python manage.py migrate
python manage.py create_admin_if_not_exists
python manage.py collectstatic --noinput
