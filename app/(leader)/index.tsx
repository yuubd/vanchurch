import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type PrayerRequest = {
  id: string;
  body: string;
  created_at: string;
  pray_count: number;
  users: { name: string } | null;
};

export default function LeaderPrayers() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [cellName, setCellName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('leader_prayers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prayer_requests' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user!.id).single();
    if (!me?.cell_id) return;

    const [{ data: cell }, { data: prayers }] = await Promise.all([
      supabase.from('cells').select('name').eq('id', me.cell_id).single(),
      supabase.from('prayer_requests')
        .select('id, body, created_at, pray_count, users(name)')
        .eq('cell_id', me.cell_id)
        .order('created_at', { ascending: false }),
    ]);

    setCellName(cell?.name ?? '');
    setRequests((prayers ?? []) as any);
  }

  async function pray(id: string, currentCount: number) {
    const { error } = await supabase
      .from('prayer_requests')
      .update({ pray_count: currentCount + 1 })
      .eq('id', id);
    if (error) { Alert.alert('오류', error.message); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, pray_count: r.pray_count + 1 } : r));
  }

  async function submit() {
    if (!draft.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('prayer_requests').insert({ user_id: user?.id, body: draft.trim() });
    setLoading(false);
    if (error) { Alert.alert('오류', error.message); return; }
    setDraft('');
    setModalVisible(false);
    loadData();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>기도제목</Text>
        {cellName ? <Text style={styles.cellBadge}>{cellName}</Text> : null}
      </View>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.users?.name}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR')}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.cardFooter}>
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

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>기도제목 나누기</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setDraft(''); }}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="기도제목을 나눠주세요..."
            multiline
            value={draft}
            onChangeText={setDraft}
            textAlignVertical="top"
            autoFocus
            maxLength={500}
          />
          <Text style={styles.charCount}>{draft.length} / 500</Text>
          <TouchableOpacity
            style={[styles.submitBtn, (!draft.trim() || loading) && styles.submitDisabled]}
            onPress={submit}
            disabled={!draft.trim() || loading}
          >
            <Text style={styles.submitText}>{loading ? '전송 중...' : '나누기'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  cellBadge: { fontSize: 13, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, overflow: 'hidden' },
  list: { padding: 16, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontWeight: '700', fontSize: 15, color: '#111827' },
  date: { fontSize: 12, color: '#9CA3AF' },
  body: { fontSize: 15, color: '#374151', lineHeight: 22 },
  cardFooter: { marginTop: 12 },
  prayBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  prayBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  prayBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  prayBtnTextActive: { color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  modal: { flex: 1, padding: 24, paddingTop: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, fontSize: 16, height: 180, lineHeight: 24, backgroundColor: '#F9FAFB' },
  charCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 6, marginBottom: 16 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
