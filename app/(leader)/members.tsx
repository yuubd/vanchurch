import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type Member = { id: string; name: string; present: boolean };

function getDateLabel(date: Date, lang: string) {
  const locale = lang === 'en' ? 'en-US' : 'ko-KR';
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' });
}

function getThisSunday(offset = 0) {
  const today = new Date();
  const diff = today.getDay() === 0 ? 0 : -today.getDay(); // back to most recent Sunday
  const d = new Date(today);
  d.setDate(today.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function LeaderMembers() {
  const { t, lang } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [cellId, setCellId] = useState<string | null>(null);
  const [cellName, setCellName] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [saving, setSaving] = useState(false);

  const sunday = getThisSunday(weekOffset);
  const dateStr = sunday.toISOString().split('T')[0];

  useEffect(() => { loadCell(); }, []);
  useEffect(() => { if (cellId) loadAttendance(); }, [cellId, weekOffset]);

  async function loadCell() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('cell_id').eq('id', user!.id).single();
    if (!me?.cell_id) return;
    setCellId(me.cell_id);

    const [{ data: cell }, { data: memberData }] = await Promise.all([
      supabase.from('cells').select('name').eq('id', me.cell_id).single(),
      supabase.from('users').select('id, name').eq('cell_id', me.cell_id).order('name'),
    ]);
    setCellName(cell?.name ?? '');
    setMembers((memberData ?? []).map(m => ({ ...m, present: false })));
  }

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance_records')
      .select('user_id, present')
      .eq('cell_id', cellId)
      .eq('meeting_date', dateStr);
    const map = Object.fromEntries((data ?? []).map(r => [r.user_id, r.present]));
    setMembers(prev => prev.map(m => ({ ...m, present: map[m.id] ?? false })));
  }

  function toggle(id: string) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, present: !m.present } : m));
  }

  async function save() {
    if (!cellId) return;
    setSaving(true);
    const records = members.map(m => ({
      user_id: m.id, cell_id: cellId, meeting_date: dateStr, present: m.present,
    }));
    await supabase.from('attendance_records').upsert(records, { onConflict: 'user_id,meeting_date' });
    setSaving(false);
  }

  const presentCount = members.filter(m => m.present).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('attendance')}</Text>
        {cellName ? <Text style={styles.cellBadge}>{cellName}</Text> : null}
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{getDateLabel(sunday, lang)}</Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.navBtn} disabled={weekOffset >= 0}>
          <Ionicons name="chevron-forward" size={20} color={weekOffset >= 0 ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.summary}>{presentCount} / {members.length}{t('attendanceSummary')}</Text>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.7}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{cellName}</Text>
            </View>
            <View style={[styles.check, item.present && styles.checkActive]}>
              {item.present && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? t('saving') : t('saveBtn')}</Text>
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
  sub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
