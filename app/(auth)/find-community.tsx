import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Church = { id: string; name: string };

export default function FindCommunity() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Church | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.from('churches').select('id, name').eq('is_public', true).order('name')
      .then(({ data }) => setChurches((data ?? []) as Church[]));
  }, []);

  const filtered = query.trim()
    ? churches.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : churches;

  async function requestJoin() {
    if (!selected) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    await supabase.from('join_requests').upsert(
      { user_id: user.id, church_id: selected.id, status: 'pending' },
      { onConflict: 'user_id,church_id', ignoreDuplicates: true }
    );

    setLoading(false);
    router.replace({ pathname: '/(auth)/pending', params: { churchName: selected.name } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>공동체 찾기</Text>
        <Text style={styles.subtitle}>참여할 공동체를 검색하세요</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="교회 이름 검색..."
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.churchRow, selected?.id === item.id && styles.churchRowSelected]}
            onPress={() => setSelected(item)}
          >
            <Text style={[styles.churchName, selected?.id === item.id && styles.churchNameSelected]}>{item.name}</Text>
            {selected?.id === item.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>검색 결과가 없습니다</Text>}
        ListFooterComponent={
          <TouchableOpacity onPress={() => router.replace('/(auth)/create-community')} style={styles.createLink}>
            <Text style={styles.createLinkText}>+ 공동체 직접 만들기</Text>
          </TouchableOpacity>
        }
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!selected || loading) && styles.btnDisabled]}
          onPress={requestJoin}
          disabled={!selected || loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : '참여 요청 / Request to join'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 28, paddingBottom: 12, paddingTop: 60 },
  back: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF' },
  search: { marginHorizontal: 24, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 20 },
  churchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  churchRowSelected: { backgroundColor: '#EFF6FF' },
  churchName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  churchNameSelected: { color: '#2563EB' },
  check: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 14 },
  createLink: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  createLinkText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  footer: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#F3F4F6' },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
