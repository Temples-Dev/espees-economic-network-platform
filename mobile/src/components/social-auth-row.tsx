import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';

const PROVIDERS = [
  { name: 'Google', icon: <FontAwesome name="google" size={20} color={Brand.ink} /> },
  { name: 'Apple', icon: <FontAwesome name="apple" size={22} color={Brand.ink} /> },
  { name: 'X', icon: <FontAwesome6 name="x-twitter" size={19} color={Brand.ink} /> },
] as const;

export function SocialAuthRow() {
  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.rule} />
        <ThemedText type="small" themeColor="textSecondary">
          or continue with
        </ThemedText>
        <View style={styles.rule} />
      </View>
      <View style={styles.row}>
        {PROVIDERS.map((p) => (
          <Pressable
            key={p.name}
            accessibilityRole="button"
            accessibilityLabel={`Continue with ${p.name}`}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
            {p.icon}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, paddingTop: Spacing.two },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { flex: 1, height: 1, backgroundColor: '#E3E5EC' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.four },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E3E5EC',
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
