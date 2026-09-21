import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthPasswordField } from '@/components/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { AuthGate, ErrorText, NoticeText, PrimaryButton } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Session } from '@/lib/types';

const LINE = '#E9EAF0';

function SecurityBody() {
  const { logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ sessions: Session[] }>('/api/v1/auth/sessions/');
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function changePassword() {
    setError(null);
    setNotice(null);
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ detail: string }>('/api/v1/auth/change-password/', {
        old_password: current,
        new_password: next,
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      setNotice(`${res.detail} Please sign in again.`);
      // The backend revokes every token, including this device's.
      await logout();
    } catch (err) {
      setError(errorMessage(err, 'Password change failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={Brand.royal} />
          </Pressable>
          <ThemedText style={styles.topTitle}>Security</ThemedText>
          <View style={styles.back} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.group}>
            <ThemedText style={styles.groupTitle}>Sign-in sessions</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Anything unfamiliar here means someone else may have your password.
            </ThemedText>
            {sessions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No sign-in activity yet.
              </ThemedText>
            ) : (
              <View style={styles.panel}>
                {sessions.slice(0, 5).map((s, i) => (
                  <View key={`${s.device_key}-${s.created_at}-${i}`} style={[styles.sessionRow, i > 0 && styles.divider]}>
                    <View style={styles.sessionIcon}>
                      <Ionicons name="phone-portrait-outline" size={18} color={Brand.royal} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {`Device ${s.device_key ? s.device_key.slice(0, 8) : 'unknown'}`}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {`${s.ip_address ?? 'unknown IP'} · ${new Date(s.created_at).toLocaleString()}`}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.group}>
            <ThemedText style={styles.groupTitle}>Change password</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Changing your password signs out every session, including this one.
            </ThemedText>
            <AuthPasswordField label="Current password" value={current} onChangeText={setCurrent} />
            <AuthPasswordField label="New password" value={next} onChangeText={setNext} />
            <AuthPasswordField label="Confirm new password" value={confirm} onChangeText={setConfirm} />
            <ErrorText message={error} />
            <NoticeText message={notice} />
            <PrimaryButton title={busy ? 'Working…' : 'Change password'} onPress={() => void changePassword()} disabled={busy} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function SecurityScreen() {
  return (
    <AuthGate title="Security" blurb="Sign in to manage your security.">
      <SecurityBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  group: { gap: Spacing.two },
  groupTitle: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  panel: { backgroundColor: Brand.white, borderRadius: 18, borderWidth: 1, borderColor: LINE, paddingHorizontal: Spacing.three },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  divider: { borderTopWidth: 1, borderTopColor: LINE },
  sessionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E3E8F7', alignItems: 'center', justifyContent: 'center' },
});
