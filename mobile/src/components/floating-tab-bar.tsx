import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, MaxContentWidth, TabBar } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'home', off: 'home-outline' },
  discover: { on: 'compass', off: 'compass-outline' },
  pay: { on: 'card', off: 'card-outline' },
  build: { on: 'construct', off: 'construct-outline' },
  community: { on: 'chatbubbles', off: 'chatbubbles-outline' },
  profile: { on: 'person-circle', off: 'person-circle-outline' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, TabBar.gap) }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key]?.options.title ?? route.name;
          const icon = ICONS[route.name] ?? ICONS.index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={[styles.item, focused && styles.itemActive]}>
              <Ionicons
                name={focused ? icon.on : icon.off}
                size={22}
                color={focused ? Brand.deep : 'rgba(255,255,255,0.72)'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: TabBar.gap,
    right: TabBar.gap,
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    maxWidth: MaxContentWidth,
    height: TabBar.height,
    borderRadius: TabBar.height / 2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.deep,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#0B298E',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: Brand.gold,
  },
});
