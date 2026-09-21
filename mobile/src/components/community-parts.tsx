import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { contextOf, displayName, firstName, otherParty, previewOf, timeLabel } from '@/lib/community';
import { initialsOf, relativeTime } from '@/lib/home';
import type { Conversation, MemberSummary, Message } from '@/lib/types';

const LINE = '#E9EAF0';

const CONTEXT_ICON = {
  direct: 'chatbubble-outline',
  business: 'storefront-outline',
  order: 'receipt-outline',
  campaign: 'megaphone-outline',
} as const;

export function Avatar({
  member,
  size = 48,
  ring,
  badge,
}: {
  member: MemberSummary;
  size?: number;
  ring?: boolean;
  badge?: keyof typeof CONTEXT_ICON;
}) {
  return (
    <View style={ring ? [styles.ring, { borderRadius: size * 0.4 }] : undefined}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.34 }]}>
        <ThemedText style={[styles.avatarText, { fontSize: size * 0.34 }]}>
          {initialsOf(member.full_name, member.email)}
        </ThemedText>
      </View>
      {!!badge && (
        <View style={styles.avatarBadge}>
          <Ionicons name={CONTEXT_ICON[badge]} size={11} color={Brand.royal} />
        </View>
      )}
    </View>
  );
}

/** Horizontal strip of the people you talked to most recently; a gold ring marks unread. */
export function RecentStrip({
  conversations,
  myId,
  onPress,
}: {
  conversations: Conversation[];
  myId: string;
  onPress: (c: Conversation) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {conversations.map((c) => {
        const other = otherParty(c, myId);
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`Recent chat with ${firstName(other)}`}
            onPress={() => onPress(c)}
            style={styles.stripItem}>
            <Avatar member={other} size={56} ring={c.unread_count > 0} />
            <ThemedText style={styles.stripName} numberOfLines={1}>
              {firstName(other)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ContextTag({ conversation }: { conversation: Conversation }) {
  const ctx = contextOf(conversation);
  return (
    <View style={styles.tag}>
      <Ionicons name={CONTEXT_ICON[ctx.kind]} size={12} color={Brand.royal} />
      <ThemedText style={styles.tagText} numberOfLines={1}>
        {ctx.label}
      </ThemedText>
    </View>
  );
}

export function InboxList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export function InboxRow({
  conversation,
  myId,
  now,
  first,
  onPress,
}: {
  conversation: Conversation;
  myId: string;
  now: Date;
  first?: boolean;
  onPress: () => void;
}) {
  const other = otherParty(conversation, myId);
  const name = displayName(other);
  const unread = conversation.unread_count;
  const ctx = contextOf(conversation);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${name}`}
      onPress={onPress}
      style={[styles.row, !first && styles.rowDivider]}>
      <Avatar member={other} badge={ctx.kind} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <ThemedText style={[styles.name, unread > 0 && styles.nameUnread]} numberOfLines={1}>
            {name}
          </ThemedText>
          <ThemedText style={[styles.when, unread > 0 && { color: Brand.royal, fontWeight: '700' }]}>
            {relativeTime(conversation.last_message_at ?? conversation.created_at, now)}
          </ThemedText>
        </View>
        <View style={styles.rowTop}>
          <ThemedText style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
            {previewOf(conversation, myId)}
          </ThemedText>
          {unread > 0 && (
            <View accessibilityLabel={`${unread} unread`} style={styles.badge}>
              <ThemedText style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.ctxText} numberOfLines={1}>
          {ctx.label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function DayDivider({ label }: { label: string }) {
  return (
    <View style={styles.day}>
      <ThemedText style={styles.dayText}>{label}</ThemedText>
    </View>
  );
}

export type SendState = 'sending' | 'failed' | undefined;

export function MessageBubble({
  message,
  mine,
  sender,
  first,
  last,
  state,
  onRetry,
}: {
  message: Message;
  mine: boolean;
  sender?: MemberSummary;
  first: boolean;
  last: boolean;
  state?: SendState;
  onRetry?: () => void;
}) {
  const receipt = state === 'sending' ? 'Sending' : message.read_at ? 'Read' : 'Sent';
  const bubble = (
    <View
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        last && (mine ? styles.tailMine : styles.tailTheirs),
        state === 'failed' && styles.bubbleFailed,
      ]}>
      <ThemedText style={[styles.bubbleText, mine && { color: Brand.white }]}>{message.body}</ThemedText>
    </View>
  );
  return (
    <View style={[styles.bubbleWrap, mine ? styles.wrapMine : styles.wrapTheirs, { marginTop: first ? Spacing.three : 2 }]}>
      {!mine &&
        (last && !!sender ? (
          <View testID="bubble-avatar">
            <Avatar member={sender} size={30} />
          </View>
        ) : (
          <View style={{ width: 30 }} />
        ))}
      <View style={[styles.bubbleCol, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
        {state === 'failed' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Failed to send. Tap to retry" onPress={onRetry}>
            {bubble}
          </Pressable>
        ) : (
          bubble
        )}
        {state === 'failed' ? (
          <ThemedText style={styles.failedText}>Not sent · tap to retry</ThemedText>
        ) : (
          last && (
            <View style={styles.meta}>
              <ThemedText style={styles.bubbleTime}>{timeLabel(message.created_at)}</ThemedText>
              {mine && (
                <View accessibilityLabel={receipt}>
                  <Ionicons
                    name={receipt === 'Sending' ? 'time-outline' : receipt === 'Read' ? 'checkmark-done' : 'checkmark'}
                    size={14}
                    color={receipt === 'Read' ? '#2E9E5B' : '#9AA0AE'}
                  />
                </View>
              )}
            </View>
          )
        )}
      </View>
    </View>
  );
}

export function Composer({
  value,
  onChange,
  busy,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
  onSend: () => void;
}) {
  const disabled = busy || !value.trim();
  return (
    <View style={styles.composer}>
      <View style={styles.pill}>
        <TextInput
          accessibilityLabel="Message"
          value={value}
          onChangeText={onChange}
          placeholder="Write a message"
          placeholderTextColor="#9AA0AE"
          multiline
          maxLength={5000}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onSend}
          style={[styles.send, disabled && { opacity: 0.45 }]}>
          <Ionicons name="arrow-up" size={20} color={Brand.deep} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: Brand.royal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.gold, fontWeight: '800' },
  ring: { padding: 3, borderWidth: 2, borderColor: Brand.gold },
  avatarBadge: {
    position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
  },
  strip: { gap: Spacing.three, paddingRight: Spacing.four },
  stripItem: { alignItems: 'center', gap: 6, width: 64 },
  stripName: { fontSize: 12, fontWeight: '600', color: Brand.ink, maxWidth: 64 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '80%',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E3E8F7',
  },
  tagText: { fontSize: 11, fontWeight: '700', color: Brand.royal, flexShrink: 1 },
  list: { borderRadius: 24, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  rowDivider: { borderTopWidth: 1, borderTopColor: LINE },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: Brand.ink },
  nameUnread: { fontWeight: '800' },
  when: { fontSize: 12, color: Brand.body },
  preview: { flex: 1, fontSize: 13, color: Brand.body },
  previewUnread: { color: Brand.ink, fontWeight: '600' },
  ctxText: { fontSize: 11, fontWeight: '700', color: Brand.royal },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Brand.deep, fontSize: 11, fontWeight: '800' },
  day: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E3E8F7', marginVertical: Spacing.two },
  dayText: { fontSize: 11, fontWeight: '700', color: Brand.royal },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginHorizontal: 4 },
  tailMine: { borderBottomRightRadius: 6 },
  tailTheirs: { borderBottomLeftRadius: 6 },
  bubbleFailed: { opacity: 0.6, borderWidth: 1, borderColor: '#B0382B' },
  failedText: { fontSize: 11, color: '#B0382B', fontWeight: '700', marginHorizontal: 4 },
  wrapMine: { justifyContent: 'flex-end' },
  wrapTheirs: { justifyContent: 'flex-start' },
  bubbleCol: { maxWidth: '78%', gap: 3 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMine: { backgroundColor: Brand.royal },
  bubbleTheirs: { backgroundColor: '#ECEFF7' },
  bubbleText: { fontSize: 15, lineHeight: 21, color: Brand.ink },
  bubbleTime: { fontSize: 10, color: '#9AA0AE', marginHorizontal: 4 },
  composer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, backgroundColor: Brand.paper },
  pill: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: 6, paddingLeft: Spacing.three,
    borderRadius: 30, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE,
    shadowColor: '#0B298E', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  input: { flex: 1, maxHeight: 120, minHeight: 40, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: Brand.ink },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.gold, alignItems: 'center', justifyContent: 'center' },
});
