import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconEmoji}>⛪</Text>
        </View>
        <Text style={styles.greeting}>환영합니다!</Text>
        <Text style={styles.sub}>함께 기도하고 성장하는{'\n'}공동체가 되길 바랍니다.</Text>

        <View style={styles.cards}>
          <View style={styles.card}>
            <View style={styles.cardIcon}><Text style={styles.cardEmoji}>🙏</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>기도제목 나눔</Text>
              <Text style={styles.cardDesc}>셀 리더와 목사님이 함께 기도해드려요</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(member)')}>
          <Text style={styles.btnText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { width: 72, height: 72, backgroundColor: '#EFF6FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  iconEmoji: { fontSize: 32 },
  greeting: { fontSize: 30, fontWeight: '900', color: '#111827', marginBottom: 10, letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 15, color: '#9CA3AF', lineHeight: 24, textAlign: 'center', marginBottom: 40 },
  cards: { width: '100%' },
  card: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 40, height: 40, backgroundColor: '#EFF6FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#9CA3AF' },
  footer: { padding: 20, paddingBottom: 36 },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
