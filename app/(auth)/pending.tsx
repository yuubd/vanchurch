import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

export default function PendingScreen() {
  const { churchName } = useLocalSearchParams<{ churchName: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('join_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.status === 'approved') {
        clearInterval(interval);
        const { data: profile } = await supabase.from('users').select('roles').eq('id', user.id).single();
        const roles: string[] = (profile as any)?.roles ?? ['member'];
        if (roles.includes('admin') || roles.includes('pastor')) router.replace('/(admin)');
        else if (roles.includes('cell_leader')) router.replace('/(leader)');
        else router.replace('/(member)');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🙏</Text>
      <Text style={styles.title}>{t('pendingTitle')}</Text>
      <Text style={styles.sub}>
        <Text style={styles.church}>{churchName ?? ''}</Text>
        {churchName ? '\n' : ''}{t('pendingSub')}
      </Text>
      <ActivityIndicator color="#D1D5DB" style={styles.spinner} />
      <Text style={styles.hint}>{t('pendingHint')}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', letterSpacing: -0.5, marginBottom: 14, textAlign: 'center' },
  sub: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, marginBottom: 20 },
  church: { color: '#2563EB', fontWeight: '700' },
  spinner: { marginBottom: 12 },
  hint: { fontSize: 13, color: '#D1D5DB', textAlign: 'center', marginBottom: 48 },
  logoutBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  logoutText: { fontSize: 14, color: '#9CA3AF' },
});
