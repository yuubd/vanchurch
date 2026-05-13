import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useTranslation } from '../../lib/i18n';

type Member = { id: string; name: string; present: boolean };
type PrayerRequest = { id: string; body: string; created_at: string; users: { name: string } | null };

export default function LeaderHome() {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [cellName, setCellName] = useState('');
  const [tab, setTab] = useState<'prayers' | 'attendance'>('prayers');
  const { t } = useTranslation();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user?.id).single();
    if (!me?.cell_id) return;

    const sunday = getUpcomingSunday();
    const [{ data: cellData }, { data: memberData }, { data: requestData }, { data: attendanceData }] = await Promise.all([
      supabase.from('cells').select('name').eq('id', me.cell_id).single(),
      supabase.from('users').select('id, name').eq('cell_id', me.cell_id),
      supabase.from('prayer_requests').select('id, body, created_at, users(name)').eq('cell_id', me.cell_id).order('created_at', { ascending: false }),
      supabase.from('attendance_records').select('user_id, present').eq('cell_id', me.cell_id).eq('meeting_date', sunday),
    ]);

    const attendanceMap = Object.fromEntries((attendanceData ?? []).map(r => [r.user_id, r.present]));
    setCellName(cellData?.name ?? '');
    setMembers((memberData ?? []).map(m => ({ ...m, present: attendanceMap[m.id] ?? false })));
    setRequests((requestData ?? []) as any);
  }

  async function toggleAttendance(memberId: string, present: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user?.id).single();
    const sunday = getUpcomingSunday();
    await supabase.from('attendance_records').upsert(
      { user_id: memberId, cell_id: me?.cell_id, meeting_date: sunday, present },
      { onConflict: 'user_id,meeting_date' }
    );
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, present } : m));
  }

  function getUpcomingSunday() {
    const today = new Date();
    const diff = today.getDay() === 0 ? 0 : 7 - today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + diff);
    return sunday.toISOString().split('T')[0];
  }

  function formatSunday() {
    const today = new Date();
    const diff = today.getDay() === 0 ? 0 : 7 - today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + diff);
    return sunday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <View style={styles.container}>
      <Header title={cellName || t('attendance')} />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'prayers' && styles.tabActive]} onPress={() => setTab('prayers')}>
          <Text style={[styles.tabText, tab === 'prayers' && styles.tabTextActive]}>🙏 {t('prayerRequests')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'attendance' && styles.tabActive]} onPress={() => setTab('attendance')}>
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabTextActive]}>✅ {t('attendance')}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'prayers' ? (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          ListHeaderComponent={requests.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{cellName} · {requests.length} {t('prayerRequests').toLowerCase()}</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.users?.name}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('noRequests')}</Text>}
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View style={styles.dateBanner}>
              <Text style={styles.dateBannerText}>📅 {formatSunday()}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>{item.name}</Text>
              <TouchableOpacity style={[styles.toggle, item.present && styles.toggleOn]} onPress={() => toggleAttendance(item.id, !item.present)}>
                <View style={[styles.toggleThumb, item.present && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('noMembers')}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
  tabTextActive: { color: '#4F46E5', fontWeight: '600' },
  sectionHeader: { padding: 12, paddingHorizontal: 16, backgroundColor: '#fafafa', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  cardName: { fontWeight: '600', fontSize: 15, marginBottom: 4 },
  cardBody: { fontSize: 15, color: '#333', lineHeight: 22 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 6 },
  dateBanner: { padding: 10, backgroundColor: '#EEF2FF', alignItems: 'center' },
  dateBannerText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  memberName: { fontSize: 16 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: '#4F46E5' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  toggleThumbOn: { alignSelf: 'flex-end' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
