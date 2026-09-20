import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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

export function Field({ label, style, ...rest }: { label: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: theme.textSecondary,
          },
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        {...rest}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  danger,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: danger ? '#c0392b' : theme.primary, opacity: disabled ? 0.6 : 1 },
      ]}>
      <ThemedText style={styles.buttonLabel}>{title}</ThemedText>
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
    <Pressable onPress={onPress} style={[styles.button, styles.outline, { borderColor: c }]}>
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
    paddingBottom: Spacing.six,
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
  error: {
    color: '#c0392b',
  },
  notice: {
    color: '#1e7e34',
  },
});
