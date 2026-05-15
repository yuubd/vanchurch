import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation, Lang } from '../../lib/i18n';
import Header from '../../components/Header';

type Profile = { name: string; roles: string[]; cells: { name: string } | null; churches: { name: string } | null };

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:       { bg: '#FEF3C7', text: '#92400E' },
  pastor:      { bg: '#DCFCE7', text: '#166534' },
  cell_leader: { bg: '#DBEAFE', text: '#1E40AF' },
  member:      { bg: '#F3F4F6', text: '#6B7280' },
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { lang, setLang, t } = useTranslation();
  const router = useRouter();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('users')
      .select('name, roles, cells!users_cell_id_fkey(name), churches(name)')
      .eq('id', user!.id)
      .single();
    setProfile(data as any);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Header title={t('myProfile')} />
      {profile && (
        <View style={styles.inner}>
          <View style={styles.section}>
            <Text style={styles.label}>{t('name')}</Text>
            <Text style={styles.value}>{profile.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('churchName')}</Text>
            <Text style={styles.value}>{profile.churches?.name ?? '—'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('myRoles')}</Text>
            <View style={styles.badges}>
              {profile.roles.map(r => (
                <Text key={r} style={[styles.badge, { backgroundColor: ROLE_COLORS[r]?.bg, color: ROLE_COLORS[r]?.text }]}>{r}</Text>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('myCell')}</Text>
            <Text style={styles.value}>{profile.cells?.name ?? t('noCell')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('language')}</Text>
            <View style={styles.langToggle}>
              {(['ko', 'en'] as Lang[]).map(l => (
                <TouchableOpacity key={l} style={[styles.langBtn, lang === l && styles.langBtnActive]} onPress={() => setLang(l)}>
                  <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                    {l === 'ko' ? t('korean') : t('english')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 20 },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  label: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  value: { fontSize: 16, color: '#111', fontWeight: '500' },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' },
  langToggle: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  langBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  langBtnText: { fontSize: 14, color: '#666', fontWeight: '500' },
  langBtnTextActive: { color: '#fff', fontWeight: '600' },
  logoutBtn: { margin: 20, backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
