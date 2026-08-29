import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { useDelayedMount } from '../../lib/useDelayedMount';

export default function ChurchSetup() {
  const [churchName, setChurchName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const nameRef = useRef<TextInput>(null);
  const inputReady = useDelayedMount();

  useEffect(() => {
    if (inputReady) nameRef.current?.focus();
  }, [inputReady]);

  async function createChurch() {
    if (!churchName.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .insert({ name: churchName.trim() })
      .select('id')
      .single();

    if (churchError) {
      setSaving(false);
      Alert.alert('Error', churchError.message);
      return;
    }

    const { error: userError } = await supabase.rpc('claim_new_church', { target_church_id: church.id });

    setSaving(false);

    if (userError) {
      Alert.alert('Error', userError.message);
      return;
    }

    router.replace('/(admin)');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{t('brandName')}</Text>
      <Text style={styles.subtitle}>{'공동체 이름을 입력하세요\nEnter your community name'}</Text>
      {inputReady ? (
        <TextInput
          ref={nameRef}
          style={styles.input}
          placeholder="밴쿠버 한인 공동체..."
          placeholderTextColor="#9CA3AF"
          value={churchName}
          onChangeText={setChurchName}
        />
      ) : (
        <View style={styles.input} />
      )}
      <TouchableOpacity
        style={[styles.button, saving && styles.disabled]}
        onPress={createChurch}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? '...' : '시작하기 / Get started'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 40, lineHeight: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 20, marginBottom: 16 },
  button: { backgroundColor: '#2563EB', borderRadius: 12, padding: 18, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
