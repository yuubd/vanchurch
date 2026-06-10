import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useTranslation, Lang } from '../../lib/i18n';

type Profile = { name: string; roles: string[]; cells: { name: string } | null; churches: { name: string; invite_token: string } | null; phone: string | null };

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
  const [copied, setCopied] = useState(false);
  const { lang, setLang, t } = useTranslation();
  const router = useRouter();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('users')
      .select('name, roles, cells!users_cell_id_fkey(name), churches(name, invite_token)')
      .eq('id', user!.id)
      .single();
    setProfile({ ...(data as any), phone: user?.phone ?? null });
  }

  function inviteLink() {
    return `https://vanchurch.vercel.app/join/${profile?.churches?.invite_token}`;
  }

  async function copyLink() {
    await Clipboard.setStringAsync(inviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    await Share.share({ message: inviteLink(), url: inviteLink() });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
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
            <Text style={styles.label}>{t('churchName')}</Text>
            <Text style={styles.value}>{profile.churches?.name ?? '—'}</Text>
          </View>

          {profile.churches?.invite_token && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('inviteMembers')}</Text>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={1}>{inviteLink()}</Text>
              </View>
              <View style={styles.linkBtns}>
                <TouchableOpacity style={styles.linkBtn} onPress={copyLink}>
                  <Text style={styles.linkBtnText}>{copied ? t('copied') : t('copyLink')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.linkBtn, styles.shareBtn]} onPress={shareLink}>
                  <Text style={styles.shareBtnText}>{t('share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' },
  langToggle: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  langBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  langBtnText: { fontSize: 14, color: '#666', fontWeight: '500' },
  langBtnTextActive: { color: '#fff', fontWeight: '600' },
  linkBox: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginBottom: 10 },
  linkText: { fontSize: 13, color: '#6B7280', fontFamily: 'monospace' },
  linkBtns: { flexDirection: 'row', gap: 10 },
  linkBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 11, alignItems: 'center' },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  shareBtn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  logoutBtn: { margin: 20, backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
