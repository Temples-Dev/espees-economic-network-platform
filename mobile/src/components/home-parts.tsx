import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';
import {
  campaignProgress,
  relativeTime,
  type ActivityItem,
  type PendingItem,
} from '@/lib/home';
import type { Business, Campaign } from '@/lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TILE = '#E3E8F7';
const LINE = '#E9EAF0';

export function HomeHeader({
  greeting,
  firstName,
  initials,
  unread,
  onBell,
  onProfile,
}: {
  greeting: string;
  firstName: string;
  initials: string;
  unread: number;
  onBell: () => void;
  onProfile: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <ThemedText style={styles.name}>{`Hello, ${firstName}`}</ThemedText>
        <ThemedText style={styles.greeting}>{greeting}</ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unread > 0 ? `${unread} unread` : 'none unread'}`}
        onPress={onBell}
        hitSlop={8}
        style={styles.bell}>
        <Ionicons name="notifications-outline" size={22} color={Brand.royal} />
        {unread > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</ThemedText>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Profile ${initials}`}
        onPress={onProfile}
        hitSlop={8}
        style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{initials}</ThemedText>
      </Pressable>
    </View>
  );
}

export function BalanceCard({
  walletLine,
  onFund,
  onSend,
}: {
  walletLine: string;
  onFund: () => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.balanceCard}>
      <View style={styles.orbBig} />
      <View style={styles.orbSmall} />
      <ThemedText style={styles.balanceLabel}>Espees balance</ThemedText>
      <ThemedText style={styles.balancePlaceholder}>Balance available soon</ThemedText>
      <ThemedText style={styles.walletLine} numberOfLines={1}>
        {walletLine}
      </ThemedText>
      <View style={styles.balanceButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fund"
          onPress={onFund}
          style={[styles.balancePill, styles.pillGold]}>
          <Ionicons name="add" size={18} color={Brand.deep} />
          <ThemedText style={styles.pillGoldText}>Add money</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={onSend}
          style={[styles.balancePill, styles.pillGlass]}>
          <Ionicons name="arrow-up" size={18} color={Brand.white} />
          <ThemedText style={styles.pillGlassText}>Send</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void; text?: string };
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={8}>
          <ThemedText style={styles.sectionAction}>{action.text ?? 'See all'}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export function QuickActionGrid({
  actions,
}: {
  actions: { label: string; copy: string; icon: IconName; onPress: () => void }[];
}) {
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={a.onPress}
          style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.85 }]}>
          <View style={styles.gridIcon}>
            <Ionicons name={a.icon} size={22} color={Brand.royal} />
          </View>
          <View style={{ gap: 2 }}>
            <ThemedText style={styles.gridTitle}>{a.label}</ThemedText>
            <ThemedText style={styles.gridCopy}>{a.copy}</ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

export function Skeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View testID="section-skeleton" style={{ gap: Spacing.two }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

export function EmptyNote({ message }: { message: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {message}
    </ThemedText>
  );
}

function RowIcon({ name, tint, color }: { name: IconName; tint: string; color: string }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: tint }]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

