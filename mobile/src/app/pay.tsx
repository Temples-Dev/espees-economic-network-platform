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
  PrimaryButton,
  Screen,
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
      setNotice(`Order placed: ${order.total} Espees · ${order.status}.`);
      setSelectedId(null);
      setQuantity('1');
      const mine = await api.getList<Order>('/api/v1/orders/');
      setOrders(mine);
    } catch (err) {
      setError(errorMessage(err, 'Order failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ThemedText type="subtitle">Pay</ThemedText>
      <ThemedText themeColor="textSecondary">
        Select an offering, review the total, and confirm. Payment goes to the business as an
        order.
      </ThemedText>

      <ThemedText type="smallBold">Offerings</ThemedText>
      {offerings.slice(0, 15).map((o) => {
        const active = o.id === selectedId;
        return (
          <Pressable key={o.id} onPress={() => setSelectedId(active ? null : o.id)}>
            <Card>
              <ThemedText type="smallBold" style={active ? { color: theme.primary } : undefined}>
                {active ? '✓ ' : ''}{o.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {o.business_name} · {o.price} Espees
              </ThemedText>
            </Card>
          </Pressable>
        );
      })}
      {offerings.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No active offerings right now.
        </ThemedText>
      )}

      <Field
        label="Quantity"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
      {selected && (
        <Card>
          <ThemedText type="smallBold">Review</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selected.name} × {qty} = {total.toFixed(2)} Espees to {selected.business_name}
          </ThemedText>
        </Card>
      )}
      <ErrorText message={error} />
      <NoticeText message={notice} />
      <PrimaryButton
        title={busy ? 'Placing order…' : 'Confirm payment'}
        onPress={() => void submit()}
        disabled={busy || !selected}
      />

      <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
        My orders
      </ThemedText>
      {orders.slice(0, 10).map((o) => (
        <Card key={o.id}>
          <ThemedText type="smallBold">
            {o.total} Espees · {o.status}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.business_name} · {new Date(o.created_at).toLocaleString()}
          </ThemedText>
        </Card>
      ))}
      {orders.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No orders yet.
        </ThemedText>
      )}
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
