import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BORDER = '#E3E5EC';
const DANGER = '#c0392b';

/** Flat auth screen: bold title with accent word, fields, and a footer pinned to the bottom. */
export function AuthShell({
  title,
  accent,
  subtitle,
  children,
  footer,
}: {
  title: string;
  accent?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.heading}>
              <ThemedText style={styles.title}>
                {title}
                {accent ? <ThemedText style={styles.accent}> {accent}</ThemedText> : null}
              </ThemedText>
              {!!subtitle && (
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                  {subtitle}
                </ThemedText>
              )}
            </View>
            <View style={styles.body}>{children}</View>
            <View style={styles.spacer} />
            {!!footer && <View style={styles.footer}>{footer}</View>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Icon-prefixed input; the label is the placeholder and the accessibility name. */
export function AuthField({
  label,
  icon,
  trailing,
  error,
  ...rest
}: { label: string; icon: IconName; trailing?: ReactNode; error?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <View style={[styles.inputRow, error ? { borderColor: DANGER } : null]}>
        <Ionicons name={icon} size={20} color={Brand.body} />
        <TextInput
          accessibilityLabel={label}
          placeholder={label}
          placeholderTextColor="#9AA0AE"
          style={styles.input}
          {...rest}
        />
        {trailing}
      </View>
      {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

export function AuthPasswordField({
  label,
  ...rest
}: { label: string; error?: string } & TextInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      label={label}
      icon="lock-closed-outline"
      autoCapitalize="none"
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          hitSlop={10}
          onPress={() => setVisible((v) => !v)}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={Brand.body} />
        </Pressable>
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  heading: { gap: Spacing.two },
  title: { color: Brand.ink, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  accent: { color: Brand.royal, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  body: { gap: Spacing.three, marginTop: Spacing.five },
  spacer: { flexGrow: 1, minHeight: Spacing.four },
  footer: { alignItems: 'center', paddingVertical: Spacing.three },
  field: { gap: Spacing.one },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 54,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: Brand.white,
  },
  input: { flex: 1, fontSize: 16, color: Brand.ink, paddingVertical: 0 },
  error: { color: DANGER, fontSize: 12 },
});
