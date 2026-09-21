import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { campaignProgress } from '@/lib/home';
import { categoryIcon, coverIndex, type CategoryIcon } from '@/lib/discover';
import type { Business, Campaign, Category, Offering } from '@/lib/types';

const LINE = '#E9EAF0';
const TILE = '#E3E8F7';

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={20} color={Brand.body} />
      <TextInput
        accessibilityLabel="Search"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA0AE"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={20} color="#9AA0AE" />
        </Pressable>
      )}
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function SegmentTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string; icon: IconName }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.segments}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Ionicons name={o.icon} size={22} color={active ? Brand.gold : Brand.royal} />
            <ThemedText
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.segmentText, active && styles.segmentTextActive]}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const COVERS = [
  'linear-gradient(135deg, #2246B8, #0B298E)',
  'linear-gradient(135deg, #836B58, #5C4A3C)',
  'linear-gradient(135deg, #293D48, #16232B)',
  'linear-gradient(135deg, #C9A85B, #8F7440)',
];

/** Brand-gradient stand-in for a photo: deterministic colour per name, with a category glyph. */
export function Cover({
  seed,
  icon,
  hero,
  imageUrl,
  style,
  children,
}: {
  seed: string;
  icon: CategoryIcon | 'cube-outline' | 'construct-outline';
  hero?: boolean;
  /** A real photo from the API; the gradient and glyph show when it is missing. */
  imageUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        styles.cover,
        { experimental_backgroundImage: COVERS[coverIndex(seed, COVERS.length)] },
        style,
      ]}>
      {imageUrl ? (
        <Image
          testID="cover-image"
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={150}
          style={StyleSheet.absoluteFill}
        />
      ) : hero ? (
        <>
          <View style={styles.coverOrb} />
          <Ionicons name={icon} size={128} color="rgba(255,255,255,0.14)" style={styles.coverGlyph} />
        </>
      ) : (
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.92)" />
      )}
      {children}
    </View>
  );
}

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (slug: string | null) => void;
}) {
  const chips: { key: string; slug: string | null; label: string; name: string }[] = [
    { key: 'all', slug: null, label: 'All', name: 'All categories' },
    ...categories.map((c) => ({ key: c.id, slug: c.slug, label: c.name, name: c.name })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}>
      {chips.map((c) => {
        const active = c.slug === value;
        return (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(c.slug)}
            style={[styles.chip, active && styles.chipActive]}>
            <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function RatingLine({ business }: { business: Business }) {
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={13} color={Brand.gold} />
      <ThemedText style={styles.rating}>
        {business.average_rating == null ? 'New' : business.average_rating.toFixed(1)}
      </ThemedText>
      {business.review_count > 0 && (
        <ThemedText style={styles.sub}>{`(${business.review_count})`}</ThemedText>
      )}
    </View>
  );
}

function VerifiedTick({ business, color }: { business: Business; color: string }) {
  if (business.verification_status !== 'verified') return null;
  return (
    <View accessibilityLabel="Verified">
      <Ionicons name="checkmark-circle" size={16} color={color} />
    </View>
  );
}

export function BusinessResultCard({ business, onPress }: { business: Business; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={business.name}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <Cover seed={business.name} icon={categoryIcon(business.category)} imageUrl={business.logo ?? business.cover_image} style={styles.thumb} />
      <View style={styles.body}>
        {!!business.category && (
          <View accessibilityLabel={`Category ${business.category}`} style={styles.tag}>
            <ThemedText style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
              {business.category}
            </ThemedText>
          </View>
        )}
        <View style={styles.nameRow}>
          <ThemedText style={styles.name} numberOfLines={2}>
            {business.name}
          </ThemedText>
          <VerifiedTick business={business} color={Brand.royal} />
        </View>
        <View style={styles.metaRow}>
          {!!business.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Brand.body} />
              <ThemedText style={styles.sub} numberOfLines={1}>
                {business.location}
              </ThemedText>
            </View>
          )}
          <RatingLine business={business} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9AA0AE" />
    </Pressable>
  );
}

const FEATURED_W = 288;

export function FeaturedCarousel({
  businesses,
  onPress,
}: {
  businesses: Business[];
  onPress: (b: Business) => void;
}) {
  const [index, setIndex] = useState(0);
  const step = FEATURED_W + Spacing.three;

  function onEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / step);
    setIndex(Math.max(0, Math.min(businesses.length - 1, i)));
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={styles.featuredRow}>
        {businesses.map((b) => (
          <Pressable
            key={b.id}
            testID="featured-card"
            accessibilityRole="button"
            accessibilityLabel={b.name}
            onPress={() => onPress(b)}
            style={({ pressed }) => [styles.featured, pressed && { opacity: 0.92 }]}>
            <Cover
              hero
              seed={b.name}
              icon={categoryIcon(b.category)}
              imageUrl={b.cover_image ?? b.logo}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.featuredTop}>
              {b.category ? (
                <View accessibilityLabel={`Category ${b.category}`} style={styles.glassTag}>
                  <ThemedText style={styles.glassTagText} numberOfLines={1} ellipsizeMode="tail">
                    {b.category}
                  </ThemedText>
                </View>
              ) : (
                <View />
              )}
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color={Brand.gold} />
                <ThemedText style={styles.ratingChipText}>
                  {b.average_rating == null ? 'New' : b.average_rating.toFixed(1)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.scrim} />
            <View style={styles.featuredBottom}>
              <View style={styles.nameRow}>
                <ThemedText style={styles.featuredName} numberOfLines={1}>
                  {b.name}
                </ThemedText>
                <VerifiedTick business={b} color={Brand.gold} />
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                <ThemedText style={styles.featuredSub} numberOfLines={1}>
                  {b.location}
                </ThemedText>
                {b.review_count > 0 && (
                  <ThemedText style={styles.featuredSub}>{`· ${b.review_count} reviews`}</ThemedText>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {businesses.length > 1 && (
        <View
          accessibilityLabel={`Featured ${index + 1} of ${businesses.length}`}
          style={styles.dots}>
          {businesses.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

export function OfferingList({
  offerings,
  onPress,
  showBusiness = true,
}: {
  offerings: Offering[];
  onPress: (o: Offering) => void;
  showBusiness?: boolean;
}) {
  return (
    <View style={styles.list}>
      {offerings.map((o, i) => {
        const isService = o.kind === 'service';
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={o.name}
            onPress={() => onPress(o)}
            style={[styles.listRow, i > 0 && styles.listDivider]}>
            <Cover
              seed={o.business_name || o.name}
              icon={isService ? 'construct-outline' : 'cube-outline'}
              imageUrl={o.image}
              style={styles.listThumb}
            />
            <View style={styles.body}>
              {showBusiness && (
                <ThemedText style={styles.eyebrow} numberOfLines={1}>
                  {o.business_name}
                </ThemedText>
              )}
              <ThemedText style={styles.listName} numberOfLines={2}>
                {o.name}
              </ThemedText>
              <View style={styles.listMeta}>
                <View style={styles.tag}>
                  <ThemedText style={styles.tagText}>{isService ? 'Service' : 'Product'}</ThemedText>
                </View>
                <ThemedText style={styles.price}>{`${o.price} ESP`}</ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9AA0AE" />
          </Pressable>
        );
      })}
    </View>
  );
}

export function CampaignHeroCard({ campaign }: { campaign: Campaign }) {
  const percent = Math.round(campaignProgress(campaign) * 100);
  const count = campaign.contribution_count;
  return (
    <View style={styles.campaign}>
      <View style={styles.coverOrb} />
      <View style={styles.campaignTop}>
        <View style={styles.glassTag}>
          <ThemedText style={styles.glassTagText}>Campaign</ThemedText>
        </View>
        {!!campaign.status && (
          <ThemedText style={styles.campaignStatus}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </ThemedText>
        )}
      </View>
      <ThemedText style={styles.campaignTitle} numberOfLines={2}>
        {campaign.title}
      </ThemedText>
      {!!campaign.description && (
        <ThemedText style={styles.campaignCopy} numberOfLines={2}>
          {campaign.description}
        </ThemedText>
      )}
      <View style={styles.campaignTrack}>
        <View style={[styles.campaignFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.campaignFoot}>
        <ThemedText style={styles.campaignFunded}>{`${percent}% funded`}</ThemedText>
        <ThemedText style={styles.campaignCopy}>
          {`${campaign.raised_espees ?? 0} of ${campaign.goal_espees} ESP`}
        </ThemedText>
      </View>
      <View style={styles.people}>
        <Ionicons name="people-outline" size={15} color="rgba(255,255,255,0.8)" />
        <ThemedText style={styles.campaignCopy}>
          {`${count} ${count === 1 ? 'contribution' : 'contributions'}`}
        </ThemedText>
      </View>
    </View>
  );
}

export function StateMessage({
  icon,
  title,
  action,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={26} color={Brand.royal} />
      </View>
      <ThemedText style={styles.stateTitle}>{title}</ThemedText>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.stateButton}>
          <ThemedText style={styles.stateButtonText}>{action.label}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: 26,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  searchInput: { flex: 1, fontSize: 15, color: Brand.ink, paddingVertical: 0 },
  segments: { flexDirection: 'row', gap: Spacing.two },
  segment: {
    flex: 1,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  segmentActive: {
    backgroundColor: Brand.royal,
    borderColor: Brand.royal,
    shadowColor: '#0B298E',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  segmentText: { fontSize: 12, fontWeight: '700', color: Brand.ink },
  segmentTextActive: { color: Brand.white },
  chips: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: {
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: '#ECEEF4',
  },
  chipActive: { backgroundColor: Brand.royal },
  chipText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  chipTextActive: { color: Brand.white },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Brand.royal,
  },
  coverOrb: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverGlyph: { position: 'absolute', right: -14, bottom: -18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 22,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  thumb: { width: 72, height: 72, borderRadius: 18 },
  body: { flex: 1, gap: 4 },
  cardEnd: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  name: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 12, color: Brand.body },
  locationRow: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  tag: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: TILE,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  tagText: {
    color: Brand.royal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  featuredRow: { gap: Spacing.three, paddingRight: Spacing.four },
  featured: {
    width: FEATURED_W,
    height: 212,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glassTag: {
    flexShrink: 1,
    maxWidth: '70%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
  },
  glassTagText: {
    color: Brand.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.white,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  ratingChipText: { fontSize: 12, fontWeight: '800', color: Brand.ink },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    experimental_backgroundImage: 'linear-gradient(180deg, rgba(11,41,142,0), rgba(6,20,80,0.88))',
  },
  featuredBottom: { gap: 3 },
  featuredName: { flexShrink: 1, color: Brand.white, fontSize: 20, fontWeight: '800' },
  featuredSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D5D9E6' },
  dotActive: { width: 22, backgroundColor: Brand.royal },
  list: {
    borderRadius: 22,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: Spacing.three,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  listDivider: { borderTopWidth: 1, borderTopColor: LINE },
  listThumb: { width: 76, height: 76, borderRadius: 18 },
  eyebrow: {
    color: Brand.bronze,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  listName: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: Brand.ink },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: Brand.royal },
  campaign: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: Brand.royal,
    experimental_backgroundImage: 'linear-gradient(135deg, #2246B8, #18379C 45%, #0B298E)',
  },
  campaignTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campaignStatus: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  campaignTitle: { color: Brand.white, fontSize: 20, lineHeight: 26, fontWeight: '800', marginTop: 2 },
  campaignCopy: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17 },
  campaignTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  campaignFill: { height: 10, borderRadius: 5, backgroundColor: Brand.gold },
  campaignFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campaignFunded: { color: Brand.gold, fontSize: 14, fontWeight: '800' },
  people: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  state: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink, textAlign: 'center' },
  stateButton: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: 999,
    backgroundColor: Brand.royal,
  },
  stateButtonText: { color: Brand.white, fontWeight: '700', fontSize: 14 },
});
