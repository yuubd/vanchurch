import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { friendlyError } from '../../lib/friendlyError';

function getDateLabel(date: Date, lang: string) {
  const locale = lang === 'en' ? 'en-US' : 'ko-KR';
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' });
}

function getThisSunday(offset = 0) {
  const today = new Date();
  const diff = today.getDay() === 0 ? 0 : -today.getDay();
  const d = new Date(today);
  d.setDate(today.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

type Member = { id: string; name: string };

export default function AdminAttendance() {
  const { t, lang } = useTranslation();
  const [myCellId, setMyCellId] = useState<string | null>(null);
  const [cellName, setCellName] = useState('');
  const [cellMembers, setCellMembers] = useState<Member[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sunday = getThisSunday(weekOffset);
  const dateStr = sunday.toISOString().split('T')[0];
  const presentCount = cellMembers.filter(m => attendanceMap[m.id]).length;

  useEffect(() => { loadCell(); }, []);
  useEffect(() => { if (myCellId) loadAttendance(); setSaved(false); }, [myCellId, weekOffset]);

  async function loadCell() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user!.id).single();
    if (!me?.cell_id) return;
    setMyCellId(me.cell_id);

    const [{ data: cell }, { data: memberData }] = await Promise.all([
      supabase.from('cells').select('name').eq('id', me.cell_id).single(),
      supabase.from('users').select('id, name').eq('cell_id', me.cell_id).order('name'),
    ]);
    setCellName(cell?.name ?? '');
    setCellMembers(memberData ?? []);
  }

  async function loadAttendance() {
    if (!myCellId) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('user_id, present')
      .eq('cell_id', myCellId)
      .eq('meeting_date', dateStr);
    setAttendanceMap(Object.fromEntries((data ?? []).map(r => [r.user_id, r.present])));
  }

  function toggleAttendance(id: string) {
    setAttendanceMap(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadCell();
    if (myCellId) await loadAttendance();
    setRefreshing(false);
  }

  async function saveAttendance() {
    if (!myCellId) return;
    setSaving(true);
    setSaved(false);
    const records = cellMembers.map(m => ({
      user_id: m.id, cell_id: myCellId, meeting_date: dateStr, present: !!attendanceMap[m.id],
    }));
    const { error } = await supabase.from('attendance_records').upsert(records, { onConflict: 'user_id,meeting_date' });
    if (error) {
      setSaving(false);
      Alert.alert('오류', friendlyError(error));
      return;
    }
    await loadAttendance();
    setSaving(false);
    setSaved(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('attendance')}</Text>
        {cellName ? <Text style={styles.cellBadge}>{cellName}</Text> : null}
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{getDateLabel(sunday, lang)}</Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.navBtn} disabled={weekOffset >= 0} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={weekOffset >= 0 ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.summary}>{presentCount} / {cellMembers.length}{t('attendanceSummary')}</Text>

      <FlatList
        data={cellMembers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => toggleAttendance(item.id)} activeOpacity={0.7}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.check, attendanceMap[item.id] && styles.checkActive]}>
              {attendanceMap[item.id] && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noMembers')}</Text>}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveAttendance} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? t('saving') : saved ? t('saved') : t('saveBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  cellBadge: { fontSize: 13, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, overflow: 'hidden' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  navBtn: { padding: 4 },
  dateLabel: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 140, textAlign: 'center' },
  summary: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#F9FAFB' },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
