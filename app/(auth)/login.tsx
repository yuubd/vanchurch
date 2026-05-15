import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

// Numbers allowed to sign in during testing (before Twilio is configured).
// Add/remove numbers here. Use 10-digit local or 11-digit with leading 1.
const ALLOW_LIST = [
  '+17788683636',
];

type Step = 'phone' | 'otp';

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

function isAllowed(phone: string): boolean {
  return ALLOW_LIST.includes(toE164(phone));
}

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  async function sendOtp() {
    const formatted = toE164(phone);
    if (formatted.length < 10) return;
    if (!isAllowed(phone)) {
      Alert.alert('알림', '현재 테스트 중인 번호만 로그인 가능합니다.\nOnly approved numbers can sign in during testing.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) {
      Alert.alert('오류', error.message);
    } else {
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 150);
    }
  }

  async function verifyOtp(code: string) {
    if (code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: code,
      type: 'sms',
    });
    setLoading(false);
    if (error) {
      Alert.alert('오류', '인증번호가 맞지 않습니다. 다시 시도해주세요.');
      setOtp('');
    }
    // On success _layout.tsx handles redirect via onAuthStateChange
  }

  if (step === 'otp') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }} style={styles.back}>
            <Text style={styles.backText}>‹ 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>인증번호 입력</Text>
          <Text style={styles.subtitle}>{toE164(phone)}{'\n'}으로 전송된 6자리 번호를 입력해주세요</Text>
          <TextInput
            ref={otpRef}
            style={styles.otpInput}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={code => { setOtp(code); verifyOtp(code); }}
          />
          {loading && <Text style={styles.hint}>확인 중...</Text>}
          <TouchableOpacity onPress={() => { setOtp(''); sendOtp(); }}>
            <Text style={styles.resend}>인증번호 재전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>VanChurch</Text>
        <Text style={styles.logoSub}>기도와 교제, 한 곳에서</Text>
        <View style={styles.form}>
          <Text style={styles.label}>핸드폰 번호</Text>
          <TextInput
            style={styles.input}
            placeholder="(604) 000-0000"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? '...' : '인증번호 받기'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '900', color: '#2563EB', textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  logoSub: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginBottom: 52 },
  form: {},
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 15, fontSize: 17, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 16 },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { marginBottom: 36 },
  backText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF', lineHeight: 24, marginBottom: 36 },
  otpInput: { borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, padding: 18, fontSize: 36, fontWeight: '800', color: '#2563EB', backgroundColor: '#EFF6FF', textAlign: 'center', letterSpacing: 14, marginBottom: 16 },
  hint: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginBottom: 16 },
  resend: { textAlign: 'center', color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
