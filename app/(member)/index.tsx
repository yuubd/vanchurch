import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

type Prayer = { id: string; body: string; created_at: string; pray_count: number };

export default function MemberHome() {
  const [name, setName] = useState('');
  const [churchCell, setChurchCell] = useState('');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
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
      .select('id, body, created_at, pray_count')
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
    loadData();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={prayers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.greeting}>안녕하세요, {name}님 👋</Text>
            <Text style={styles.sub}>{churchCell}</Text>

            <View style={styles.compose}>
              <TextInput
                style={styles.input}
                placeholder="기도제목을 나눠주세요..."
                multiline
                value={draft}
                onChangeText={setDraft}
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={styles.composeFooter}>
                <Text style={styles.charCount}>{draft.length} / 500</Text>
                <TouchableOpacity
                  style={[styles.submitBtn, (!draft.trim() || loading) && styles.submitDisabled]}
                  onPress={submit}
                  disabled={!draft.trim() || loading}
                >
                  <Text style={styles.submitText}>{loading ? '전송 중...' : '나누기'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionLabel}>최근 내 기도제목</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</Text>
              {item.pray_count > 0 && (
                <Text style={styles.prayedBadge}>🙏 {item.pray_count}명이 기도했어요</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 기도제목이 없어요 🙏</Text>}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
  compose: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, backgroundColor: '#F9FAFB', marginBottom: 32 },
  input: { fontSize: 16, color: '#111827', lineHeight: 24, minHeight: 100, textAlignVertical: 'top' },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  charCount: { fontSize: 12, color: '#9CA3AF' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 14 },
  card: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  body: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#9CA3AF' },
  prayedBadge: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 24, color: '#9CA3AF', fontSize: 15 },
});
