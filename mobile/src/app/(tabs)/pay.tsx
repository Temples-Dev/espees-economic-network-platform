import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  ListCard,
  NoticeText,
  PrimaryButton,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import type { Offering, Order } from '@/lib/types';

function PayBody() {
  const theme = useTheme();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, o] = await Promise.all([
        api.getList<Offering>('/api/v1/products/'),
        api.getList<Offering>('/api/v1/services/'),
        api.getList<Order>('/api/v1/orders/'),
      ]);
      setOfferings([...p, ...s].filter((x) => x.is_active));
      setOrders(o);
    } catch (err) {
      setError(errorMessage(err, 'Could not load offerings.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selected = offerings.find((o) => o.id === selectedId) ?? null;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const total = selected ? (parseFloat(selected.price) || 0) * qty : 0;

  async function submit() {
    if (!selected) {
      setError('Choose an offering first.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const order = await api.post<Order>('/api/v1/orders/', {
        business: selected.business,
        items: [{ offering: selected.id, quantity: qty }],
      });
      setNotice(`Payment confirmed: ${order.total} Espees · ${order.status}.`);
      setSelectedId(null);
      setQuantity('1');
      setOrders(await api.getList<Order>('/api/v1/orders/'));
    } catch (err) {
      setError(errorMessage(err, 'Payment failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ThemedText type="subtitle">Pay</ThemedText>
      <ThemedText themeColor="textSecondary">
        Choose an offering, review the total, and confirm.
      </ThemedText>

      <SectionHeader title="Offerings" />
      {offerings.slice(0, 12).map((o) => {
        const active = o.id === selectedId;
        return (
          <Pressable key={o.id} onPress={() => setSelectedId(active ? null : o.id)}>
            <ThemedView
              type="backgroundElement"
              style={{
                borderWidth: active ? 2 : 0,
                borderColor: theme.primary,
                borderRadius: Spacing.three,
              }}>
              <ListCard
                title={`${active ? '✓ ' : ''}${o.name}`}
                pill={o.kind}
                meta={[`${o.business_name} · ${o.price} Espees`]}
              />
            </ThemedView>
          </Pressable>
        );
      })}
      {offerings.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No active offerings right now.
        </ThemedText>
      )}

      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <Field label="Quantity" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        </View>
        <View style={{ flex: 2, justifyContent: 'flex-end' }}>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Total
            </ThemedText>
            <ThemedText type="smallBold">{total.toFixed(2)} Espees</ThemedText>
          </Card>
        </View>
      </View>

      <ErrorText message={error} />
      <NoticeText message={notice} />
      <PrimaryButton
        tone="gold"
        title={busy ? 'Processing…' : 'Confirm payment'}
        onPress={() => void submit()}
        disabled={busy || !selected}
      />

      <SectionHeader title={`Recent payments (${orders.length})`} />
      {orders.slice(0, 5).map((o) => (
        <ListCard
          key={o.id}
          title={`${o.total} Espees · ${o.status}`}
          meta={[`${o.business_name} · ${new Date(o.created_at).toLocaleDateString()}`]}
        />
      ))}
    </>
  );
}

export default function PayScreen() {
  return (
    <AuthGate title="Pay" blurb="Sign in to pay businesses in Espees.">
      <Screen>
        <PayBody />
      </Screen>
    </AuthGate>
  );
}
