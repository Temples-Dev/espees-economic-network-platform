import { buildQuery, categoryIcon, coverIndex, matchesQuery } from './discover';

describe('buildQuery', () => {
  it('leaves the path alone when there are no filters', () => {
    expect(buildQuery('/api/v1/businesses/', {})).toBe('/api/v1/businesses/');
  });

  it('adds a trimmed, encoded search term', () => {
    expect(buildQuery('/api/v1/businesses/', { search: '  laptop repair ' })).toBe(
      '/api/v1/businesses/?search=laptop%20repair',
    );
  });

  it('adds a category slug', () => {
    expect(buildQuery('/api/v1/businesses/', { category: 'repairs' })).toBe(
      '/api/v1/businesses/?category=repairs',
    );
  });

  it('puts search before category when both are set', () => {
    expect(buildQuery('/api/v1/products/', { search: 'laptop', category: 'repairs' })).toBe(
      '/api/v1/products/?search=laptop&category=repairs',
    );
  });

  it('ignores a blank search and a null category', () => {
    expect(buildQuery('/api/v1/products/', { search: '   ', category: null })).toBe(
      '/api/v1/products/',
    );
  });
});

describe('matchesQuery', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesQuery('  ', 'Anything')).toBe(true);
  });

  it('matches any field case-insensitively', () => {
    expect(matchesQuery('bore', 'Community Borehole', null)).toBe(true);
    expect(matchesQuery('WELL', null, 'a deep well for the village')).toBe(true);
  });

  it('rejects when no field contains the query', () => {
    expect(matchesQuery('laptop', 'Community Borehole', 'water')).toBe(false);
  });
});

describe('categoryIcon', () => {
  it('picks an icon that suits the category', () => {
    expect(categoryIcon('Food & Catering')).toBe('restaurant-outline');
    expect(categoryIcon('Fashion & Beauty')).toBe('shirt-outline');
    expect(categoryIcon('Technology & Repairs')).toBe('hardware-chip-outline');
    expect(categoryIcon('Health & Wellness')).toBe('medkit-outline');
    expect(categoryIcon('Education & Training')).toBe('school-outline');
    expect(categoryIcon('Agriculture')).toBe('leaf-outline');
    expect(categoryIcon('Media & Creative')).toBe('camera-outline');
    expect(categoryIcon('Construction & Trades')).toBe('construct-outline');
  });

  it('falls back to a storefront for unknown or missing categories', () => {
    expect(categoryIcon('Something Else')).toBe('storefront-outline');
    expect(categoryIcon(null)).toBe('storefront-outline');
  });
});

describe('coverIndex', () => {
  it('is stable for the same seed', () => {
    expect(coverIndex('Kofi Repairs', 4)).toBe(coverIndex('Kofi Repairs', 4));
  });

  it('stays within range', () => {
    for (const seed of ['a', 'Mama Tee', 'Zuri Styles', '', 'CodeHive Africa']) {
      const i = coverIndex(seed, 4);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(4);
    }
  });

  it('spreads different seeds across the palette', () => {
    const seen = new Set(
      ['Kofi Repairs', 'Ama Bakes', 'Zuri Styles', 'Glow by Ama', 'GreenAcre Farms', 'BrightPath Academy'].map(
        (s) => coverIndex(s, 4),
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
