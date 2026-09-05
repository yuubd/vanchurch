import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation, Lang } from '../../lib/i18n';
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, storeSession, clearBiometrics, promptBiometric } from '../../lib/biometrics';
import { friendlyError } from '../../lib/friendlyError';
import { showAlert } from '../../lib/alert';
import { isValidDate } from '../../lib/dob';
import { useWebPullToRefresh } from '../../lib/useWebPullToRefresh';

type Profile = { name: string; date_of_birth: string | null; roles: string[]; cells: { name: string } | null; churches: { name: string } | null; phone: string | null };

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
  const [refreshing, setRefreshing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const { lang, setLang, t } = useTranslation();
  const router = useRouter();

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  useWebPullToRefresh(onRefresh);

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
      .select('name, date_of_birth, roles, cells!users_cell_id_fkey(name), churches(name)')
      .eq('id', user!.id)
      .single();
    setProfile({ ...(data as any), phone: user?.phone ?? null });
  }

  function startEditProfile() {
    if (!profile) return;
    setEditName(profile.name);
    setEditDob(profile.date_of_birth ?? '');
    setEditingProfile(true);
  }

  async function saveProfile() {
    const trimmed = editName.trim();
    if (!trimmed || (editDob && !isValidDate(editDob))) return;
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('users').update({ name: trimmed, date_of_birth: editDob || null }).eq('id', user!.id);
    setSavingProfile(false);
    if (error) { showAlert(t('error'), friendlyError(error)); return; }
    setEditingProfile(false);
    loadProfile();
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
    showAlert(t('leaveConfirmTitle'), t('leaveConfirmMsg'), [
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
    if (error) { showAlert(t('error'), friendlyError(error)); return; }
    router.replace('/(auth)/onboarding');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={60} />}
    >
      <Text style={styles.pageTitle}>{t('myProfile')}</Text>
      {profile && (
        <View>
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('name')}</Text>
              {!editingProfile && (
                <TouchableOpacity onPress={startEditProfile} hitSlop={8}>
                  <Text style={styles.editLink}>{t('edit')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingProfile ? (
              <>
                <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder={t('namePlaceholder')} placeholderTextColor="#9CA3AF" />
                <Text style={[styles.label, styles.editSecondLabel]}>{t('dateOfBirth')}</Text>
                <TextInput style={styles.editInput} value={editDob} onChangeText={setEditDob} placeholder={t('dateOfBirthPlaceholder')} placeholderTextColor="#9CA3AF" keyboardType="numbers-and-punctuation" />
                {!!editDob && !isValidDate(editDob) && <Text style={styles.editError}>{t('dateOfBirthInvalid')}</Text>}
                <View style={styles.editBtnRow}>
                  <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingProfile(false)}>
                    <Text style={styles.editCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, (!editName.trim() || (!!editDob && !isValidDate(editDob)) || savingProfile) && styles.disabled]}
                    onPress={saveProfile}
                    disabled={!editName.trim() || (!!editDob && !isValidDate(editDob)) || savingProfile}
                  >
                    <Text style={styles.editSaveText}>{savingProfile ? '...' : t('save')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.value}>{profile.name}</Text>
                <Text style={styles.dobValue}>{t('dateOfBirth')}: {profile.date_of_birth ?? '—'}</Text>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('phoneNumber')}</Text>
            <Text style={styles.value}>{formatPhone(profile.phone)}</Text>
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
  label: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  value: { fontSize: 16, color: '#111', fontWeight: '500' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  leaveLink: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  editLink: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  dobValue: { fontSize: 13, color: '#9CA3AF', marginTop: 6 },
  editInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  editSecondLabel: { marginTop: 14 },
  editError: { fontSize: 12, color: '#DC2626', marginTop: 6 },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editCancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  editCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  editSaveBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 10, padding: 12, alignItems: 'center' },
  editSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.5 },
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
