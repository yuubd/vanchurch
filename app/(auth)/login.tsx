import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Turnstile, { TurnstileRef } from '../../lib/Turnstile';
import { useTranslation } from '../../lib/i18n';
import { isBiometricEnabled, getStoredSession, promptBiometric, clearBiometrics, storeSession } from '../../lib/biometrics';

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length >= 11) return '+' + digits;
  return '+1' + digits;
}

function formatDisplay(digits: string, deleting: boolean): string {
  if (digits.length < 3) return digits;
  if (digits.length === 3) return deleting ? digits : `${digits}-`;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 6) return deleting ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Dev-only test numbers — add these in Supabase Auth > Phone > Test phone numbers with OTP 000000
const DEV_TEST_PHONES = __DEV__ ? ['+10000000000'] : [];

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const otpRef = useRef<TextInput>(null);
  const turnstileRef = useRef<TurnstileRef>(null);

  useEffect(() => {
    tryBiometricLogin();
  }, []);

  async function tryBiometricLogin() {
    const enabled = await isBiometricEnabled();
    if (!enabled) return;
    const stored = await getStoredSession();
    if (!stored) return;
    setBiometricAvailable(true);
    const passed = await promptBiometric();
    if (!passed) return;
    const { error } = await supabase.auth.setSession(stored);
    if (error) {
      await clearBiometrics();
      setBiometricAvailable(false);
    }
    // success → _layout.tsx onAuthStateChange handles redirect
  }

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(false);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaError(true);
  }, []);

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    const deleting = text.length < phone.length;
    setPhone(formatDisplay(digits, deleting));
    setError('');
  }

  async function sendOtp() {
    const e164 = toE164(phone);
    if (phone.replace(/\D/g, '').length < 10) {
      setError(t('phoneRequired'));
      return;
    }
    const isTestPhone = DEV_TEST_PHONES.includes(e164);
    // Turnstile is web-only. Native has no captcha widget yet, so skip the client-side
    // check on native entirely (Supabase captcha must stay OFF until native Turnstile is added).
    const skipCaptcha = isTestPhone || Platform.OS !== 'web';
    if (!skipCaptcha && !captchaToken) {
      setError(t('captchaWaiting'));
      return;
    }
    setLoading(true);
    setError('');
    const opts = skipCaptcha ? {} : { captchaToken };
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164, options: opts });
    if (!isTestPhone) { setCaptchaToken(''); turnstileRef.current?.reset(); }
    setLoading(false);
    if (err) {
      const m = (err.message || '').toLowerCase();
      if (m.includes('rate') || m.includes('too many') || m.includes('security purposes')) {
        setError(t('tooManyRequests'));
      } else {
        setError(t('signInError'));
      }
      return;
    }
    if (isTestPhone) setOtp('000000');
    setStep('otp');
    setTimeout(() => otpRef.current?.focus(), 100);
  }

  async function verifyOtp() {
    const e164 = toE164(phone);
    if (otp.length < 6) { setError(t('otpRequired')); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' });
    setLoading(false);
    if (err) { setError(t('otpInvalid')); return; }
    // Store session for future biometric login if enabled
    if (data.session) {
      const enabled = await isBiometricEnabled();
      if (enabled) await storeSession(data.session.access_token, data.session.refresh_token);
    }
    // _layout.tsx handles redirect via onAuthStateChange
  }

  function goBack() {
    setStep('phone');
    setOtp('');
    setError('');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>{t('brandName')}</Text>
        <Text style={styles.logoSub}>{t('tagline')}</Text>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>{t('phoneLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="604-000-0000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={sendOtp}
            />
            <TouchableOpacity
              style={[styles.btn, (phone.replace(/\D/g, '').length < 10 || loading) && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={phone.replace(/\D/g, '').length < 10 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('getOtp')}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TouchableOpacity onPress={goBack} style={styles.back}>
              <Text style={styles.backText}>‹ {toE164(phone)}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>{t('otpSixDigit')}</Text>
            <Text style={styles.otpHint}>{t('otpHint')}</Text>
            <TextInput
              ref={otpRef}
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              keyboardType="number-pad"
              value={otp}
              onChangeText={t => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={verifyOtp}
            />
            <TouchableOpacity
              style={[styles.btn, (otp.length < 6 || loading) && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={otp.length < 6 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('confirm')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resend} onPress={sendOtp} disabled={loading}>
              <Text style={styles.resendText}>{t('resendCode')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {biometricAvailable && step === 'phone' && (
          <TouchableOpacity style={styles.biometricBtn} onPress={tryBiometricLogin}>
            <Text style={styles.biometricText}>{t('faceIdLogin')}</Text>
          </TouchableOpacity>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <Turnstile ref={turnstileRef} onToken={handleCaptchaToken} onError={handleCaptchaError} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '900', color: '#2563EB', textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  logoSub: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginBottom: 52 },
  form: {},
  back: { marginBottom: 20 },
  backText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  otpHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 12, marginTop: -4 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 15, fontSize: 17, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 16 },
  otpInput: { fontSize: 28, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: '#9CA3AF' },
  biometricBtn: { alignItems: 'center', marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB' },
  biometricText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 16, textAlign: 'center' },
});
