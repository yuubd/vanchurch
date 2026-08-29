import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation, Lang } from '../../lib/i18n';
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, storeSession, clearBiometrics, promptBiometric } from '../../lib/biometrics';
import { friendlyError } from '../../lib/friendlyError';

type Profile = { name: string; roles: string[]; cells: { name: string } | null; churches: { name: string } | null; phone: string | null };

function formatPhone(raw: string | null): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1'))
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:       { bg: '#FEF3C7', text: '#92400E' },
  pastor:      { bg: '#DCFCE7', text: '#166534' },
  cell_leader: { bg: '#DBEAFE', text: '#1E40AF' },
  member:      { bg: '#F3F4F6', text: '#6B7280' },
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const { lang, setLang, t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
    if (Platform.OS !== 'web') {
      isBiometricAvailable().then(setBiometricSupported);
      isBiometricEnabled().then(setBiometricOn);
    }
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('users')
      .select('name, roles, cells!users_cell_id_fkey(name), churches(name)')
      .eq('id', user!.id)
      .single();
    setProfile({ ...(data as any), phone: user?.phone ?? null });
  }

  async function toggleBiometric(value: boolean) {
    if (value) {
      const passed = await promptBiometric();
      if (!passed) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await storeSession(session.access_token, session.refresh_token);
      await setBiometricEnabled(true);
      setBiometricOn(true);
    } else {
      await clearBiometrics();
      setBiometricOn(false);
    }
  }

  async function logout() {
    await clearBiometrics();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  function confirmLeave() {
    Alert.alert(t('leaveConfirmTitle'), t('leaveConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('leaveCommunity'), style: 'destructive', onPress: leaveCommunity },
    ]);
  }

  async function leaveCommunity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ church_id: null, cell_id: null, roles: ['member'] })
      .eq('id', user.id);
    if (error) { Alert.alert('오류', friendlyError(error)); return; }
    router.replace('/(auth)/onboarding');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{t('myProfile')}</Text>
      {profile && (
        <View>
          <View style={[styles.section, styles.row]}>
            <View style={styles.half}>
              <Text style={styles.label}>{t('name')}</Text>
              <Text style={styles.value}>{profile.name}</Text>
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>{t('phoneNumber')}</Text>
              <Text style={styles.value}>{formatPhone(profile.phone)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('churchName')}</Text>
              {!!profile.churches?.name && (
                <TouchableOpacity onPress={confirmLeave} hitSlop={8}>
                  <Text style={styles.leaveLink}>{t('leave')}</Text>
                </TouchableOpacity>
              )}
            </View>
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

          {biometricSupported && (
            <View style={[styles.section, styles.biometricRow]}>
              <View>
                <Text style={styles.biometricLabel}>Face ID / Touch ID</Text>
                <Text style={styles.biometricSub}>{biometricOn ? '다음 로그인 시 생체 인증 사용' : '빠른 로그인을 위해 활성화하세요'}</Text>
              </View>
              <Switch
                value={biometricOn}
                onValueChange={toggleBiometric}
                trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                thumbColor={biometricOn ? '#2563EB' : '#9CA3AF'}
              />
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 28 },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  row: { flexDirection: 'row', gap: 16 },
  half: { flex: 1 },
  label: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  value: { fontSize: 16, color: '#111', fontWeight: '500' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  leaveLink: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' },
  langToggle: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  langBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  langBtnText: { fontSize: 14, color: '#666', fontWeight: '500' },
  langBtnTextActive: { color: '#fff', fontWeight: '600' },
  biometricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  biometricLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  biometricSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  logoutBtn: { margin: 20, backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
