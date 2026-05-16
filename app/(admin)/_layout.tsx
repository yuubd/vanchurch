import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB', tabBarInactiveTintColor: '#999' }}>
      <Tabs.Screen name="index"   options={{ title: '홈',      tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="prayers" options={{ title: '기도제목', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🙏</Text> }} />
      <Tabs.Screen name="members" options={{ title: '멤버',    tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text> }} />
      <Tabs.Screen name="cells"   options={{ title: '셀',      tabBarIcon: () => <Text style={{ fontSize: 20 }}>⛪</Text> }} />
      <Tabs.Screen name="profile" options={{ title: '프로필',  tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }} />
      <Tabs.Screen name="setup"   options={{ href: null }} />
    </Tabs>
  );
}
