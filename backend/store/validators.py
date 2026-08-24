from django.core.exceptions import ValidationError

MAX_IMAGE_MB = 10


def validate_file_size(file):
    max_bytes = MAX_IMAGE_MB * 1024 * 1024

    if file.size > max_bytes:
        raise ValidationError(f'Image size must be {MAX_IMAGE_MB} MB or less.')
