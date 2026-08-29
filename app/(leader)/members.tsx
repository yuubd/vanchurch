import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { friendlyError } from '../../lib/friendlyError';

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
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const sunday = getThisSunday(weekOffset);
  const dateStr = sunday.toISOString().split('T')[0];

  useEffect(() => { loadCell(); }, []);
  useEffect(() => { if (cellId) loadAttendance(); setSaved(false); }, [cellId, weekOffset]);

  async function onRefresh() {
    setRefreshing(true);
    await loadCell();
    if (cellId) await loadAttendance();
    setRefreshing(false);
  }

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
    setSaved(false);
  }

  async function save() {
    if (!cellId) return;
    setSaving(true);
    setSaved(false);
    const records = members.map(m => ({
      user_id: m.id, cell_id: cellId, meeting_date: dateStr, present: m.present,
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

  const presentCount = members.filter(m => m.present).length;

  async function addMember() {
    if (newPhone.replace(/\D/g, '').length < 10) return;
    setAddingMember(true);
    setAddError('');
    const { error } = await supabase.functions.invoke('add-member', {
      body: { name: newName.trim(), phone: newPhone },
    });
    setAddingMember(false);
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      setAddError(body?.error ?? '멤버 추가에 실패했습니다');
      return;
    }
    setShowAddMember(false);
    setNewName('');
    setNewPhone('');
    loadCell();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('attendance')}</Text>
        {cellName ? <Text style={styles.cellBadge}>{cellName}</Text> : null}
        <View style={styles.headerSpacer} />
        <TouchableOpacity style={styles.addBtn} onPress={() => { setAddError(''); setShowAddMember(true); }}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
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

      <Text style={styles.summary}>{presentCount} / {members.length}{t('attendanceSummary')}</Text>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
          <Text style={styles.saveBtnText}>{saving ? t('saving') : saved ? t('saved') : t('saveBtn')}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddMember} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddMember(false)} onShow={() => nameInputRef.current?.focus()}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.modalTitle}>{t('addMember')}</Text>
          <Text style={styles.modalLabel}>{t('nameOptional')}</Text>
          <TextInput
            ref={nameInputRef}
            style={styles.textInput}
            placeholder={t('namePlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={newName}
            onChangeText={setNewName}
          />
          <Text style={styles.modalLabel}>{t('phoneNumber')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="604-000-0000"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
          />
          <Text style={styles.addHint}>{t('addMemberHint')}</Text>
          {!!addError && <Text style={styles.addError}>{addError}</Text>}
          <TouchableOpacity
            style={[styles.saveBtn, (newPhone.replace(/\D/g, '').length < 10 || addingMember) && styles.saveBtnDisabled]}
            onPress={addMember}
            disabled={newPhone.replace(/\D/g, '').length < 10 || addingMember}
          >
            <Text style={styles.saveBtnText}>{addingMember ? '...' : t('add')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMember(false)}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  cellBadge: { fontSize: 13, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, overflow: 'hidden' },
  headerSpacer: { flex: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, color: '#fff', lineHeight: 26 },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 8 },
  textInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 16 },
  addHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 8, lineHeight: 20 },
  addError: { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#888', fontSize: 15 },
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
