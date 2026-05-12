import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

type Member = { id: string; name: string; present: boolean };
type PrayerRequest = { id: string; body: string; created_at: string; users: { name: string } };

export default function LeaderHome() {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [tab, setTab] = useState<'attendance' | 'prayers'>('prayers');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user?.id).single();
    if (!me?.cell_id) return;

    const sunday = getUpcomingSunday();

    const [{ data: memberData }, { data: requestData }, { data: attendanceData }] = await Promise.all([
      supabase.from('users').select('id, name').eq('cell_id', me.cell_id).eq('role', 'member'),
      supabase.from('prayer_requests').select('id, body, created_at, users(name)').eq('cell_id', me.cell_id).order('created_at', { ascending: false }),
      supabase.from('attendance_records').select('user_id, present').eq('cell_id', me.cell_id).eq('meeting_date', sunday),
    ]);

    const attendanceMap = Object.fromEntries((attendanceData ?? []).map(r => [r.user_id, r.present]));
    setMembers((memberData ?? []).map(m => ({ ...m, present: attendanceMap[m.id] ?? false })));
    setRequests(requestData ?? []);
  }

  async function toggleAttendance(memberId: string, present: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user?.id).single();
    const sunday = getUpcomingSunday();

    await supabase.from('attendance_records').upsert({
      user_id: memberId,
      cell_id: me?.cell_id,
      meeting_date: sunday,
      present,
    }, { onConflict: 'user_id,meeting_date' });

    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, present } : m));
  }

  function getUpcomingSunday() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + diff);
    return sunday.toISOString().split('T')[0];
  }

  return (
    <View style={styles.container}>
      <Header title="셀 리더 / Cell Leader" />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'prayers' && styles.tabActive]} onPress={() => setTab('prayers')}>
          <Text style={[styles.tabText, tab === 'prayers' && styles.tabTextActive]}>기도제목 / Prayers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'attendance' && styles.tabActive]} onPress={() => setTab('attendance')}>
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabTextActive]}>출석 / Attendance</Text>
        </TouchableOpacity>
      </View>

      {tab === 'prayers' ? (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.users?.name}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>기도제목이 없습니다 / No requests yet</Text>}
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Switch value={item.present} onValueChange={val => toggleAttendance(item.id, val)} />
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>셀원이 없습니다 / No members</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { fontSize: 15, color: '#999' },
  tabTextActive: { color: '#4F46E5', fontWeight: '600' },
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  cardName: { fontWeight: '600', fontSize: 15, marginBottom: 4 },
  cardBody: { fontSize: 15, color: '#333', lineHeight: 22 },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 6 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  memberName: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
