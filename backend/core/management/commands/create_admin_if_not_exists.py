import os

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction


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
        email = os.environ.get(self.ENV_EMAIL, "").strip().lower()
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

        try:
            password_validation.validate_password(password)
        except ValidationError as exc:
            raise CommandError(
                "DJANGO_SUPERUSER_PASSWORD failed validation: "
                + "; ".join(exc.messages)
            ) from exc

        User = get_user_model()

        # TEMPORARY: Render Free admin recovery — remove after access is restored.
        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user is not None:
            with transaction.atomic():
                existing_user.set_password(password)
                existing_user.is_staff = True
                existing_user.is_superuser = True
                existing_user.save(
                    update_fields=["password", "is_staff", "is_superuser"]
                )

            self.stdout.write(
                self.style.WARNING(
                    "TEMPORARY RECOVERY: Reset password and restored admin access "
                    f"for '{email}' (username: '{existing_user.username}')."
                )
            )
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.SUCCESS(
                    "A superuser already exists; skipping admin creation."
                )
            )
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"A user with username '{username}' already exists; skipping."
                )
            )
            return

        try:
            with transaction.atomic():
                User.objects.create_superuser(
                    email=email,
                    password=password,
                    username=username,
                )
        except IntegrityError as exc:
            raise CommandError(
                "Superuser could not be created due to a database conflict. "
                "Another deploy may have created the account concurrently."
            ) from exc
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(f"Superuser '{username}' created successfully.")
        )
