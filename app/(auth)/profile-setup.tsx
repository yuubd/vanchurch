import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useDelayedMount } from '../../lib/useDelayedMount';
import { friendlyError } from '../../lib/friendlyError';
import { showAlert } from '../../lib/alert';
import { useTranslation } from '../../lib/i18n';
import { isValidDate } from '../../lib/dob';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const nameRef = useRef<TextInput>(null);
  const inputReady = useDelayedMount();
  const { t } = useTranslation();

  useEffect(() => {
    if (inputReady) nameRef.current?.focus();
  }, [inputReady]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !isValidDate(dob)) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('users').update({ name: trimmed, date_of_birth: dob }).eq('id', user?.id);
    if (error) {
      setLoading(false);
      showAlert(t('error'), friendlyError(error));
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
        <Text style={styles.title}>{t('profileSetupTitle')}</Text>
        <Text style={styles.subtitle}>{t('profileSetupSubtitle')}</Text>
        <Text style={styles.label}>{t('name')}</Text>
        {inputReady ? (
          <TextInput
            ref={nameRef}
            style={styles.input}
            placeholder={t('namePlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={save}
          />
        ) : (
          <View style={styles.input} />
        )}
        <Text style={styles.label}>{t('dateOfBirth')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('dateOfBirthPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={dob}
          onChangeText={setDob}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {!!dob && !isValidDate(dob) && <Text style={styles.error}>{t('dateOfBirthInvalid')}</Text>}
        <TouchableOpacity
          style={[styles.btn, (!name.trim() || !isValidDate(dob) || loading) && styles.btnDisabled]}
          onPress={save}
          disabled={!name.trim() || !isValidDate(dob) || loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : t('confirm')}</Text>
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
  error: { color: '#DC2626', fontSize: 13, marginBottom: 12, marginTop: -12 },
});
