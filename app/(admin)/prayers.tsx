import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

type PrayerRequest = { id: string; body: string; created_at: string; pray_count: number; users: { name: string; cells: { name: string } | null } | null };

export default function PrayersScreen() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);

  useEffect(() => {
    loadRequests();
    const channel = supabase
      .channel('prayer_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prayer_requests' }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadRequests() {
    const { data } = await supabase
      .from('prayer_requests')
      .select('id, body, created_at, pray_count, users(name, cells!users_cell_id_fkey(name))')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as any);
  }

  async function pray(id: string, currentCount: number) {
    const { error } = await supabase
      .from('prayer_requests')
      .update({ pray_count: currentCount + 1 })
      .eq('id', id);
    if (error) { Alert.alert('오류', error.message); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, pray_count: r.pray_count + 1 } : r));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>기도제목</Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.users?.name}</Text>
              <Text style={styles.cell}>{item.users?.cells?.name}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR')}</Text>
              <TouchableOpacity style={[styles.prayBtn, item.pray_count > 0 && styles.prayBtnActive]} onPress={() => pray(item.id, item.pray_count)}>
                <Text style={[styles.prayBtnText, item.pray_count > 0 && styles.prayBtnTextActive]}>
                  🙏 함께 기도{item.pray_count > 0 ? ` ${item.pray_count}` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>기도제목이 없습니다</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  list: { padding: 16 },
  card: { padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontWeight: '700', fontSize: 15, color: '#111827' },
  cell: { fontSize: 12, color: '#2563EB', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  body: { fontSize: 15, color: '#374151', lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  date: { fontSize: 12, color: '#9CA3AF' },
  prayBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  prayBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  prayBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  prayBtnTextActive: { color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
