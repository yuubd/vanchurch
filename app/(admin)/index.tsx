import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type Stats = { members: number; cells: number; attended: number };
type Prayer = { id: string; body: string; created_at: string; prayCount: number };

function getLastSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

export default function AdminHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [adminName, setAdminName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [stats, setStats] = useState<Stats>({ members: 0, cells: 0, attended: 0 });
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('name, church_id, churches!users_church_id_fkey(name)')
      .eq('id', user.id)
      .single();

    setAdminName((profile as any)?.name ?? '');
    setChurchName((profile as any)?.churches?.name ?? '');

    const churchId = (profile as any)?.church_id;

    const [{ count: memberCount }, { count: cellCount }, { data: attendanceData }, { data: prayerData }, { data: allPrays }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('church_id', churchId ?? ''),
      supabase.from('cells').select('id', { count: 'exact', head: true }).eq('church_id', churchId ?? ''),
      supabase.from('attendance_records').select('present').eq('meeting_date', getLastSunday()),
      supabase.from('prayer_requests').select('id, body, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('prayer_prays').select('prayer_id'),
    ]);

    const attended = (attendanceData ?? []).filter(r => r.present).length;
    setStats({ members: memberCount ?? 0, cells: cellCount ?? 0, attended });

    const prayCountMap: Record<string, number> = {};
    (allPrays ?? []).forEach((p: any) => { prayCountMap[p.prayer_id] = (prayCountMap[p.prayer_id] ?? 0) + 1; });
    setPrayers((prayerData ?? []).map((r: any) => ({ ...r, prayCount: prayCountMap[r.id] ?? 0 })));
  }

  async function submitPrayer() {
    if (!draft.trim() || !userId) return;
    setSending(true);
    await supabase.from('prayer_requests').insert({ user_id: userId, body: draft.trim() });
    setSending(false);
    setDraft('');
    setModalVisible(false);
    loadData();
  }

  const quickMenus = [
    { label: t('memberManagement'), sub: t('totalMembers').replace('%', String(stats.members)), route: '/(admin)/members' as const },
    { label: t('cellManagement'), sub: t('cellsRunning').replace('%', String(stats.cells)), route: '/(admin)/cells' as const },
  ];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View />
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(admin)/profile')}>
            <Text style={styles.avatarText}>{adminName.slice(0, 1)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.greeting}>{t('greeting')}, {adminName}{t('greetingSuffix')}</Text>
        <Text style={styles.church}>{churchName}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNum, { color: '#2563EB' }]}>{stats.attended}/{stats.members}</Text>
            <Text style={styles.statLabel}>{t('attendance')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statNum, { color: '#16A34A' }]}>{stats.cells}</Text>
            <Text style={styles.statLabel}>{t('cells')}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('quickMenu')}</Text>

        {quickMenus.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuCard} onPress={() => router.push(item.route)}>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('recentPrayers')}</Text>

        {prayers.length === 0 ? (
          <Text style={styles.empty}>{t('noPrayersYet')}</Text>
        ) : (
          prayers.map(item => (
            <View key={item.id} style={styles.prayerCard}>
              <Text style={styles.prayerBody}>{item.body}</Text>
              <View style={styles.prayerFooter}>
                <Text style={styles.prayerDate}>
                  {new Date(item.created_at).toLocaleDateString(t('greeting') === 'Hello' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' })}
                </Text>
                {item.prayCount > 0 && (
                  <Text style={styles.prayedBadge}>🙏 {item.prayCount}{t('prayedCount')}</Text>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('sharePrayerTitle')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('sharePrayer')}
              multiline
              value={draft}
              onChangeText={setDraft}
              textAlignVertical="top"
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{draft.length} / 500</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setDraft(''); }}>
                <Text style={styles.cancelText}>{t('cancel') ?? '취소'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!draft.trim() || sending) && styles.submitDisabled]}
                onPress={submitPrayer}
                disabled={!draft.trim() || sending}
              >
                <Text style={styles.submitText}>{sending ? t('sending') : t('share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 56 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  avatarBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#1D4ED8' },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  church: { fontSize: 14, color: '#9CA3AF', marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  menuText: { gap: 3 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  menuSub: { fontSize: 13, color: '#9CA3AF' },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  prayerCard: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  prayerBody: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 8 },
  prayerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayerDate: { fontSize: 12, color: '#9CA3AF' },
  prayedBadge: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 16, color: '#9CA3AF', fontSize: 15 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', minHeight: 120, textAlignVertical: 'top', backgroundColor: '#F9FAFB' },
  charCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 6, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  submitBtn: { flex: 2, backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
