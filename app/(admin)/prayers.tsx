import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type PrayerRequest = { id: string; body: string; created_at: string; users: { name: string; cells: { name: string } | null } | null };

export default function PrayersScreen() {
  const router = useRouter();
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
      .select('id, body, created_at, users(name, cells!users_cell_id_fkey(name))')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
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
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR')}</Text>
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
  back: { marginBottom: 8 },
  backText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  list: { padding: 16 },
  card: { padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontWeight: '700', fontSize: 15, color: '#111827' },
  cell: { fontSize: 12, color: '#2563EB', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  body: { fontSize: 15, color: '#374151', lineHeight: 22 },
  date: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
