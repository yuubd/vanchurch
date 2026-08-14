import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useDelayedMount } from '../../lib/useDelayedMount';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const nameRef = useRef<TextInput>(null);
  const inputReady = useDelayedMount();

  useEffect(() => {
    if (inputReady) nameRef.current?.focus();
  }, [inputReady]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('users').update({ name: trimmed }).eq('id', user?.id);
    if (error) {
      setLoading(false);
      Alert.alert('오류', error.message);
      return;
    }

    // Members pre-added by an admin/cell leader already have a church_id — skip onboarding
    // (community pick/create) and go straight to their role home.
    const { data: profile } = await supabase.from('users').select('church_id, roles').eq('id', user?.id).single();
    setLoading(false);
    if (!profile?.church_id) {
      router.replace('/(auth)/onboarding');
      return;
    }
    const roles: string[] = profile.roles ?? ['member'];
    if (roles.includes('admin') || roles.includes('pastor')) {
      router.replace('/(admin)');
    } else if (roles.includes('cell_leader')) {
      router.replace('/(leader)');
    } else {
      router.replace('/(member)');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>이름을 입력해주세요</Text>
        <Text style={styles.label}>이름</Text>
        {inputReady ? (
          <TextInput
            ref={nameRef}
            style={styles.input}
            placeholder="홍길동"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={save}
          />
        ) : (
          <View style={styles.input} />
        )}
        <TouchableOpacity
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={save}
          disabled={!name.trim() || loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : '다음 / Next'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginBottom: 40, lineHeight: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 15, fontSize: 17, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
