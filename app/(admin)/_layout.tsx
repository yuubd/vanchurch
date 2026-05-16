import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={focused ? name : `${name}-outline` as IoniconsName} size={24} color={focused ? '#2563EB' : '#9CA3AF'} />;
}

export default function AdminLayout() {
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: '홈',      tabBarIcon: ({ focused }) => <TabIcon name="home"    focused={focused} /> }} />
      <Tabs.Screen name="prayers" options={{ title: '기도제목', tabBarIcon: ({ focused }) => <TabIcon name="heart"   focused={focused} /> }} />
      <Tabs.Screen name="members" options={{ title: '멤버',    tabBarIcon: ({ focused }) => <TabIcon name="people"  focused={focused} /> }} />
      <Tabs.Screen name="cells"   options={{ title: '셀',      tabBarIcon: ({ focused }) => <TabIcon name="grid"    focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: '프로필',  tabBarIcon: ({ focused }) => <TabIcon name="person"  focused={focused} /> }} />
      <Tabs.Screen name="setup"   options={{ href: null }} />
    </Tabs>
  );
}
