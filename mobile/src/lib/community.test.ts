import {
  contextOf,
  dayLabel,
  displayName,
  filterConversations,
  firstName,
  groupByDay,
  groupRuns,
  otherParty,
  previewOf,
} from '@/lib/community';
import type { Conversation, Message } from '@/lib/types';

const me = { id: 'me', email: 'me@x.co', full_name: 'Me' };
const ama = { id: 'a', email: 'ama@x.co', full_name: 'Ama Mensah' };
const kofi = { id: 'k', email: 'kofi@x.co', full_name: '' };

const conv = (id: string, over: Partial<Conversation>): Conversation =>
  ({
    id, initiator: me, other_party: ama, business: null, business_name: null, order: null, order_id: null,
    campaign: null, campaign_title: null, last_message_at: null, unread_count: 0, created_at: '2026-01-01T00:00:00Z',
    ...over,
  }) as Conversation;

describe('community helpers', () => {
  it('picks the other person whichever side you are on', () => {
    expect(otherParty(conv('1', {}), 'me')).toBe(ama);
    expect(otherParty(conv('1', { initiator: ama, other_party: me }), 'me')).toBe(ama);
  });

  it('falls back to the email when there is no name', () => {
    expect(displayName(ama)).toBe('Ama Mensah');
    expect(displayName(kofi)).toBe('kofi@x.co');
  });

  it('describes what a conversation is about', () => {
    expect(contextOf(conv('1', {}))).toEqual({ kind: 'direct', label: 'Direct message' });
    expect(contextOf(conv('1', { business: 'b', business_name: 'Mama Tees' }))).toEqual({ kind: 'business', label: 'Mama Tees' });
    expect(contextOf(conv('1', { campaign: 'c', campaign_title: 'Solar Farm' }))).toEqual({ kind: 'campaign', label: 'Solar Farm' });
    expect(contextOf(conv('1', { order: 'o', order_id: 'abcdef1234' }))).toEqual({ kind: 'order', label: 'Order abcdef12' });
  });

  it('filters by unread, kind and search, newest activity first', () => {
    const list = [
      conv('1', { business: 'b', business_name: 'Mama Tees', last_message_at: '2026-09-01T10:00:00Z' }),
      conv('2', { other_party: kofi, unread_count: 2, last_message_at: '2026-09-20T10:00:00Z' }),
      conv('3', { campaign: 'c', campaign_title: 'Solar Farm', last_message_at: '2026-09-10T10:00:00Z' }),
    ];
    const f = (query: string, filter: 'all' | 'unread' | 'business' | 'order' | 'campaign') =>
      filterConversations(list, { query, filter }, 'me').map((c) => c.id);
    expect(f('', 'all')).toEqual(['2', '3', '1']);
    expect(f('', 'unread')).toEqual(['2']);
    expect(f('', 'business')).toEqual(['1']);
    expect(f('', 'campaign')).toEqual(['3']);
    expect(f('kofi', 'all')).toEqual(['2']);
    expect(f('solar', 'all')).toEqual(['3']);
    expect(f('mama', 'all')).toEqual(['1']);
  });

  it('labels days relative to now', () => {
    const now = new Date(2026, 8, 21, 15, 0);
    expect(dayLabel(new Date(2026, 8, 21, 9, 0).toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 8, 20, 22, 0).toISOString(), now)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 8, 5, 12, 0).toISOString(), now)).toBe('5 Sep');
  });

  it('groups messages into day sections in order', () => {
    const now = new Date(2026, 8, 21, 15, 0);
    const m = (id: string, d: Date) => ({ id, created_at: d.toISOString() }) as Message;
    const groups = groupByDay(
      [m('1', new Date(2026, 8, 20, 9)), m('2', new Date(2026, 8, 20, 10)), m('3', new Date(2026, 8, 21, 9))],
      now,
    );
    expect(groups.map((g) => [g.label, g.messages.length])).toEqual([['Yesterday', 2], ['Today', 1]]);
  });

  it('uses the first name for the recent strip', () => {
    expect(firstName(ama)).toBe('Ama');
    expect(firstName(kofi)).toBe('kofi');
  });

  it('previews the last message, prefixing your own', () => {
    expect(previewOf(conv('1', { last_message: 'Hello there', last_message_sender: 'a' }), 'me')).toBe('Hello there');
    expect(previewOf(conv('1', { last_message: 'On my way', last_message_sender: 'me' }), 'me')).toBe('You: On my way');
    expect(previewOf(conv('1', {}), 'me')).toBe('No messages yet');
  });

  it('collapses line breaks and extra spaces in a preview', () => {
    expect(previewOf(conv('1', { last_message: 'Hi\n\nthere   friend', last_message_sender: 'a' }), 'me')).toBe('Hi there friend');
  });

  it('groups consecutive messages from one sender into runs', () => {
    const at = (min: number) => new Date(2026, 8, 21, 10, min).toISOString();
    const m = (id: string, sender: string, min: number) => ({ id, sender, created_at: at(min), body: id }) as Message;
    const runs = groupRuns([m('a', 'me', 0), m('b', 'me', 1), m('c', 'them', 2), m('d', 'them', 30), m('e', 'them', 31)], 'me');
    expect(runs.map((r) => [r.message.id, r.mine, r.last])).toEqual([
      ['a', true, false],
      ['b', true, true],
      ['c', false, true], // 28 minutes pass before the next one, so it ends its own run
      ['d', false, false],
      ['e', false, true],
    ]);
  });
});