export function PendingList({
  items,
  onPress,
}: {
  items: PendingItem[];
  onPress: (item: PendingItem) => void;
}) {
  return (
    <View style={styles.stack}>
      {items.map((p) => (
        <Pressable key={p.id} onPress={() => onPress(p)} style={styles.rowCard}>
          <RowIcon
            name={p.kind === 'order' ? 'time-outline' : 'chatbubble-ellipses-outline'}
            tint={p.kind === 'order' ? '#F6EBCB' : TILE}
            color={p.kind === 'order' ? Brand.bronze : Brand.royal}
          />
          <View style={styles.rowBody}>
            <ThemedText style={styles.rowTitle}>{p.title}</ThemedText>
            <ThemedText style={styles.rowSub} numberOfLines={1}>
              {p.detail}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9AA0AE" />
        </Pressable>
      ))}
    </View>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: Brand.bronze,
  confirmed: Brand.royal,
  fulfilled: '#1e7e34',
  cancelled: '#c0392b',
};

export function ActivityList({ items, now }: { items: ActivityItem[]; now: Date }) {
  return (
    <View style={styles.stack}>
      {items.map((a) => {
        const isOrder = a.kind === 'order';
        return (
          <View key={a.id} style={styles.rowCard}>
            <RowIcon
              name={isOrder ? 'receipt-outline' : 'notifications-outline'}
              tint={isOrder ? TILE : '#F6EBCB'}
              color={isOrder ? Brand.royal : Brand.bronze}
            />
            <View style={styles.rowBody}>
              <ThemedText style={styles.rowTitle} numberOfLines={1}>
                {a.title}
              </ThemedText>
              <ThemedText style={styles.rowSub} numberOfLines={1}>
                {isOrder ? relativeTime(a.at, now) : a.meta}
              </ThemedText>
            </View>
            <View style={styles.rowEnd}>
              {isOrder ? (
                <>
                  <ThemedText style={styles.amount}>{a.amount}</ThemedText>
                  <ThemedText
                    style={[styles.status, { color: STATUS_COLOR[a.meta.toLowerCase()] ?? Brand.body }]}>
                    {a.meta}
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={styles.time}>{relativeTime(a.at, now)}</ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const BUSINESS_W = 224;

const COVERS = [
  'linear-gradient(135deg, #2246B8, #0B298E)',
  'linear-gradient(135deg, #836B58, #5C4A3C)',
  'linear-gradient(135deg, #293D48, #16232B)',
  'linear-gradient(135deg, #C9A85B, #8F7440)',
];

export function BusinessRow({
  businesses,
  onPress,
}: {
  businesses: Business[];
  onPress: (b: Business) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={BUSINESS_W + Spacing.three}
      decelerationRate="fast"
      contentContainerStyle={styles.businessRow}>
      {businesses.map((b, i) => (
        <Pressable
          key={b.id}
          testID="business-card"
          accessibilityRole="button"
          accessibilityLabel={b.name}
          onPress={() => onPress(b)}
          style={({ pressed }) => [styles.businessCard, pressed && { opacity: 0.9 }]}>
          <View style={[styles.cover, { experimental_backgroundImage: COVERS[i % COVERS.length] }]}>
            <View style={styles.coverOrb} />
            <ThemedText style={styles.coverInitial}>{b.name.charAt(0).toUpperCase()}</ThemedText>
            <View style={styles.coverTop}>
              {b.category ? (
                <View style={styles.coverTag}>
                  <ThemedText style={styles.coverTagText}>{b.category}</ThemedText>
                </View>
              ) : (
                <View />
              )}
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color={Brand.gold} />
                <ThemedText style={styles.ratingText}>
                  {b.average_rating == null ? 'New' : b.average_rating.toFixed(1)}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.businessBody}>
            <ThemedText style={styles.rowTitle} numberOfLines={1}>
              {b.name}
            </ThemedText>
            {!!b.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Brand.body} />
                <ThemedText style={styles.rowSub} numberOfLines={1}>
                  {b.location}
                </ThemedText>
              </View>
            )}
            <View style={styles.businessFoot}>
              <ThemedText style={styles.reviews}>
                {b.review_count > 0 ? `${b.review_count} reviews` : 'No reviews yet'}
              </ThemedText>
              <View style={styles.go}>
                <Ionicons name="arrow-forward" size={14} color={Brand.royal} />
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function CampaignCard({ campaign, onPress }: { campaign: Campaign; onPress?: () => void }) {
  const percent = Math.round(campaignProgress(campaign) * 100);
  const count = campaign.contribution_count;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.campaign, pressed && { opacity: 0.9 }]}>
      <View style={styles.campaignTop}>
        <RowIcon name="heart-outline" tint="#F6EBCB" color={Brand.bronze} />
        <View style={styles.rowBody}>
          <ThemedText style={styles.rowTitle} numberOfLines={2}>
            {campaign.title}
          </ThemedText>
          <View style={styles.campaignTags}>
            <View style={styles.tag}>
              <ThemedText style={styles.tagText}>Campaign</ThemedText>
            </View>
            {!!campaign.status && (
              <ThemedText style={styles.rowSub}>{capitalise(campaign.status)}</ThemedText>
            )}
          </View>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.campaignFoot}>
        <ThemedText style={styles.funded}>{`${percent}% funded`}</ThemedText>
        <ThemedText style={styles.rowSub}>
          {`${campaign.raised_espees ?? 0} of ${campaign.goal_espees} ESP`}
        </ThemedText>
      </View>
      <View style={styles.people}>
        <Ionicons name="people-outline" size={15} color={Brand.body} />
        <ThemedText style={styles.rowSub}>
          {`${count} ${count === 1 ? 'contribution' : 'contributions'}`}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headerCopy: { flex: 1 },
  name: { color: Brand.ink, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  greeting: { color: Brand.body, fontSize: 13 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Brand.deep, fontSize: 10, fontWeight: '800' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Brand.gold, fontWeight: '800', fontSize: 16 },
  balanceCard: {
    marginHorizontal: Spacing.four,
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
    backgroundColor: Brand.royal,
    experimental_backgroundImage: 'linear-gradient(135deg, #2246B8, #18379C 45%, #0B298E)',
    shadowColor: '#0B298E',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  orbBig: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbSmall: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(218,191,121,0.18)',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  balancePlaceholder: { color: Brand.white, fontSize: 26, lineHeight: 34, fontWeight: '800' },
  walletLine: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  balanceButtons: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
  balancePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 46,
    borderRadius: 999,
  },
  pillGold: { backgroundColor: Brand.gold },
  pillGoldText: { color: Brand.deep, fontWeight: '800', fontSize: 14 },
  pillGlass: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillGlassText: { color: Brand.white, fontWeight: '700', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  sectionAction: { fontSize: 13, fontWeight: '700', color: Brand.royal },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  gridCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 112,
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  gridIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  gridTitle: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  gridCopy: { fontSize: 12, lineHeight: 16, color: Brand.body },
  section: { paddingHorizontal: Spacing.four, marginTop: Spacing.five, gap: Spacing.three },
  skeleton: { height: 64, borderRadius: 18, backgroundColor: '#ECEEF4' },
  stack: { gap: Spacing.two },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  rowSub: { fontSize: 12, color: Brand.body },
  rowEnd: { alignItems: 'flex-end', gap: 2 },
  amount: { color: Brand.ink, fontSize: 14, fontWeight: '800' },
  status: { fontSize: 12, fontWeight: '600' },
  time: { color: Brand.body, fontSize: 12 },
  businessRow: { gap: Spacing.three, paddingRight: Spacing.four },
  businessCard: {
    width: BUSINESS_W,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  cover: {
    height: 104,
    backgroundColor: Brand.royal,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  coverOrb: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  coverInitial: {
    position: 'absolute',
    right: 14,
    bottom: -8,
    fontSize: 72,
    lineHeight: 84,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.2)',
  },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
  },
  coverTagText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.white,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: Brand.ink },
  businessBody: { padding: Spacing.three, gap: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  businessFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  reviews: { fontSize: 12, fontWeight: '600', color: Brand.bronze },
  go: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaign: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 22,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: LINE,
  },
  campaignTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  campaignTags: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  tag: {
    backgroundColor: '#F6EBCB',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  tagText: { color: Brand.bronze, fontSize: 11, fontWeight: '800' },
  track: { height: 10, borderRadius: 5, backgroundColor: TILE, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: Brand.gold },
  campaignFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  funded: { color: Brand.bronze, fontSize: 14, fontWeight: '800' },
  people: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
