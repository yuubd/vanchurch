import { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import Turnstile from '../../lib/Turnstile';
import { useTranslation } from '../../lib/i18n';

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

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const otpRef = useRef<TextInput>(null);

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
    if (!captchaToken) { setError('보안 확인을 기다리는 중입니다. 잠시 후 다시 시도해주세요'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164, options: { captchaToken } });
    setCaptchaToken('');
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
    setTimeout(() => otpRef.current?.focus(), 100);
  }

  async function verifyOtp() {
    const e164 = toE164(phone);
    if (otp.length < 6) { setError(t('otpRequired')); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' });
    setLoading(false);
    if (err) { setError(t('otpInvalid')); return; }
    // _layout.tsx handles redirect via onAuthStateChange
  }

  function goBack() {
    setStep('phone');
    setOtp('');
    setError('');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>VanChurch</Text>
        <Text style={styles.logoSub}>기도와 교제, 한 곳에서</Text>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>핸드폰 번호</Text>
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>인증번호 받기</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TouchableOpacity onPress={goBack} style={styles.back}>
              <Text style={styles.backText}>‹ {toE164(phone)}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>인증번호 6자리</Text>
            <Text style={styles.otpHint}>문자로 받은 코드를 입력해주세요</Text>
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>확인</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resend} onPress={sendOtp} disabled={loading}>
              <Text style={styles.resendText}>코드 재전송</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
      <Turnstile onToken={handleCaptchaToken} onError={handleCaptchaError} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
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
  error: { color: '#DC2626', fontSize: 13, marginTop: 16, textAlign: 'center' },
});
