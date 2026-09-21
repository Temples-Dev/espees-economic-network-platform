import { Tabs } from 'expo-router';

import { FloatingTabBar } from './floating-tab-bar';

const SCREENS = [
  { name: 'index', title: 'Home' },
  { name: 'discover', title: 'Discover' },
  { name: 'pay', title: 'Pay' },
  { name: 'build', title: 'Build' },
  { name: 'community', title: 'Community' },
  { name: 'profile', title: 'Profile' },
] as const;

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      {SCREENS.map((s) => (
        <Tabs.Screen key={s.name} name={s.name} options={{ title: s.title }} />
      ))}
    </Tabs>
  );
}
