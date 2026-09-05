import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/friendlyError';
import { showAlert } from '../../lib/alert';
import { useTranslation } from '../../lib/i18n';
import { isValidDate } from '../../lib/dob';

type Invite = { id: string; name: string; date_of_birth: string | null; church_name: string; cell_name: string | null };

export default function InviteConfirm() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const nameRef = useRef<TextInput>(null);
  const { t } = useTranslation();

  useEffect(() => {
    supabase.rpc('get_my_pending_invite').then(({ data }) => {
      const row = (data ?? [])[0] as Invite | undefined;
      if (!row) {
        router.replace('/(auth)/profile-setup');
        return;
      }
      setInvite(row);
      setName(row.name ?? '');
      setDob(row.date_of_birth ?? '');
      setLoadingInvite(false);
    });
  }, []);

  async function accept() {
    if (!invite) return;
    const trimmed = name.trim();
    if (!trimmed || !isValidDate(dob)) return;
    setBusy(true);
    const { error } = await supabase.rpc('accept_invite', {
      invite_id: invite.id,
      override_name: trimmed,
      override_dob: dob,
    });
    setBusy(false);
    if (error) {
      showAlert(t('error'), friendlyError(error));
      return;
    }
    router.replace('/(member)');
  }

  function decline() {
    if (!invite) return;
    showAlert(t('declineInviteConfirm'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('declineInvite'), style: 'destructive', onPress: async () => {
          setBusy(true);
          await supabase.rpc('decline_invite', { invite_id: invite.id });
          setBusy(false);
          router.replace('/(auth)/profile-setup');
        },
      },
    ]);
  }

  if (loadingInvite || !invite) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1D3FAA" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>{t('inviteConfirmTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('inviteConfirmSubtitle').replace('%', invite.church_name)}
          {invite.cell_name ? ` · ${invite.cell_name}` : ''}
        </Text>

        <Text style={styles.label}>{t('name')}</Text>
        <TextInput
          ref={nameRef}
          style={styles.input}
          placeholder={t('namePlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
        />
        <Text style={styles.label}>{t('dateOfBirth')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('dateOfBirthPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={dob}
          onChangeText={setDob}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />
        {!!dob && !isValidDate(dob) && <Text style={styles.error}>{t('dateOfBirthInvalid')}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || !isValidDate(dob) || busy) && styles.btnDisabled]}
          onPress={accept}
          disabled={!name.trim() || !isValidDate(dob) || busy}
        >
          <Text style={styles.btnText}>{busy ? '...' : t('acceptInvite')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={decline} disabled={busy}>
          <Text style={styles.declineText}>{t('declineInvite')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginBottom: 40, lineHeight: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 15, fontSize: 17, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  declineBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  declineText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 12, marginTop: -12 },
});
