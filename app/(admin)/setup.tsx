import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ChurchSetup() {
  const [churchName, setChurchName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

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

    const { error: userError } = await supabase
      .from('users')
      .update({ church_id: church.id })
      .eq('id', user.id);

    setSaving(false);

    if (userError) {
      Alert.alert('Error', userError.message);
      return;
    }

    router.replace('/(admin)');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>VanChurch</Text>
      <Text style={styles.subtitle}>{'교회 이름을 입력하세요\nEnter your church name'}</Text>
      <TextInput
        style={styles.input}
        placeholder="밴쿠버 한인 교회..."
        value={churchName}
        onChangeText={setChurchName}
        autoFocus
      />
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
