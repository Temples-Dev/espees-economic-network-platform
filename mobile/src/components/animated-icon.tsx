import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Brand, Spacing } from '@/constants/theme';

const EXIT_DURATION = 500;

const exitKeyframe = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  30: { opacity: 1 },
  100: { opacity: 0, transform: [{ scale: 1.06 }], easing: Easing.out(Easing.cubic) },
});

function Wordmark() {
  return (
    <View style={styles.wordmark}>
      <Image
        accessibilityLabel="EENP logo"
        source={require('@/assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Espees Economic Network</Text>
    </View>
  );
}

/** Full-bleed royal splash. Covers the app until the native splash hands over, then fades out. */
export function AnimatedSplashOverlay() {
  const [handedOver, setHandedOver] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  if (!handedOver) {
    return (
      <View
        testID="splash-overlay"
        onLayout={() => {
          SplashScreen.hideAsync().finally(() => setHandedOver(true));
        }}
        style={styles.overlay}>
        <StatusBar style="light" />
        <Wordmark />
      </View>
    );
  }

  return (
    <Animated.View
      entering={exitKeyframe.duration(EXIT_DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      pointerEvents="none"
      style={styles.overlay}>
      <StatusBar style="light" />
      <Wordmark />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.deep,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  wordmark: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  logo: {
    width: 220,
    height: 188,
  },
  tagline: {
    color: Brand.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
