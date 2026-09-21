"""Deterministic keyword search with light natural-language understanding.

"I need someone to do laptop repair in Accra" is reduced to keywords (laptop, repair), a category
hint (Technology) and a place (Accra). Nothing is inferred beyond what the catalogue itself says, so
results never claim capabilities a business has not listed (PRD 22.2). PostgreSQL full-text search
can replace the scoring later without changing the API.
"""

import re

from django.db.models import Avg, Count, Q

from businesses.models import Business, Category
from commerce.models import Offering

STOPWORDS = frozenset(
    """a an the i me my we our you your need needs want wants looking look for find someone somebody anyone
    to do does doing can could would should please help get have has with and or of in on at near around
    from is are be that this it its who which any some good best reliable new""".split()
)

# Everyday words that point at a category; matched against category names by substring.
CATEGORY_HINTS = {
    'tech': 'laptop phone computer website software app apps it electronics repair repairs internet',
    'food': 'food restaurant catering cook cooking meal meals lunch dinner grill jollof bakery',
    'fashion': 'tailor tailoring cloth clothes clothing dress shirt fashion shoe shoes beauty hair salon',
    'health': 'doctor clinic medical health pharmacy wellness nurse',
    'educat': 'school tutor tutoring lesson lessons training teach teacher course',
    'agric': 'farm farming crop crops harvest agriculture',
    'media': 'photo photography video camera design creative music',
    'construct': 'build builder plumber plumbing electrician carpenter paint painting construction',
}
HINT_TO_KEY = {word: key for key, words in CATEGORY_HINTS.items() for word in words.split()}


def interpret(query: str):
    """Split a free-text query into keywords, a known place and a category."""
    text = query.lower()
    locations = {
        loc.lower(): loc
        for loc in Business.objects.filter(is_active=True).exclude(location='').values_list('location', flat=True)
    }
    place = next((orig for low, orig in sorted(locations.items(), key=lambda kv: -len(kv[0])) if re.search(rf'\b{re.escape(low)}\b', text)), None)
    if place:
        text = re.sub(rf'\b{re.escape(place.lower())}\b', ' ', text)
    tokens = [t for t in re.findall(r"[a-z0-9]+", text) if t not in STOPWORDS and len(t) > 1]

    category = None
    for token in tokens:
        key = HINT_TO_KEY.get(token)
        candidates = Category.objects.all()
        for cat in candidates:
            name = cat.name.lower()
            if (key and key in name) or token in re.findall(r'[a-z]+', name):
                category = cat
                break
        if category:
            break
    return {'keywords': tokens, 'location': place, 'category': category}


def _hits(text: str, keywords) -> int:
    text = (text or '').lower()
    return sum(1 for k in keywords if k in text)


def search(query: str, limit: int = 10):
    parsed = interpret(query)
    keywords, place, category = parsed['keywords'], parsed['location'], parsed['category']

    businesses = Business.objects.filter(is_active=True).select_related('category')
    offerings = Offering.objects.filter(is_active=True, business__is_active=True).select_related('business')
    if place:
        businesses = businesses.filter(location__iexact=place)
        offerings = offerings.filter(business__location__iexact=place)

    scored_businesses = []
    for b in businesses:
        score = sum(
            3 * _hits(b.name, [k]) + 2 * _hits(b.category.name if b.category else '', [k]) + _hits(b.description, [k])
            for k in keywords
        )
        if category and b.category_id == category.id:
            score += 1.5
        if score and b.verification_status == Business.VerificationStatus.VERIFIED:
            score += 0.5
        if score:
            scored_businesses.append((score, b))

    scored_offerings = []
    for o in offerings:
        score = sum(3 * _hits(o.name, [k]) + _hits(o.description, [k]) for k in keywords)
        if score:
            scored_offerings.append((score, o))

    def top(scored, kind=None):
        rows = [item for item in sorted(scored, key=lambda s: -s[0]) if kind is None or item[1].kind == kind]
        return [item[1] for item in rows[:limit]]

    return {
        'interpreted': parsed,
        'businesses': top(scored_businesses),
        'products': top(scored_offerings, 'product'),
        'services': top(scored_offerings, 'service'),
    }
