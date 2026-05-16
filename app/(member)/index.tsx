import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type Prayer = { id: string; body: string; created_at: string };

export default function MemberHome() {
  const [name, setName] = useState('');
  const [churchCell, setChurchCell] = useState('');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('name, cells!users_cell_id_fkey(name), churches!users_church_id_fkey(name)')
      .eq('id', user.id)
      .single();

    setName((data as any)?.name ?? '');
    const church = (data as any)?.churches?.name ?? '';
    const cell = (data as any)?.cells?.name ?? '';
    setChurchCell([church, cell].filter(Boolean).join(' · '));

    const { data: prayerData } = await supabase
      .from('prayer_requests')
      .select('id, body, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setPrayers(prayerData ?? []);
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
      <View style={styles.topRow}>
        <View />
        <View style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
        </View>
      </View>

      <FlatList
        data={prayers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.greeting}>안녕하세요, {name}님 👋</Text>
            <Text style={styles.sub}>{churchCell}</Text>
            <Text style={styles.sectionLabel}>최근 내 기도제목</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 기도제목이 없어요{'\n'}아래 버튼으로 첫 기도제목을 나눠보세요 🙏</Text>}
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
          <TouchableOpacity style={[styles.submitBtn, (!draft.trim() || loading) && styles.submitDisabled]} onPress={submit} disabled={!draft.trim() || loading}>
            <Text style={styles.submitText}>{loading ? '전송 중...' : '나누기'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 },
  avatarBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#1D4ED8' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 28 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 14 },
  card: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  body: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 6 },
  date: { fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 48, color: '#9CA3AF', fontSize: 15, lineHeight: 24 },
  fab: { position: 'absolute', bottom: 88, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  modal: { flex: 1, padding: 24, paddingTop: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, fontSize: 16, height: 180, lineHeight: 24, backgroundColor: '#F9FAFB' },
  charCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 6, marginBottom: 16 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
