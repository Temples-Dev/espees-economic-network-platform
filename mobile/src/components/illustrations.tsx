import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

const SKY = '#DCE4F7';

/** Storefront with a striped awning, a rating chip and a "new" chip. */
export function BusinessesIllustration() {
  return (
    <View accessibilityLabel="Businesses illustration" style={styles.stage}>
      <View style={styles.glow} />
      <View style={b.building}>
        <View style={b.windowRow}>
          <View style={b.window} />
          <View style={b.window} />
        </View>
        <View style={b.door} />
      </View>
      <View style={b.awning}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[b.stripe, { backgroundColor: i % 2 ? Brand.white : Brand.gold }]} />
        ))}
      </View>
      <View style={[styles.chip, b.ratingChip]}>
        <Text style={styles.chipStar}>★</Text>
        <Text style={styles.chipText}>4.9</Text>
      </View>
      <View style={[styles.chip, b.newChip]}>
        <Text style={styles.chipText}>+ New listing</Text>
      </View>
    </View>
  );
}

/** Two stacked wallet cards with a "payment sent" confirmation. */
export function PaymentsIllustration() {
  return (
    <View accessibilityLabel="Payments illustration" style={styles.stage}>
      <View style={styles.glow} />
      <View style={[p.card, p.cardBack]} />
      <View style={[p.card, p.cardFront]}>
        <View style={p.chip} />
        <Text style={p.label}>ESPEES WALLET</Text>
        <Text style={p.balance}>1,250.00</Text>
        <View style={p.coinRow}>
          <View style={p.coin} />
          <View style={[p.coin, p.coinOverlap]} />
        </View>
      </View>
      <View style={[styles.chip, p.sentChip]}>
        <View style={p.tick}>
          <Text style={p.tickText}>✓</Text>
        </View>
        <Text style={styles.chipText}>Payment sent</Text>
      </View>
    </View>
  );
}

/** Connected members, a conversation bubble and a campaign funding bar. */
export function CommunityIllustration() {
  return (
    <View accessibilityLabel="Community illustration" style={styles.stage}>
      <View style={styles.glow} />
      <View style={[c.link, c.linkLeft]} />
      <View style={[c.link, c.linkRight]} />
      <View style={[c.avatar, c.avatarTop, { backgroundColor: Brand.gold }]}>
        <View style={c.head} />
      </View>
      <View style={[c.avatar, c.avatarLeft, { backgroundColor: Brand.white }]}>
        <View style={[c.head, { backgroundColor: Brand.royal }]} />
      </View>
      <View style={[c.avatar, c.avatarRight, { backgroundColor: SKY }]}>
        <View style={[c.head, { backgroundColor: Brand.deep }]} />
      </View>
      <View style={c.bubble}>
        <View style={c.line} />
        <View style={[c.line, { width: 46 }]} />
      </View>
      <View style={c.campaign}>
        <Text style={c.campaignTitle}>Community project</Text>
        <View style={c.track}>
          <View style={c.fill} />
        </View>
        <Text style={c.campaignMeta}>72% funded</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 280,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.white,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chipText: { color: Brand.deep, fontSize: 12, fontWeight: '700' },
  chipStar: { color: Brand.gold, fontSize: 13 },
});

const b = StyleSheet.create({
  building: {
    position: 'absolute',
    bottom: 34,
    width: 168,
    height: 112,
    backgroundColor: Brand.white,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  windowRow: { position: 'absolute', top: 40, flexDirection: 'row', gap: 60 },
  window: { width: 34, height: 30, borderRadius: 6, backgroundColor: SKY },
  door: {
    width: 40,
    height: 58,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: Brand.gold,
  },
  awning: {
    position: 'absolute',
    bottom: 138,
    width: 190,
    height: 36,
    flexDirection: 'row',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },
  stripe: { flex: 1 },
  ratingChip: { top: 14, right: 8 },
  newChip: { bottom: 8, left: 6 },
});

const p = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 214,
    height: 128,
    borderRadius: 18,
  },
  cardBack: {
    backgroundColor: Brand.gold,
    transform: [{ rotate: '-9deg' }, { translateY: -14 }],
  },
  cardFront: {
    backgroundColor: Brand.royal,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '3deg' }],
  },
  chip: { width: 34, height: 24, borderRadius: 6, backgroundColor: Brand.gold },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  balance: { color: Brand.white, fontSize: 24, fontWeight: '800' },
  coinRow: { position: 'absolute', right: 14, top: 14, flexDirection: 'row' },
  coin: { width: 24, height: 24, borderRadius: 12, backgroundColor: Brand.gold },
  coinOverlap: { marginLeft: -10, backgroundColor: Brand.white },
  sentChip: { bottom: 10, right: 6 },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e7e34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { color: Brand.white, fontSize: 11, fontWeight: '800' },
});

const AV = 64;
const c = StyleSheet.create({
  avatar: {
    position: 'absolute',
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarTop: { top: 4, left: 108 },
  avatarLeft: { top: 70, left: 26 },
  avatarRight: { top: 70, right: 26 },
  head: { width: 26, height: 26, borderRadius: 13, backgroundColor: Brand.deep },
  link: {
    position: 'absolute',
    top: 66,
    width: 84,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  linkLeft: { left: 60, transform: [{ rotate: '-38deg' }] },
  linkRight: { right: 60, transform: [{ rotate: '38deg' }] },
  bubble: {
    position: 'absolute',
    top: 96,
    left: 108,
    width: 64,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.white,
    padding: 9,
    gap: 6,
    justifyContent: 'center',
  },
  line: { height: 5, width: 40, borderRadius: 3, backgroundColor: SKY },
  campaign: {
    position: 'absolute',
    bottom: 6,
    width: 236,
    borderRadius: 16,
    backgroundColor: Brand.white,
    padding: 12,
    gap: 6,
  },
  campaignTitle: { color: Brand.deep, fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, backgroundColor: SKY, overflow: 'hidden' },
  fill: { width: '72%', height: 8, borderRadius: 4, backgroundColor: Brand.gold },
  campaignMeta: { color: Brand.body, fontSize: 11 },
});
