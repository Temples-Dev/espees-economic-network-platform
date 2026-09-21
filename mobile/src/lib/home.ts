import type { AppNotification, Campaign, Conversation, Order } from './types';

export function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initialsOf(fullName: string, email: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const source = words.length > 0 ? words.slice(0, 2) : [email.trim()];
  return source
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return `${then.getUTCDate()} ${MONTHS[then.getUTCMonth()]}`;
}

export function campaignProgress(c: Campaign): number {
  const goal = Number(c.goal_espees);
  const raised = Number(c.raised_espees ?? 0);
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(raised) || raised <= 0) return 0;
  return Math.min(1, raised / goal);
}

export function maskWalletId(id: string): string {
  return `•••• ${id.slice(-6)}`;
}

export type ActivityItem = {
  id: string;
  kind: 'order' | 'notification';
  title: string;
  meta: string;
  amount?: string;
  at: string;
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildActivity(
  orders: Order[],
  notifications: AppNotification[],
  limit: number,
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...orders.map<ActivityItem>((o) => ({
      id: `order-${o.id}`,
      kind: 'order',
      title: `Order with ${o.business_name}`,
      meta: capitalise(o.status),
      amount: `${o.total} ESP`,
      at: o.created_at,
    })),
    ...notifications.map<ActivityItem>((n) => ({
      id: `notification-${n.id}`,
      kind: 'notification',
      title: n.title,
      meta: n.message,
      at: n.created_at,
    })),
  ];
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

export type PendingItem = {
  id: string;
  kind: 'order' | 'conversation';
  title: string;
  detail: string;
};

export function buildPending(orders: Order[], conversations: Conversation[]): PendingItem[] {
  const pendingOrders = orders
    .filter((o) => o.status === 'pending')
    .map<PendingItem>((o) => ({
      id: `order-${o.id}`,
      kind: 'order',
      title: 'Order awaiting confirmation',
      detail: o.business_name,
    }));
  const unread = conversations
    .filter((c) => c.unread_count > 0)
    .map<PendingItem>((c) => ({
      id: `conversation-${c.id}`,
      kind: 'conversation',
      title: `${c.unread_count} unread ${c.unread_count === 1 ? 'message' : 'messages'}`,
      detail: c.other_party.full_name || c.other_party.email,
    }));
  return [...pendingOrders, ...unread];
}
