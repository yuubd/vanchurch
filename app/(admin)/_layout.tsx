import { Tabs } from 'expo-router';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#4F46E5' }}>
      <Tabs.Screen name="index" options={{ title: '기도제목 / Prayers' }} />
      <Tabs.Screen name="members" options={{ title: '멤버 / Members' }} />
      <Tabs.Screen name="cells" options={{ title: '셀 / Cells' }} />
    </Tabs>
  );
}
