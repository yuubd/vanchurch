import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

// Numbers allowed to sign in during testing (before Twilio is configured).
// Add/remove numbers here. Use 10-digit local or 11-digit with leading 1.
const ALLOW_LIST = [
  '+17788683636',
  '+10000000000',
  '+11111111111',
  '+12222222222',
  '+11000000000',
  '+11000000001',
  '+11000000002',
  '+11000000003',
  '+11000000004',
  '+11000000005',
  '+11000000006',
  '+11000000007',
  '+11000000008',
  '+11000000009',
];

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length >= 11) return '+' + digits;
  if (digits.length >= 1) return '+1' + digits; // assume country code 1
  return '+' + digits;
}

function isAllowed(phone: string): boolean {
  return ALLOW_LIST.includes(toE164(phone));
}

function formatPhone(digits: string, deleting: boolean): string {
  if (digits.length < 3) return digits;
  if (digits.length === 3) return deleting ? digits : `${digits}-`;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 6) return deleting ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3)}-`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    const deleting = text.length < phone.length;
    setPhone(formatPhone(digits, deleting));
  }

  async function sendOtp() {
    const formatted = toE164(phone);
    if (phone.replace(/\D/g, '').length < 10) return;
    if (!isAllowed(phone)) {
      Alert.alert('알림', '현재 테스트 중인 번호만 로그인 가능합니다.\nOnly approved numbers can sign in during testing.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (error) {
      setLoading(false);
      Alert.alert('오류', error.message);
      return;
    }
    // Edge function saves OTP asynchronously — poll until it appears (up to 5s)
    let otp: string | null = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      const { data } = await supabase.from('test_otps').select('otp').eq('phone', formatted).maybeSingle();
      if (data?.otp) { otp = data.otp; break; }
    }
    if (!otp) {
      setLoading(false);
      Alert.alert('오류', 'OTP를 가져오지 못했습니다. 다시 시도해주세요.');
      return;
    }
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' });
    setLoading(false);
    if (verifyError) Alert.alert('오류', verifyError.message);
    // On success _layout.tsx handles redirect via onAuthStateChange
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
            onChangeText={handlePhoneChange}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? '...' : '로그인'}</Text>
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
});
