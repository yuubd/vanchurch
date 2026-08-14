import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={focused ? name : `${name}-outline` as IoniconsName} size={24} color={focused ? '#2563EB' : '#9CA3AF'} />;
}

export default function AdminLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [allowed, setAllowed] = useState(false);
  const [isPastor, setIsPastor] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/(auth)/login'); return; }
      supabase.from('users').select('roles, church_id').eq('id', user.id).single().then(({ data }) => {
        const roles: string[] = data?.roles ?? [];
        if (!data?.church_id) {
          router.replace('/(auth)/onboarding');
        } else if (roles.includes('admin') || roles.includes('pastor')) {
          setIsPastor(roles.includes('pastor'));
          setAllowed(true);
          supabase.from('join_requests').select('id', { count: 'exact', head: true })
            .eq('church_id', data.church_id).eq('status', 'pending')
            .then(({ count }) => setPendingCount(count ?? 0));
        } else if (roles.includes('cell_leader')) {
          router.replace('/(leader)');
        } else {
          router.replace('/(member)');
        }
      });
    });
  }, []);

  if (!allowed) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#fff',
          height: 56 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '400' },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: t('home'),          tabBarIcon: ({ focused }) => <TabIcon name="home"    focused={focused} /> }} />
      <Tabs.Screen name="prayers" options={{ title: t('prayerRequests'), tabBarIcon: ({ focused }) => <TabIcon name="heart"   focused={focused} />, href: isPastor ? undefined : null }} />
      <Tabs.Screen name="members" options={{ title: t('members'), tabBarIcon: ({ focused }) => <TabIcon name="people" focused={focused} />, tabBarBadge: pendingCount > 0 ? pendingCount : undefined }} />
      <Tabs.Screen name="cells"   options={{ title: t('cells'),          tabBarIcon: ({ focused }) => <TabIcon name="grid"    focused={focused} /> }} />
      <Tabs.Screen name="feedback" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'),        tabBarIcon: ({ focused }) => <TabIcon name="person"  focused={focused} /> }} />
      <Tabs.Screen name="setup"   options={{ href: null }} />
    </Tabs>
  );
}
