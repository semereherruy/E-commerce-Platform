import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Create a Django superuser from environment variables when one does "
        "not already exist. Safe to run on every deployment."
    )

    ENV_USERNAME = "DJANGO_SUPERUSER_USERNAME"
    ENV_EMAIL = "DJANGO_SUPERUSER_EMAIL"
    ENV_PASSWORD = "DJANGO_SUPERUSER_PASSWORD"

    def handle(self, *args, **options):
        username = os.environ.get(self.ENV_USERNAME, "").strip()
        email = os.environ.get(self.ENV_EMAIL, "").strip()
        password = os.environ.get(self.ENV_PASSWORD, "")

        values = (username, email, password)
        if not any(values):
            self.stdout.write(
                self.style.WARNING(
                    "Superuser environment variables are not set; skipping admin creation."
                )
            )
            return

        if not all(values):
            raise CommandError(
                f"{self.ENV_USERNAME}, {self.ENV_EMAIL}, and "
                f"{self.ENV_PASSWORD} must all be set together."
            )

        User = get_user_model()

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser with username '{username}' already exists; skipping."
                )
            )
            return

        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"A user with email '{email}' already exists; skipping."
                )
            )
            return

        # core.User uses email as USERNAME_FIELD and username in REQUIRED_FIELDS.
        User.objects.create_superuser(email=email, password=password, username=username)

        self.stdout.write(
            self.style.SUCCESS(f"Superuser '{username}' created successfully.")
        )
