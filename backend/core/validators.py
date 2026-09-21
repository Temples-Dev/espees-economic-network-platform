from django.conf import settings
from django.core.exceptions import ValidationError


def validate_image_size(image):
    """Reject uploads larger than MAX_IMAGE_UPLOAD_BYTES (the ImageField already verifies it decodes)."""
    limit = settings.MAX_IMAGE_UPLOAD_BYTES
    if image.size > limit:
        raise ValidationError(f'Image is too large (max {limit // (1024 * 1024) or 1} MB).')
