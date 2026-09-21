import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/** Scrollable screen shell: centers content up to MaxContentWidth. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function Loading() {
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator />
    </ThemedView>
  );
}

/** Gate for authenticated routes: spinner while restoring, sign-in prompt otherwise. */
export function AuthGate({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {blurb ?? 'Sign in to continue.'}
          </ThemedText>
          <Link href="/sign-in" asChild>
            <Pressable>
              <ThemedText type="linkPrimary">Go to sign-in</ThemedText>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }
  return <>{children}</>;
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {children}
    </ThemedView>
  );
}

export function Field({
  label,
  error,
  style,
  ...rest
}: { label: string; error?: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: error ? '#c0392b' : theme.textSecondary,
          },
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        {...rest}
      />
      {!!error && <ThemedText style={styles.fieldError}>{error}</ThemedText>}
    </View>
  );
}

/** Three-segment password strength bar. */
export function StrengthMeter({ strength }: { strength: 'weak' | 'fair' | 'strong' }) {
  const filled = strength === 'weak' ? 1 : strength === 'fair' ? 2 : 3;
  const color = strength === 'weak' ? '#c0392b' : strength === 'fair' ? Brand.gold : '#1e7e34';
  return (
    <View style={styles.meterWrap}>
      <View style={styles.meter}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.meterSeg, { backgroundColor: n <= filled ? color : '#E3E5EC' }]} />
        ))}
      </View>
      <ThemedText type="small" style={{ color }}>
        {strength === 'weak' ? 'Weak' : strength === 'fair' ? 'Fair' : 'Strong'}
      </ThemedText>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  danger,
  tone,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  tone?: 'royal' | 'gold';
}) {
  const theme = useTheme();
  const gold = tone === 'gold';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        gold && styles.goldButton,
        {
          backgroundColor: danger ? '#c0392b' : gold ? Brand.gold : theme.primary,
          opacity: disabled ? 0.6 : 1,
        },
      ]}>
      <ThemedText style={[styles.buttonLabel, gold && styles.goldButtonLabel]}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

export function OutlineButton({
  title,
  onPress,
  color,
}: {
  title: string;
  onPress: () => void;
  color?: string;
}) {
  const theme = useTheme();
  const c = color ?? theme.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, styles.outline, { borderColor: c }]}>
      <ThemedText style={[styles.buttonLabel, { color: c }]}>{title}</ThemedText>
    </Pressable>
  );
}

export function LinkButton({ href, title }: { href: Href; title: string }) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable style={[styles.button, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.buttonLabel}>{title}</ThemedText>
      </Pressable>
    </Link>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <ThemedText style={styles.error}>{message}</ThemedText>;
}

export function NoticeText({ message }: { message: string | null }) {
  if (!message) return null;
  return <ThemedText style={styles.notice}>{message}</ThemedText>;
}

/* ------------------------------------------------------------------ */
/* Inspiration-grade primitives (royal heroes, gold CTAs, white cards) */
/* ------------------------------------------------------------------ */

