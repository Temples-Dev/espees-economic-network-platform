from django.http import JsonResponse
from django.utils import timezone

APP_INFO = {
    'name': 'EENP — Espees Economic Network Platform API',
    'version': '0.1.0',
}


def health(request):
    return JsonResponse({'status': 'ok', 'time': timezone.now().isoformat()})