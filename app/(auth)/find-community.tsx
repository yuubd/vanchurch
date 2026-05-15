import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Church = { id: string; name: string; city?: string };

export default function FindCommunity() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Church | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  // community request form fields
  const [reqChurch, setReqChurch] = useState('');
  const [reqPastor, setReqPastor] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.from('churches').select('id, name').order('name').then(({ data }) => {
      setChurches((data ?? []) as Church[]);
    });
  }, []);

  const filtered = query.trim()
    ? churches.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : churches;

  async function proceed() {
    if (!selected) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('users').update({ church_id: selected.id }).eq('id', user?.id);
    setLoading(false);
    if (error) {
      Alert.alert('오류', error.message);
    } else {
      router.replace('/(auth)/welcome');
    }
  }

  async function submitRequest() {
    if (!reqChurch.trim() || !reqPastor.trim() || !reqAddress.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('church_requests').insert({
      church_name: reqChurch.trim(),
      pastor_name: reqPastor.trim(),
      church_address: reqAddress.trim(),
      requester_name: reqName.trim() || null,
      note: reqNote.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('오류', error.message);
    } else {
      setRequestSent(true);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>공동체 찾기</Text>
        <Text style={styles.subtitle}>소속 공동체를 검색해주세요</Text>
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
            <View style={{ flex: 1 }}>
              <Text style={[styles.churchName, selected?.id === item.id && styles.churchNameSelected]}>{item.name}</Text>
            </View>
            {selected?.id === item.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>검색 결과가 없습니다</Text>
        }
        ListFooterComponent={
          <TouchableOpacity onPress={() => setShowRequest(true)} style={styles.addLink}>
            <Text style={styles.addLinkText}>+ 우리 공동체 추가하기</Text>
          </TouchableOpacity>
        }
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!selected || loading) && styles.btnDisabled]}
          onPress={proceed}
          disabled={!selected || loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : '다음 / Next'}</Text>
        </TouchableOpacity>
      </View>

      {/* Community request modal */}
      <Modal visible={showRequest} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { if (!requestSent) setShowRequest(false); }} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            {requestSent ? (
              <View style={styles.sentWrap}>
                <Text style={styles.sentIcon}>✓</Text>
                <Text style={styles.sentTitle}>문의가 접수되었어요</Text>
                <Text style={styles.sentSub}>담당 목사님과 연락 후{'\n'}빠르게 추가해드릴게요</Text>
                <TouchableOpacity style={styles.btn} onPress={() => { setShowRequest(false); setRequestSent(false); }}>
                  <Text style={styles.btnText}>확인</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetTitle}>공동체 추가 문의</Text>
                <Text style={styles.sheetSub}>문의를 남겨주시면 담당 목사님과 연락 후 빠르게 추가해드릴게요</Text>

                <Text style={styles.fieldLabel}>교회 이름 *</Text>
                <TextInput style={styles.fieldInput} placeholder="밴쿠버 한인교회" value={reqChurch} onChangeText={setReqChurch} />

                <Text style={styles.fieldLabel}>담임 목사님 성함 *</Text>
                <TextInput style={styles.fieldInput} placeholder="홍길동 목사" value={reqPastor} onChangeText={setReqPastor} />

                <Text style={styles.fieldLabel}>교회 주소 *</Text>
                <TextInput style={styles.fieldInput} placeholder="123 Main St, Vancouver, BC" value={reqAddress} onChangeText={setReqAddress} />

                <Text style={styles.fieldLabel}>성함 <Text style={styles.optional}>(선택)</Text></Text>
                <TextInput style={styles.fieldInput} placeholder="홍길동" value={reqName} onChangeText={setReqName} />

                <Text style={styles.fieldLabel}>추가 메모 <Text style={styles.optional}>(선택)</Text></Text>
                <TextInput
                  style={[styles.fieldInput, { height: 88, textAlignVertical: 'top' }]}
                  placeholder="전달하고 싶은 내용을 적어주세요"
                  multiline
                  value={reqNote}
                  onChangeText={setReqNote}
                />

                <TouchableOpacity
                  style={[styles.btn, (!reqChurch.trim() || !reqPastor.trim() || !reqAddress.trim() || submitting) && styles.btnDisabled]}
                  onPress={submitRequest}
                  disabled={!reqChurch.trim() || !reqPastor.trim() || !reqAddress.trim() || submitting}
                >
                  <Text style={styles.btnText}>{submitting ? '...' : '문의 보내기'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRequest(false)}>
                  <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 28, paddingBottom: 12, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF' },
  search: { marginHorizontal: 24, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 20 },
  churchRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 2 },
  churchRowSelected: { backgroundColor: '#EFF6FF' },
  churchName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  churchNameSelected: { color: '#2563EB' },
  check: { fontSize: 16, fontWeight: '700', color: '#2563EB', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 14 },
  addLink: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  addLinkText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  footer: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#F9FAFB' },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', inset: 0 } as any,
  sheet: { backgroundColor: '#fff', borderRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24, paddingBottom: 48, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sheetSub: { fontSize: 14, color: '#9CA3AF', lineHeight: 21, marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 4 },
  optional: { fontWeight: '400', color: '#9CA3AF' },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  cancelBtn: { alignItems: 'center', padding: 14, marginTop: 4 },
  cancelText: { color: '#9CA3AF', fontSize: 14 },
  // Sent confirmation
  sentWrap: { alignItems: 'center', paddingVertical: 24 },
  sentIcon: { fontSize: 48, marginBottom: 20 },
  sentTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 10, letterSpacing: -0.5 },
  sentSub: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
});
