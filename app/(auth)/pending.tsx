import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function PendingScreen() {
  const { churchName } = useLocalSearchParams<{ churchName: string }>();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🙏</Text>
      <Text style={styles.title}>가입 요청을 보냈어요</Text>
      <Text style={styles.sub}>
        <Text style={styles.church}>{churchName ?? '공동체'}</Text>
        {' '}관리자가 승인하면{'\n'}바로 입장할 수 있어요
      </Text>
      <Text style={styles.hint}>앱을 다시 열면 상태가 자동으로 확인됩니다</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', letterSpacing: -0.5, marginBottom: 14, textAlign: 'center' },
  sub: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, marginBottom: 12 },
  church: { color: '#2563EB', fontWeight: '700' },
  hint: { fontSize: 13, color: '#D1D5DB', textAlign: 'center', marginBottom: 48 },
  logoutBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  logoutText: { fontSize: 14, color: '#9CA3AF' },
});
