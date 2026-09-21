import { useRouter } from 'expo-router';
import { useRef, useState, type ReactElement } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BusinessesIllustration,
  CommunityIllustration,
  PaymentsIllustration,
} from '@/components/illustrations';
import { ThemedText } from '@/components/themed-text';
import { OutlineButton, PrimaryButton } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

type Slide = { eyebrow: string; title: string; copy: string; art: ReactElement };

const SLIDES: Slide[] = [
  {
    eyebrow: 'Discover & build',
    title: 'Businesses',
    copy: 'Find trusted member businesses, products and suppliers, or start and grow your own with customers already on the network.',
    art: <BusinessesIllustration />,
  },
  {
    eyebrow: 'Send & receive',
    title: 'Payments',
    copy: 'Pay people, businesses and campaigns in Espees. Fund your wallet and withdraw through your local payment options.',
    art: <PaymentsIllustration />,
  },
  {
    eyebrow: 'Connect & fund',
    title: 'Community',
    copy: 'Talk with the people you trade with, and back community projects that create new economic activity.',
    art: <CommunityIllustration />,
  },
];

const LAST = SLIDES.length - 1;

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === LAST;

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(LAST, next));
    setIndex(clamped);
    pager.current?.scrollTo({ x: clamped * width, animated: true });
  }

  function onSwipeEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(LAST, page)));
  }

  return (
    <View style={styles.root}>
      {/* Blue page: light icons. Members never see this after signing in. */}
      <StatusBar style="light" />
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Image
            accessibilityLabel="EENP logo"
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {!isLast && (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => goTo(LAST)} hitSlop={12}>
              <ThemedText style={styles.skip}>Skip</ThemedText>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={pager}
          testID="welcome-pager"
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSwipeEnd}
          style={styles.pager}>
          {SLIDES.map((s) => (
            <View key={s.title} style={[styles.slide, { width }]}>
              <View style={styles.art}>{s.art}</View>
              <View style={styles.copyBlock}>
                <ThemedText style={styles.eyebrow}>{s.eyebrow}</ThemedText>
                <ThemedText style={styles.title}>{s.title}</ThemedText>
                <ThemedText style={styles.copy}>{s.copy}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sheet}>
          <View accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`} style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.actions}>
            {isLast ? (
              <>
                <PrimaryButton tone="gold" title="Get started" onPress={() => router.push('/register')} />
                <OutlineButton title="Sign in" onPress={() => router.push('/sign-in')} />
              </>
            ) : (
              <PrimaryButton tone="gold" title="Next" onPress={() => goTo(index + 1)} />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.deep,
    alignItems: 'center',
    overflow: 'hidden',
  },
  orbLarge: {
    position: 'absolute',
    top: -140,
    right: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: Brand.royal,
    opacity: 0.55,
  },
  orbSmall: {
    position: 'absolute',
    top: 300,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Brand.gold,
    opacity: 0.1,
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  logo: { width: 76, height: 65 },
  skip: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-evenly',
  },
  art: { alignItems: 'center' },
  copyBlock: { gap: Spacing.two },
  eyebrow: {
    color: Brand.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: Brand.white,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
  },
  copy: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 23,
  },
  sheet: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D5D9E6',
  },
  dotActive: {
    width: 26,
    backgroundColor: Brand.gold,
  },
  actions: {
    minHeight: 112,
    gap: Spacing.three,
  },
});
