import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

type PrayerRequest = { id: string; body: string; created_at: string; users: { name: string; cells: { name: string } } };

export default function PastorHome() {
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
      .select('id, body, created_at, users(name, cells(name))')
      .order('created_at', { ascending: false });

    setRequests(data ?? []);
  }

  return (
    <View style={styles.container}>
      <Header title="기도제목 / Prayer Requests" />
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.users?.name}</Text>
              <Text style={styles.cell}>{item.users?.cells?.name}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>기도제목이 없습니다 / No requests yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16, paddingHorizontal: 16 },
  card: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontWeight: '600', fontSize: 15 },
  cell: { fontSize: 13, color: '#4F46E5' },
  body: { fontSize: 15, color: '#333', lineHeight: 22 },
  date: { fontSize: 12, color: '#aaa', marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
