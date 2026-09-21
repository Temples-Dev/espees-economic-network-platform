import { render, screen } from '@testing-library/react-native';

import { Cover, OfferingList } from '@/components/discover-parts';
import type { Offering } from '@/lib/types';

describe('Cover', () => {
  it('shows the gradient and glyph when there is no image', async () => {
    await render(<Cover seed="Kofi" icon="cube-outline" />);
    expect(screen.queryByTestId('cover-image')).toBeNull();
  });

  it('shows the picture when an image URL is given', async () => {
    await render(<Cover seed="Kofi" icon="cube-outline" imageUrl="http://x/media/a.png" />);
    const img = screen.getByTestId('cover-image');
    expect(img.props.source).toEqual([{ uri: 'http://x/media/a.png' }]);
  });

  it('offering rows use the offering image', async () => {
    const o = { id: '1', name: 'Tee', kind: 'product', price: '5', business_name: 'B', image: 'http://x/media/t.png' } as Offering;
    await render(<OfferingList offerings={[o]} onPress={() => undefined} />);
    expect(screen.getByTestId('cover-image').props.source).toEqual([{ uri: 'http://x/media/t.png' }]);
  });
});
