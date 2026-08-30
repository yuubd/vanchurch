import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

export default function Onboarding() {
  const router = useRouter();
  const { t } = useTranslation();

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.logo}>⛪</Text>
        <Text style={styles.title}>{t('brandName')}</Text>
        <Text style={styles.sub}>{t('onboardingSubtitle')}</Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(auth)/create-community')}>
          <Text style={styles.cardIcon}>✨</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('createCommunityCard')}</Text>
            <Text style={styles.cardSub}>{t('createCommunityCardSub')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(auth)/find-community')}>
          <Text style={styles.cardIcon}>🔍</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t('findCommunityCard')}</Text>
            <Text style={styles.cardSub}>{t('findCommunityCardSub')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 28, paddingTop: 80 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1, marginBottom: 12 },
  sub: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', lineHeight: 26 },
  options: { gap: 14, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 18, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 14 },
  cardIcon: { fontSize: 28 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 22, color: '#D1D5DB' },
  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { fontSize: 14, color: '#9CA3AF' },
});
