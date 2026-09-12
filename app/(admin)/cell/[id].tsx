import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../lib/i18n';
import { useWebPullToRefresh } from '../../../lib/useWebPullToRefresh';

type Member = { id: string; name: string; roles: string[] };
type CellInfo = { id: string; name: string; leader_id: string | null; sub_leader_ids: string[] };

function getSunday(offset: number): Date {
  const today = new Date();
  const diff = today.getDay() === 0 ? 0 : -today.getDay();
  const d = new Date(today);
  d.setDate(today.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CellDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useTranslation();

  const [cell, setCell] = useState<CellInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sunday = getSunday(weekOffset);
  const dateStr = sunday.toISOString().split('T')[0];
  const locale = lang === 'en' ? 'en-US' : 'ko-KR';

  useFocusEffect(useCallback(() => { loadAll(); }, [id, dateStr]));

  async function loadAll() {
    if (!id) return;
    const [{ data: cellData }, { data: memberData }, { data: attendance }] = await Promise.all([
      supabase.from('cells').select('id, name, leader_id, sub_leader_ids').eq('id', id).single(),
      supabase.from('users').select('id, name, roles').eq('cell_id', id).order('name'),
      supabase.from('attendance_records').select('user_id, present').eq('cell_id', id).eq('meeting_date', dateStr),
    ]);
    setCell(cellData as any);
    setMembers((memberData ?? []) as any);
    setPresent(new Set((attendance ?? []).filter((a: any) => a.present).map((a: any) => a.user_id)));
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  useWebPullToRefresh(onRefresh);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#1D3FAA" /></View>;
  }

  const leader = members.find(m => m.id === cell?.leader_id);
  const subLeaders = members.filter(m => cell?.sub_leader_ids?.includes(m.id));
  const plainMembers = members.filter(
    m => m.id !== cell?.leader_id && !cell?.sub_leader_ids?.includes(m.id)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={60} />}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backLink}>{t('back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/(admin)/cells', params: { edit: String(id) } })}
        >
          <Text style={styles.editBtnText}>{t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{cell?.name}</Text>
      <Text style={styles.subtitle}>{members.length}{t('cellMemberCountSuffix')}</Text>

      <Text style={styles.sectionLabel}>{t('cellLeader')}</Text>
      <Text style={styles.personLine}>{leader?.name ?? t('none')}</Text>

      <Text style={styles.sectionLabel}>{t('subCellLeader')}</Text>
      <Text style={styles.personLine}>
        {subLeaders.length ? subLeaders.map(s => s.name).join(', ') : t('none')}
      </Text>

      <Text style={styles.sectionLabel}>{t('members')}</Text>
      {plainMembers.length === 0 ? (
        <Text style={styles.empty}>{t('noMembers')}</Text>
      ) : (
        plainMembers.map(m => (
          <Text key={m.id} style={styles.personLine}>{m.name}</Text>
        ))
      )}

      <Text style={styles.sectionLabel}>{t('attendance')}</Text>
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>
          {sunday.toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' })}
        </Text>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => w + 1)}
          style={styles.navBtn}
          disabled={weekOffset >= 0}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={20} color={weekOffset >= 0 ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>
      <Text style={styles.summary}>{present.size} / {members.length}{t('attendanceSummary')}</Text>

      {members.map(m => {
        const here = present.has(m.id);
        return (
          <View key={m.id} style={styles.attendRow}>
            <Text style={[styles.attendName, !here && styles.attendNameAbsent]}>{m.name}</Text>
            <View style={[styles.attendDot, here && styles.attendDotPresent]}>
              {here && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        );
      })}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  editBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 24, marginBottom: 8 },
  personLine: { fontSize: 15, color: '#111827', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  empty: { fontSize: 14, color: '#9CA3AF' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8 },
  navBtn: { padding: 4 },
  dateLabel: { fontSize: 14, fontWeight: '700', color: '#111827', minWidth: 170, textAlign: 'center' },
  summary: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  attendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  attendName: { fontSize: 15, color: '#111827', fontWeight: '600' },
  attendNameAbsent: { color: '#9CA3AF', fontWeight: '400' },
  attendDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  attendDotPresent: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
});
