import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  NoticeText,
  OutlineButton,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Conversation } from '@/lib/types';

function otherName(c: Conversation, myId: string): string {
  const other = c.initiator.id === myId ? c.other_party : c.initiator;
  return other.full_name || other.email;
}

function contextLine(c: Conversation): string | null {
  if (c.business_name) return c.business_name;
  if (c.campaign_title) return c.campaign_title;
  if (c.order_id) return `Order ${String(c.order_id).slice(0, 8)}`;
  return null;
}

function CommunityBody() {
  const { user } = useAuth();
  const theme = useTheme();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConvos(await api.getList<Conversation>('/api/v1/conversations/'));
    } catch (err) {
      setError(errorMessage(err, 'Could not load conversations.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = convos.find((c) => c.id === openId) ?? null;

  async function send() {
    if (!open || !draft.trim()) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.post(`/api/v1/conversations/${open.id}/messages/`, { body: draft.trim() });
      setDraft('');
      setNotice('Message sent.');
      setConvos(await api.getList<Conversation>('/api/v1/conversations/'));
    } catch (err) {
      setError(errorMessage(err, 'Message failed to send.'));
    } finally {
      setBusy(false);
    }
  }

  async function markRead() {
    if (!open) return;
    try {
      await api.post(`/api/v1/conversations/${open.id}/read/`, {});
      setConvos(await api.getList<Conversation>('/api/v1/conversations/'));
    } catch {
      /* non-fatal */
    }
  }

  return (
    <>
      <ThemedText type="subtitle">Community</ThemedText>
      <ThemedText themeColor="textSecondary">
        Conversations stay attached to the business, order, or campaign they belong to.
      </ThemedText>

      {convos.map((c) => {
        const active = c.id === openId;
        const ctx = contextLine(c);
        return (
          <Pressable key={c.id} onPress={() => setOpenId(active ? null : c.id)}>
            <Card>
              <ThemedText type="smallBold" style={active ? { color: theme.primary } : undefined}>
                {user ? otherName(c, user.id) : c.other_party.email}
                {c.unread_count > 0 ? `  ·  ${c.unread_count} new` : ''}
              </ThemedText>
              {ctx && (
                <ThemedText type="small" themeColor="textSecondary">
                  {ctx}
                </ThemedText>
              )}
              {!!c.last_message_at && (
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(c.last_message_at).toLocaleString()}
                </ThemedText>
              )}
            </Card>
          </Pressable>
        );
      })}
      {convos.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No conversations yet.
        </ThemedText>
      )}

      {open && (
        <Card>
          <ThemedText type="smallBold">Reply</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Message history is not exposed by the API yet — new messages notify the other
            party immediately.
          </ThemedText>
          <Field label="Message" value={draft} onChangeText={setDraft} />
          <ErrorText message={error} />
          <NoticeText message={notice} />
          <PrimaryButton
            title={busy ? 'Sending…' : 'Send message'}
            onPress={() => void send()}
            disabled={busy || !draft.trim()}
          />
          <OutlineButton title="Mark as read" onPress={() => void markRead()} />
        </Card>
      )}
    </>
  );
}

export default function CommunityScreen() {
  return (
    <AuthGate title="Community" blurb="Sign in to message businesses and members.">
      <Screen>
        <CommunityBody />
      </Screen>
    </AuthGate>
  );
}
