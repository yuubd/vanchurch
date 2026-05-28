import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type Stats = { members: number; cells: number; prayers: number; attended: number };

function getLastSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

export default function AdminHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [adminName, setAdminName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [stats, setStats] = useState<Stats>({ members: 0, cells: 0, prayers: 0, attended: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('name, church_id, churches!users_church_id_fkey(name)')
      .eq('id', user.id)
      .single();

    setAdminName((profile as any)?.name ?? '');
    setChurchName((profile as any)?.churches?.name ?? '');

    const churchId = (profile as any)?.church_id;
    if (!churchId) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [{ count: memberCount }, { count: cellCount }, { count: prayerCount }, { data: attendanceData }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('church_id', churchId),
      supabase.from('cells').select('id', { count: 'exact', head: true }).eq('church_id', churchId),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('attendance_records').select('present').eq('meeting_date', getLastSunday()),
    ]);

    const attended = (attendanceData ?? []).filter(r => r.present).length;

    setStats({ members: memberCount ?? 0, cells: cellCount ?? 0, prayers: prayerCount ?? 0, attended });
  }

  const quickMenus = [
    { label: t('prayerRequests'), sub: t('thisWeekPrayers').replace('%', String(stats.prayers)), route: '/(admin)/prayers' as const },
    { label: t('memberManagement'), sub: t('totalMembers').replace('%', String(stats.members)), route: '/(admin)/members' as const },
    { label: t('cellManagement'), sub: t('cellsRunning').replace('%', String(stats.cells)), route: '/(admin)/cells' as const },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View />
        <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(admin)/profile')}>
          <Text style={styles.avatarText}>{adminName.slice(0, 1)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>{t('greeting')}, {adminName}{t('greetingSuffix')}</Text>
      <Text style={styles.church}>{churchName}</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statNum, { color: '#2563EB' }]}>{stats.attended}/{stats.members}</Text>
          <Text style={styles.statLabel}>{t('attendance')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statNum, { color: '#16A34A' }]}>{stats.cells}</Text>
          <Text style={styles.statLabel}>{t('cells')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.statNum, { color: '#EA580C' }]}>{stats.prayers}</Text>
          <Text style={styles.statLabel}>{t('prayerRequests')}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('quickMenu')}</Text>

      {quickMenus.map(item => (
        <TouchableOpacity key={item.label} style={styles.menuCard} onPress={() => router.push(item.route)}>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuSub}>{item.sub}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  avatarBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#1D4ED8' },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  church: { fontSize: 14, color: '#9CA3AF', marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  menuText: { gap: 3 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  menuSub: { fontSize: 13, color: '#9CA3AF' },
  chevron: { fontSize: 22, color: '#D1D5DB' },
});
