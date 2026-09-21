from django.db.models import Avg, Count
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from businesses.models import Business
from businesses.serializers import BusinessSerializer
from commerce.models import Offering
from commerce.serializers import OfferingSerializer

from .search import search as run_search

APP_INFO = {
    'name': 'EENP — Espees Economic Network Platform API',
    'version': '0.1.0',
}


def health(request):
    return JsonResponse({'status': 'ok', 'time': timezone.now().isoformat()})

@api_view(['GET'])
@permission_classes([AllowAny])
def search(request):
    """Search businesses, products and services with a plain-language query."""
    query = (request.query_params.get('q') or '').strip()
    if not query:
        return Response({'q': ['This query parameter is required.']}, status=status.HTTP_400_BAD_REQUEST)
    try:
        limit = min(max(int(request.query_params.get('limit', 10)), 1), 50)
    except ValueError:
        limit = 10

    result = run_search(query, limit)
    context = {'request': request}
    business_ids = [b.id for b in result['businesses']]
    businesses = BusinessSerializer.setup_eager_loading(Business.objects.filter(id__in=business_ids))
    by_id = {b.id: b for b in businesses}

    def offerings(items):
        ids = [o.id for o in items]
        rows = Offering.objects.filter(id__in=ids).select_related('business', 'category').annotate(
            average_rating=Avg('reviews__rating'), review_count=Count('reviews')
        )
        lookup = {o.id: o for o in rows}
        return OfferingSerializer([lookup[i] for i in ids], many=True, context=context).data

    interpreted = result['interpreted']
    return Response(
        {
            'q': query,
            'interpreted': {
                'keywords': interpreted['keywords'],
                'location': interpreted['location'],
                'category': interpreted['category'].name if interpreted['category'] else None,
            },
            'businesses': BusinessSerializer([by_id[i] for i in business_ids], many=True, context=context).data,
            'products': offerings(result['products']),
            'services': offerings(result['services']),
        }
    )
