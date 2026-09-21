export function buildQuery(
  path: string,
  filters: { search?: string; category?: string | null },
): string {
  const params: string[] = [];
  const search = filters.search?.trim();
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (filters.category) params.push(`category=${encodeURIComponent(filters.category)}`);
  return params.length > 0 ? `${path}?${params.join('&')}` : path;
}

export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? '').toLowerCase().includes(q));
}

export type CategoryIcon =
  | 'restaurant-outline'
  | 'shirt-outline'
  | 'hardware-chip-outline'
  | 'medkit-outline'
  | 'school-outline'
  | 'leaf-outline'
  | 'camera-outline'
  | 'construct-outline'
  | 'storefront-outline';

const ICON_RULES: [RegExp, CategoryIcon][] = [
  [/food|cater/i, 'restaurant-outline'],
  [/fashion|beauty/i, 'shirt-outline'],
  [/tech|repair/i, 'hardware-chip-outline'],
  [/health|well/i, 'medkit-outline'],
  [/educat|train/i, 'school-outline'],
  [/agric|farm/i, 'leaf-outline'],
  [/media|creative/i, 'camera-outline'],
  [/construct|trade|build/i, 'construct-outline'],
];

export function categoryIcon(name: string | null | undefined): CategoryIcon {
  const match = ICON_RULES.find(([pattern]) => pattern.test(name ?? ''));
  return match ? match[1] : 'storefront-outline';
}

export function coverIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % count;
}