/** Royal-blue hero block: white headline, gold accent, supporting copy, gold CTA. */
export function Hero({
  title,
  accent,
  copy,
  cta,
  onCta,
}: {
  title: string;
  accent?: string;
  copy?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <View style={heroStyles.hero}>
      <ThemedText style={heroStyles.title}>
        {title}
        {accent ? <ThemedText style={heroStyles.accent}> {accent}</ThemedText> : null}
      </ThemedText>
      {!!copy && <ThemedText style={heroStyles.copy}>{copy}</ThemedText>}
      {!!cta && (
        <Pressable
          onPress={onCta}
          style={({ pressed }) => [heroStyles.cta, pressed && { opacity: 0.85 }]}>
          <ThemedText style={heroStyles.ctaLabel}>{cta}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

/** Section header with an optional "View All" link on the right. */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={heroStyles.sectionRow}>
      <ThemedText type="smallBold" style={heroStyles.sectionTitle}>
        {title}
      </ThemedText>
      {!!action && (
        <Pressable onPress={onAction}>
          <ThemedText type="small" style={heroStyles.sectionAction}>
            {action} →
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

/** Filter chips: active chip is solid royal, the rest are neutral pills. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={heroStyles.chipRow}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[heroStyles.chip, active ? heroStyles.chipActive : heroStyles.chipIdle]}>
            <ThemedText
              type="small"
              style={active ? heroStyles.chipActiveLabel : heroStyles.chipIdleLabel}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 4-up quick-action row: tinted tile with a glyph plus a label. */
export function QuickActions({
  actions,
}: {
  actions: ReadonlyArray<{ label: string; glyph: string; tint?: string; onPress: () => void }>;
}) {
  return (
    <View style={heroStyles.quickRow}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} style={heroStyles.quickItem}>
          <View style={[heroStyles.quickTile, { backgroundColor: a.tint ?? '#E3E8F7' }]}>
            <ThemedText style={heroStyles.quickGlyph}>{a.glyph}</ThemedText>
          </View>
          <ThemedText type="small" style={heroStyles.quickLabel}>
            {a.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

/** White list card: left tile (initials or date), title, meta lines, chevron. */
export function ListCard({
  title,
  meta,
  tile,
  date,
  pill,
  onPress,
}: {
  title: string;
  meta?: string[];
  tile?: string;
  date?: { day: string; month: string };
  pill?: string;
  onPress?: () => void;
}) {
  const body = (
    <ThemedView type="backgroundElement" style={heroStyles.listCard}>
      {date ? (
        <View style={heroStyles.dateBadge}>
          <ThemedText style={heroStyles.dateDay}>{date.day}</ThemedText>
          <ThemedText style={heroStyles.dateMonth}>{date.month}</ThemedText>
        </View>
      ) : (
        <View style={heroStyles.tile}>
          <ThemedText style={heroStyles.tileLabel}>{tile ?? title.slice(0, 1)}</ThemedText>
        </View>
      )}
      <View style={heroStyles.listBody}>
        {!!pill && (
          <View style={heroStyles.pill}>
            <ThemedText style={heroStyles.pillLabel}>{pill}</ThemedText>
          </View>
        )}
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        {(meta ?? []).map((m) => (
          <ThemedText key={m} type="small" themeColor="textSecondary" numberOfLines={1}>
            {m}
          </ThemedText>
        ))}
      </View>
      {!!onPress && <ThemedText style={heroStyles.chevron}>›</ThemedText>}
    </ThemedView>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}

/** Profile-style row: icon tile, label, chevron. */
export function SettingsRow({
  label,
  glyph,
  onPress,
  danger,
}: {
  label: string;
  glyph: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={heroStyles.settingsRow}>
        <View style={heroStyles.settingsTile}>
          <ThemedText style={[heroStyles.settingsGlyph, danger && { color: '#c0392b' }]}>
            {glyph}
          </ThemedText>
        </View>
        <ThemedText style={[heroStyles.settingsLabel, danger && { color: '#c0392b' }]}>
          {label}
        </ThemedText>
        <ThemedText style={heroStyles.chevron}>›</ThemedText>
      </View>
    </Pressable>
  );
}

const heroStyles = StyleSheet.create({
  hero: {
    backgroundColor: Brand.royal,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  } as ViewStyle,
  title: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  } as TextStyle,
  accent: {
    color: Brand.gold,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  } as TextStyle,
  copy: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
  cta: {
    backgroundColor: Brand.gold,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  } as ViewStyle,
  ctaLabel: {
    color: Brand.deep,
    fontWeight: '700',
    fontSize: 14,
  } as TextStyle,
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 17,
  } as TextStyle,
  sectionAction: {
    color: Brand.royal,
    fontWeight: '600',
  } as TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  } as ViewStyle,
  chip: {
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  } as ViewStyle,
  chipActive: {
    backgroundColor: Brand.royal,
  } as ViewStyle,
  chipIdle: {
    backgroundColor: '#E9EAF0',
  } as ViewStyle,
  chipActiveLabel: {
    color: '#ffffff',
    fontWeight: '600',
  } as TextStyle,
  chipIdleLabel: {
    color: Brand.ink,
  } as TextStyle,
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  } as ViewStyle,
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  } as ViewStyle,
  quickTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  quickGlyph: {
    color: Brand.royal,
    fontSize: 22,
    fontWeight: '700',
  } as TextStyle,
  quickLabel: {
    fontSize: 12,
    textAlign: 'center',
  } as TextStyle,
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  } as ViewStyle,
  tile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E3E8F7',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tileLabel: {
    color: Brand.royal,
    fontSize: 20,
    fontWeight: '700',
  } as TextStyle,
  dateBadge: {
    width: 52,
    paddingVertical: Spacing.one,
    borderRadius: 14,
    backgroundColor: Brand.royal,
    alignItems: 'center',
  } as ViewStyle,
  dateDay: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  } as TextStyle,
  dateMonth: {
    color: Brand.gold,
    fontSize: 11,
    fontWeight: '700',
  } as TextStyle,
  listBody: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3E8F7',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  } as ViewStyle,
  pillLabel: {
    color: Brand.royal,
    fontSize: 11,
    fontWeight: '700',
  } as TextStyle,
  chevron: {
    color: '#9AA0AE',
    fontSize: 22,
    fontWeight: '600',
  } as TextStyle,
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  } as ViewStyle,
  settingsTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF1F9',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  settingsGlyph: {
    color: Brand.royal,
    fontSize: 18,
    fontWeight: '700',
  } as TextStyle,
  settingsLabel: {
    flex: 1,
    fontSize: 15,
  } as TextStyle,
});


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: TabBar.clearance,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gate: {
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
  },
  outline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  goldButton: {
    borderRadius: 999,
  },
  goldButtonLabel: {
    color: Brand.deep,
  },
  error: {
    color: '#c0392b',
  },
  fieldError: {
    color: '#c0392b',
    fontSize: 12,
  },
  meterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meter: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  meterSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  notice: {
    color: '#1e7e34',
  },
});
