import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useTranslation } from '../../lib/i18n';

const MAX_CHARS = 500;

export default function MemberHome() {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  async function submit() {
    if (!request.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('prayer_requests').insert({ user_id: user?.id, body: request.trim() });
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
      <Header title={t('prayerRequests')} />
      <View style={styles.inner}>
        <Text style={styles.subtitle}>{t('prayerSubtitle')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('sharePrayer')}
          multiline
          value={request}
          onChangeText={text => setRequest(text.slice(0, MAX_CHARS))}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{request.length} / {MAX_CHARS}</Text>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '...' : t('submit')}</Text>
        </TouchableOpacity>
        {submitted && <Text style={styles.success}>{t('sent')}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 20, paddingTop: 16 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 22, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, padding: 16, fontSize: 15, height: 180, lineHeight: 22 },
  charCount: { fontSize: 12, color: '#bbb', textAlign: 'right', marginTop: 6 },
  button: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  success: { textAlign: 'center', marginTop: 16, color: '#16a34a', fontSize: 15 },
});
