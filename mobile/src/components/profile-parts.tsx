import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { initialsOf } from '@/lib/home';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ProfileHeader({
  fullName,
  email,
  onEdit,
}: {
  fullName: string;
  email: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.ring}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{initialsOf(fullName, email)}</ThemedText>
        </View>
      </View>
      <View style={styles.headerBody}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {fullName || email}
        </ThemedText>
        <ThemedText style={styles.email} numberOfLines={1}>
          {email}
        </ThemedText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onEdit} style={styles.edit}>
        <Ionicons name="create-outline" size={20} color={Brand.white} />
      </Pressable>
    </View>
  );
}

/** One setting on its own rounded card: coloured icon square, label, then a chevron, value or control. */
export function SettingRow({
  icon,
  tint,
  label,
  value,
  onPress,
  a11y,
  chevron,
  danger,
  control,
  note,
}: {
  icon: IconName;
  tint: string;
  label: string;
  value?: string;
  onPress?: () => void;
  a11y?: string;
  chevron?: boolean;
  danger?: boolean;
  control?: ReactNode;
  note?: ReactNode;
}) {
  const body = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={Brand.white} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText style={[styles.rowLabel, danger && { color: '#c0392b' }]}>{label}</ThemedText>
        {!!value && (
          <ThemedText style={styles.rowValue} numberOfLines={1}>
            {value}
          </ThemedText>
        )}
      </View>
      {control}
      {chevron && <Ionicons name="chevron-forward" size={18} color="#9AA0AE" />}
    </>
  );
  return (
    <View style={styles.rowWrap}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y ?? label}
          onPress={onPress}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
          {body}
        </Pressable>
      ) : (
        <View style={styles.row}>{body}</View>
      )}
      {note}
    </View>
  );
}

export function NotificationSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      accessibilityLabel="Notifications toggle"
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#D9DCE6', true: Brand.royal }}
      thumbColor={Brand.white}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  ring: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: Brand.gold },
  avatar: { width: 60, height: 60, borderRadius: 24, backgroundColor: Brand.royal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.gold, fontSize: 22, fontWeight: '800' },
  headerBody: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  email: { fontSize: 13, color: Brand.body },
  edit: { width: 46, height: 46, borderRadius: 23, backgroundColor: Brand.royal, alignItems: 'center', justifyContent: 'center' },
  rowWrap: { gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, height: 64,
    borderRadius: 20, backgroundColor: Brand.white, borderWidth: 1, borderColor: '#E9EAF0',
  },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Brand.ink },
  rowValue: { fontSize: 12, color: Brand.body },
});
