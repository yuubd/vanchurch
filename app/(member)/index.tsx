import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

export default function MemberHome() {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!request.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user?.id,
      body: request.trim(),
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRequest('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="기도제목 / Prayer Request" />
      <TextInput
        style={styles.input}
        placeholder="기도제목을 입력하세요…&#10;Write your prayer request…"
        multiline
        numberOfLines={6}
        value={request}
        onChangeText={setRequest}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '...' : '보내기 / Send'}</Text>
      </TouchableOpacity>
      {submitted && <Text style={styles.success}>✓ 전송되었습니다 / Sent!</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, height: 160, marginBottom: 16 },
  button: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 18, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  success: { textAlign: 'center', marginTop: 16, color: '#16a34a', fontSize: 16 },
});
