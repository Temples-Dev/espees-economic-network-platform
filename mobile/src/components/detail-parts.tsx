import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cover } from './discover-parts';
import { ThemedText } from './themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import type { CategoryIcon } from '@/lib/discover';
import type { Offering } from '@/lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const LINE = '#E9EAF0';
const TILE = '#E3E8F7';

/** Full-bleed gradient header that runs under the status bar, with a back button and a bottom-aligned title block. */
export function DetailHero({
  seed,
  icon,
  imageUrl,
  height = 300,
  onBack,
  right,
  children,
}: {
  seed: string;
  icon: CategoryIcon | 'cube-outline' | 'construct-outline';
  imageUrl?: string | null;
  height?: number;
  onBack: () => void;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { height, paddingTop: insets.top + Spacing.two }]}>
      <Cover hero seed={seed} icon={icon} imageUrl={imageUrl} style={StyleSheet.absoluteFill} />
      <View style={styles.heroScrim} />
      <View style={styles.heroBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={8}
          style={styles.glassButton}>
          <Ionicons name="chevron-back" size={22} color={Brand.royal} />
        </Pressable>
        {right}
      </View>
      <View style={styles.heroBody}>{children}</View>
    </View>
  );
}

export function GlassChip({ icon, label, label2 }: { icon?: IconName; label: string; label2?: string }) {
  return (
    <View accessibilityLabel={label2} style={styles.glassChip}>
      {!!icon && <Ionicons name={icon} size={13} color={Brand.white} />}
      <ThemedText style={styles.glassChipText} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </ThemedText>
    </View>
  );
}

export function DetailSheet({ children }: { children: ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

export function StatTile({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={Brand.royal} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <ThemedText style={styles.blockTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

export function InfoRow({
  icon,
  title,
  copy,
  last,
}: {
  icon: IconName;
  title: string;
  copy?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={Brand.royal} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText style={styles.infoTitle}>{title}</ThemedText>
        {!!copy && <ThemedText style={styles.infoCopy}>{copy}</ThemedText>}
      </View>
    </View>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

/** Action bar pinned to the bottom of a detail screen. */
export function StickyBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.barWrap} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: Spacing.three + insets.bottom }]}>{children}</View>
    </View>
  );
}

export function OfferingCarousel({
  offerings,
  onPress,
}: {
  offerings: Offering[];
  onPress: (o: Offering) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}>
      {offerings.map((o) => {
        const isService = o.kind === 'service';
        return (
          <Pressable
            key={o.id}
            testID="offering-card"
            accessibilityRole="button"
            accessibilityLabel={o.name}
            onPress={() => onPress(o)}
            style={({ pressed }) => [styles.offeringCard, pressed && { opacity: 0.9 }]}>
            <Cover
              seed={o.business_name || o.name}
              icon={isService ? 'construct-outline' : 'cube-outline'}
              style={styles.offeringCover}>
              <View style={styles.offeringTag}>
                <ThemedText style={styles.offeringTagText}>{isService ? 'Service' : 'Product'}</ThemedText>
              </View>
            </Cover>
            <View style={styles.offeringBody}>
              <ThemedText style={styles.offeringName} numberOfLines={2}>
                {o.name}
              </ThemedText>
              <ThemedText style={styles.offeringPrice}>{`${o.price} ESP`}</ThemedText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const BAR_CLEARANCE = 190;

const styles = StyleSheet.create({
  hero: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: 52,
    overflow: 'hidden',
    backgroundColor: Brand.royal,
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(6,20,80,0.25), rgba(6,20,80,0) 35%, rgba(6,20,80,0.82))',
  },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  glassButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { gap: 6 },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  glassChipText: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: Brand.paper,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.three,
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  statLabel: { fontSize: 12, color: Brand.body },
  block: { gap: Spacing.three },
  blockTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  panel: {
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: Spacing.three,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  infoDivider: { borderBottomWidth: 1, borderBottomColor: LINE },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  infoCopy: { fontSize: 12, color: Brand.body },
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Brand.white,
    borderTopWidth: 1,
    borderColor: LINE,
    shadowColor: '#0B298E',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  carousel: { gap: Spacing.three, paddingRight: Spacing.four },
  offeringCard: {
    width: 200,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  offeringCover: { height: 108, alignItems: 'center', justifyContent: 'center' },
  offeringTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
  },
  offeringTagText: {
    color: Brand.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  offeringBody: { padding: Spacing.three, gap: 4 },
  offeringName: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: Brand.ink, minHeight: 38 },
  offeringPrice: { fontSize: 14, fontWeight: '800', color: Brand.royal },
});
