/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * EENP brand tokens (from mobile/design-tokens.txt).
 * Royal Blue + Champagne Gold + Charcoal + Off-White.
 * These are scheme-independent: identical in light and dark.
 */
export const Brand = {
  royal: '#18379C',
  deep: '#0B298E',
  gold: '#DABF79',
  bronze: '#836B58',
  ink: '#313131',
  brandText: '#293D48',
  body: '#676767',
  paper: '#F6F6F6',
  white: '#FFFFFF',
} as const;

/**
 * Single light palette. Dark mode is intentionally out of scope until the
 * light design is finalized — every consumer reads these values directly
 * with no scheme branching.
 */
export const Colors = {
  text: Brand.ink,
  background: Brand.paper,
  backgroundElement: Brand.white,
  backgroundSelected: '#E3E8F7',
  textSecondary: Brand.body,
  primary: Brand.royal,
  primaryDeep: Brand.deep,
  gold: Brand.gold,
  bronze: Brand.bronze,
  brandText: Brand.brandText,
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
