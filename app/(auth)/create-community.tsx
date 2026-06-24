import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CreateCommunity() {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
    const { data: church, error: churchErr } = await supabase
      .from('churches')
      .insert({ name: trimmed, is_public: isPublic, invite_token: token })
      .select('id')
      .single();

    if (churchErr || !church) {
      setError(churchErr?.message ?? '오류가 발생했어요');
      setLoading(false);
      return;
    }

    const { error: userErr } = await supabase
      .from('users')
      .update({ church_id: church.id, roles: ['pastor', 'admin', 'member'] })
      .eq('id', user.id);

    setLoading(false);
    if (userErr) { setError(userErr.message); return; }

    router.replace('/(admin)');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>공동체 만들기</Text>
        <Text style={styles.subtitle}>새로운 공동체를 시작하세요{'\n'}관리자 권한이 부여됩니다</Text>

        <Text style={styles.label}>공동체 이름 *</Text>
        <TextInput
          style={styles.input}
          placeholder="VKPC 밴쿠버 한인 장로교회"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={create}
        />

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>공개 공동체</Text>
            <Text style={styles.toggleSub}>검색으로 찾을 수 있어요</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: '#2563EB' }}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={create}
          disabled={!name.trim() || loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : '만들기 / Create'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginBottom: 36, lineHeight: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 15, fontSize: 17, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 24 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', marginBottom: 32 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  toggleSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  error: { color: '#DC2626', fontSize: 14, marginBottom: 16 },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
