import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Composer, ContextTag, DayDivider, MessageBubble, type SendState } from '@/components/community-parts';
import { Skeleton } from '@/components/home-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { displayName, groupByDay, groupRuns, otherParty } from '@/lib/community';
import type { ConversationDetail, Message } from '@/lib/types';

const POLL_MS = 8000;

function ConversationBody() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [local, setLocal] = useState<Record<string, { state: SendState; body: string }>>({});
  const localCount = useRef(0);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<ConversationDetail>(`/api/v1/conversations/${id}/`);
      setDetail(d);
      setMessages(d.messages);
      if (d.messages.some((m) => m.sender !== user?.id && !m.read_at)) {
        await api.post(`/api/v1/conversations/${id}/read/`, {}).catch(() => undefined);
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load this conversation.'));
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Poll for replies while the screen is open; the API has no push channel yet.
  useEffect(() => {
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function deliver(tempId: string, body: string) {
    setLocal((l) => ({ ...l, [tempId]: { state: 'sending', body } }));
    setError(null);
    try {
      const sent = await api.post<Message>(`/api/v1/conversations/${id}/messages/`, { body });
      setMessages((m) => m.map((x) => (x.id === tempId ? sent : x)));
      setLocal(({ [tempId]: _done, ...rest }) => rest);
    } catch (err) {
      setLocal((l) => ({ ...l, [tempId]: { state: 'failed', body } }));
      setError(errorMessage(err, 'Message failed to send.'));
    }
  }

  function send() {
    const body = draft.trim();
    if (!body || !user) return;
    const tempId = `local-${++localCount.current}`;
    const temp: Message = {
      id: tempId, sender: user.id, sender_email: user.email, sender_full_name: user.full_name,
      body, read_at: null, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, temp]);
    setDraft('');
    void deliver(tempId, body);
  }

  if (!user) return null;
  const other = detail ? otherParty(detail, user.id) : null;
  const groups = groupByDay(messages, new Date());

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={Brand.royal} />
          </Pressable>
          {other && detail && (
            <>
              <Avatar member={other} size={40} />
              <View style={{ flex: 1, gap: 3 }}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {displayName(other)}
                </ThemedText>
                <ContextTag conversation={detail} />
              </View>
            </>
          )}
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            ref={scroller}
            onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.thread}>
            {!detail && !error && <Skeleton rows={4} />}
            {detail && messages.length === 0 && (
              <ThemedText style={styles.empty}>No messages yet. Say hello.</ThemedText>
            )}
            {groups.map((g) => (
              <View key={g.label}>
                <DayDivider label={g.label} />
                {groupRuns(g.messages, user.id).map((r) => (
                  <MessageBubble
                    key={r.message.id}
                    message={r.message}
                    mine={r.mine}
                    sender={other ?? undefined}
                    first={r.first}
                    last={r.last}
                    state={local[r.message.id]?.state}
                    onRetry={() => void deliver(r.message.id, local[r.message.id]?.body ?? r.message.body)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
          <Composer value={draft} onChange={setDraft} busy={false} onSend={send} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default function ConversationScreen() {
  return (
    <AuthGate title="Conversation" blurb="Sign in to read your messages.">
      <ConversationBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2, backgroundColor: Brand.white, borderBottomWidth: 1, borderBottomColor: '#E9EAF0',
  },
  back: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.paper, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  thread: { padding: Spacing.three, flexGrow: 1 },
  empty: { textAlign: 'center', color: Brand.body, marginTop: Spacing.five },
  error: { color: '#B0382B', fontSize: 13, fontWeight: '600', paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
