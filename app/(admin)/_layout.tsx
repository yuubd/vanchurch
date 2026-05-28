import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={focused ? name : `${name}-outline` as IoniconsName} size={24} color={focused ? '#2563EB' : '#9CA3AF'} />;
}

export default function AdminLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/(auth)/login'); return; }
      supabase.from('users').select('roles').eq('id', user.id).single().then(({ data }) => {
        const roles: string[] = data?.roles ?? [];
        if (roles.includes('admin') || roles.includes('pastor')) {
          setAllowed(true);
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
          height: 70,
        },
        tabBarItemStyle: {
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '400' },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: t('home'),          tabBarIcon: ({ focused }) => <TabIcon name="home"    focused={focused} /> }} />
      <Tabs.Screen name="prayers" options={{ title: t('prayerRequests'), tabBarIcon: ({ focused }) => <TabIcon name="heart"   focused={focused} /> }} />
      <Tabs.Screen name="members" options={{ title: t('members'),        tabBarIcon: ({ focused }) => <TabIcon name="people"  focused={focused} /> }} />
      <Tabs.Screen name="cells"   options={{ title: t('cells'),          tabBarIcon: ({ focused }) => <TabIcon name="grid"    focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'),        tabBarIcon: ({ focused }) => <TabIcon name="person"  focused={focused} /> }} />
      <Tabs.Screen name="setup"   options={{ href: null }} />
    </Tabs>
  );
}
