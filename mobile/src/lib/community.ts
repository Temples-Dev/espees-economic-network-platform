import { matchesQuery } from '@/lib/discover';
import type { Conversation, MemberSummary, Message } from '@/lib/types';

export type InboxFilter = 'all' | 'unread' | 'business' | 'order' | 'campaign';
export type ContextKind = 'direct' | 'business' | 'order' | 'campaign';

export function otherParty(c: Conversation, myId: string): MemberSummary {
  return c.initiator.id === myId ? c.other_party : c.initiator;
}

export function displayName(m: MemberSummary): string {
  return m.full_name || m.email;
}

export function firstName(m: MemberSummary): string {
  return displayName(m).split(/[\s@]/)[0];
}

export function previewOf(c: Conversation, myId: string): string {
  if (!c.last_message) return 'No messages yet';
  const text = c.last_message.replace(/\s+/g, ' ').trim();
  return c.last_message_sender === myId ? `You: ${text}` : text;
}

export function contextOf(c: Conversation): { kind: ContextKind; label: string } {
  if (c.business_name) return { kind: 'business', label: c.business_name };
  if (c.campaign_title) return { kind: 'campaign', label: c.campaign_title };
  if (c.order_id) return { kind: 'order', label: `Order ${String(c.order_id).slice(0, 8)}` };
  return { kind: 'direct', label: 'Direct message' };
}

/** Most recent activity first; conversations with no messages fall to the bottom. */
export function filterConversations(
  list: Conversation[],
  f: { query: string; filter: InboxFilter },
  myId: string,
): Conversation[] {
  return list
    .filter((c) => {
      const ctx = contextOf(c);
      if (f.filter === 'unread' && c.unread_count === 0) return false;
      if (f.filter !== 'all' && f.filter !== 'unread' && ctx.kind !== f.filter) return false;
      return matchesQuery(f.query, displayName(otherParty(c, myId)), otherParty(c, myId).email, ctx.label);
    })
    .sort((a, b) => Date.parse(b.last_message_at ?? b.created_at) - Date.parse(a.last_message_at ?? a.created_at));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function groupByDay(messages: Message[], now: Date): { label: string; messages: Message[] }[] {
  const groups: { label: string; messages: Message[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.created_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.messages.push(m);
    else groups.push({ label, messages: [m] });
  }
  return groups;
}

const RUN_GAP_MS = 5 * 60 * 1000;

export type Run = { message: Message; mine: boolean; first: boolean; last: boolean };

/** Marks where a run of messages from one sender starts and ends (a pause of 5+ minutes also ends a run). */
export function groupRuns(messages: Message[], myId: string): Run[] {
  const breaks = (a: Message, b: Message | undefined) =>
    !b || a.sender !== b.sender || Date.parse(b.created_at) - Date.parse(a.created_at) > RUN_GAP_MS;
  return messages.map((message, i) => ({
    message,
    mine: message.sender === myId,
    first: i === 0 || breaks(messages[i - 1], message),
    last: breaks(message, messages[i + 1]),
  }));
}
