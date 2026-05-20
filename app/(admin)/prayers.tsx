import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type PrayerRequest = {
  id: string;
  body: string;
  created_at: string;
  prayCount: number;
  prayedByMe: boolean;
  userName: string;
  cellName: string;
};

export default function PrayersScreen() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (myId) loadRequests(myId);
  }, [myId]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);
  }

  async function loadRequests(userId: string) {
    const [{ data: prayers }, { data: myPrays }, { data: allPrays }, { data: allUsers }] = await Promise.all([
      supabase.from('prayer_requests')
        .select('id, body, created_at, user_id')
        .order('created_at', { ascending: false }),
      supabase.from('prayer_prays').select('prayer_id').eq('user_id', userId),
      supabase.from('prayer_prays').select('prayer_id'),
      supabase.from('users').select('id, name, cell_id, cells!users_cell_id_fkey(name)'),
    ]);

    const prayedSet = new Set((myPrays ?? []).map(p => p.prayer_id));
    const prayCountMap: Record<string, number> = {};
    (allPrays ?? []).forEach(p => { prayCountMap[p.prayer_id] = (prayCountMap[p.prayer_id] ?? 0) + 1; });

    const userMap: Record<string, { name: string; cellName: string }> = {};
    (allUsers ?? []).forEach((u: any) => {
      userMap[u.id] = { name: u.name ?? '', cellName: u.cells?.name ?? '' };
    });

    setRequests((prayers ?? []).map((r: any) => ({
      ...r,
      userName: userMap[r.user_id]?.name ?? '',
      cellName: userMap[r.user_id]?.cellName ?? '',
      prayCount: prayCountMap[r.id] ?? 0,
      prayedByMe: prayedSet.has(r.id),
    })));
  }

  async function togglePray(id: string, prayedByMe: boolean) {
    if (prayedByMe) {
      const { error } = await supabase.from('prayer_prays').delete().match({ prayer_id: id, user_id: myId });
      if (error) { Alert.alert('오류', error.message); return; }
    } else {
      const { error } = await supabase.from('prayer_prays').insert({ prayer_id: id, user_id: myId });
      if (error) { Alert.alert('오류', error.message); return; }
    }
    setRequests(prev => prev.map(r => r.id === id
      ? { ...r, prayedByMe: !prayedByMe, prayCount: r.prayCount + (prayedByMe ? -1 : 1) }
      : r
    ));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('prayerRequests')}</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.userName}</Text>
              <Text style={styles.cell}>{item.cellName}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR')}</Text>
              <TouchableOpacity
                style={[styles.prayBtn, item.prayedByMe && styles.prayBtnActive]}
                onPress={() => togglePray(item.id, item.prayedByMe)}
              >
                <Text style={[styles.prayBtnText, item.prayedByMe && styles.prayBtnTextActive]}>
                  🙏 {item.prayedByMe ? t('prayed') : t('prayTogether')}{item.prayCount > 0 ? ` ${item.prayCount}` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noPrayersAll')}</Text>}
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
  prayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  prayBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  prayBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  prayBtnTextActive: { color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
