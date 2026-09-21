import type { AppNotification, Campaign, Conversation, Order } from './types';
import {
  buildActivity,
  buildPending,
  campaignProgress,
  greetingFor,
  initialsOf,
  maskWalletId,
  relativeTime,
} from './home';

const at = (h: number) => new Date(2026, 8, 21, h, 0, 0);

describe('greetingFor', () => {
  it('greets by time of day', () => {
    expect(greetingFor(at(6))).toBe('Good morning');
    expect(greetingFor(at(13))).toBe('Good afternoon');
    expect(greetingFor(at(19))).toBe('Good evening');
    expect(greetingFor(at(2))).toBe('Good evening');
  });
});

describe('initialsOf', () => {
  it('uses the first letters of the first two name words', () => {
    expect(initialsOf('Temple Lomotey', 'x@y.co')).toBe('TL');
    expect(initialsOf('  temple  ', 'x@y.co')).toBe('T');
  });

  it('falls back to the email when there is no name', () => {
    expect(initialsOf('', 'kofi@espees.org')).toBe('K');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-09-21T12:00:00Z');

  it('formats recent times compactly', () => {
    expect(relativeTime('2026-09-21T11:59:40Z', now)).toBe('Just now');
    expect(relativeTime('2026-09-21T11:30:00Z', now)).toBe('30m ago');
    expect(relativeTime('2026-09-21T09:00:00Z', now)).toBe('3h ago');
    expect(relativeTime('2026-09-19T12:00:00Z', now)).toBe('2d ago');
  });

  it('falls back to a date for older items', () => {
    expect(relativeTime('2026-08-01T12:00:00Z', now)).toBe('1 Aug');
  });
});

describe('campaignProgress', () => {
  const base = { goal_espees: '1000', raised_espees: '250' } as Campaign;

  it('returns the raised share of the goal', () => {
    expect(campaignProgress(base)).toBeCloseTo(0.25);
  });

  it('clamps over-funded campaigns to 1', () => {
    expect(campaignProgress({ ...base, raised_espees: 4000 })).toBe(1);
  });

  it('treats missing raised or a zero goal as 0', () => {
    expect(campaignProgress({ ...base, raised_espees: null })).toBe(0);
    expect(campaignProgress({ ...base, goal_espees: '0' })).toBe(0);
  });
});

const order = (o: Partial<Order>): Order => ({
  id: 'o1',
  customer_email: 'a@b.co',
  business: 'b1',
  business_name: 'Kofi Repairs',
  status: 'pending',
  total: '50.00',
  items: [],
  created_at: '2026-09-21T10:00:00Z',
  updated_at: '2026-09-21T10:00:00Z',
  ...o,
});

const note = (n: Partial<AppNotification>): AppNotification => ({
  id: 'n1',
  category: 'system',
  title: 'Welcome',
  message: 'Hi',
  target_type: null,
  target_id: null,
  read_at: null,
  is_read: false,
  created_at: '2026-09-21T11:00:00Z',
  ...n,
});

describe('buildActivity', () => {
  it('merges orders and notifications newest first', () => {
    const items = buildActivity(
      [order({ id: 'o1', created_at: '2026-09-21T10:00:00Z' })],
      [note({ id: 'n1', created_at: '2026-09-21T11:00:00Z' })],
      10,
    );
    expect(items.map((i) => i.id)).toEqual(['notification-n1', 'order-o1']);
  });

  it('describes an order with its business, status and amount', () => {
    const [item] = buildActivity([order({})], [], 10);
    expect(item.title).toBe('Order with Kofi Repairs');
    expect(item.meta).toBe('Pending');
    expect(item.amount).toBe('50.00 ESP');
    expect(item.kind).toBe('order');
  });

  it('gives notifications no amount', () => {
    const [item] = buildActivity([], [note({})], 10);
    expect(item.amount).toBeUndefined();
  });

  it('limits the list', () => {
    const notes = [1, 2, 3, 4].map((i) => note({ id: `n${i}`, created_at: `2026-09-2${i}T00:00:00Z` }));
    expect(buildActivity([], notes, 2)).toHaveLength(2);
  });
});

describe('maskWalletId', () => {
  it('keeps only the last six characters', () => {
    expect(maskWalletId('stub-espees-wallet-abc123')).toBe('•••• abc123');
  });

  it('returns short ids unchanged behind the mask', () => {
    expect(maskWalletId('ab12')).toBe('•••• ab12');
  });
});

describe('buildPending', () => {
  const convo = (c: Partial<Conversation>) =>
    ({
      id: 'c1',
      other_party: { id: 'u2', email: 'k@y.co', full_name: 'Kofi Mensah' },
      unread_count: 0,
      ...c,
    }) as Conversation;

  it('lists pending orders and unread conversations only', () => {
    const items = buildPending(
      [order({ id: 'o1', status: 'pending' }), order({ id: 'o2', status: 'fulfilled' })],
      [convo({ id: 'c1', unread_count: 3 }), convo({ id: 'c2', unread_count: 0 })],
    );
    expect(items.map((i) => i.id)).toEqual(['order-o1', 'conversation-c1']);
  });

  it('words the items for the member', () => {
    const items = buildPending([order({})], [convo({ unread_count: 3 })]);
    expect(items[0].title).toBe('Order awaiting confirmation');
    expect(items[0].detail).toBe('Kofi Repairs');
    expect(items[1].title).toBe('3 unread messages');
    expect(items[1].detail).toBe('Kofi Mensah');
  });

  it('uses the singular for one unread message', () => {
    const [item] = buildPending([], [convo({ unread_count: 1 })]);
    expect(item.title).toBe('1 unread message');
  });
});
