import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useTranslation } from '../../lib/i18n';

type Leader = { id: string; name: string };
type Cell = { id: string; name: string; leader_id: string | null; sub_leader_ids: string[]; leader: { name: string } | null };

export default function CellsScreen() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [editing, setEditing] = useState<Cell | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from('users').select('church_id').eq('id', user.id).single();
    const churchId = me?.church_id ?? '';

    const [{ data: cellData }, { data: leaderData }] = await Promise.all([
      supabase.from('cells').select('id, name, leader_id, sub_leader_ids, leader:users!cells_leader_id_fkey(name)').eq('church_id', churchId).order('name'),
      supabase.from('users').select('id, name').eq('church_id', churchId).overlaps('roles', ['cell_leader', 'admin', 'pastor']).order('name'),
    ]);
    setCells((cellData ?? []) as any);
    setLeaders(leaderData ?? []);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('cells')
      .update({ name: editing.name, leader_id: editing.leader_id, sub_leader_ids: editing.sub_leader_ids })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditing(null);
    loadData();
  }

  async function addCell() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: me } = await supabase.from('users').select('church_id').eq('id', user.id).single();
    const { error } = await supabase.from('cells').insert({ name: newName.trim(), church_id: me?.church_id });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setAdding(false);
    setNewName('');
    loadData();
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    await supabase.from('cells').delete().eq('id', confirmDeleteId);
    setConfirmDeleteId(null);
    loadData();
  }

  function toggleSubLeader(id: string) {
    setEditing(e => {
      if (!e) return e;
      const subs = e.sub_leader_ids ?? [];
      const next = subs.includes(id) ? subs.filter(s => s !== id) : [...subs, id];
      return { ...e, sub_leader_ids: next };
    });
  }

  function subLeaderNames(cell: Cell): string {
    if (!cell.sub_leader_ids?.length) return '';
    return cell.sub_leader_ids
      .map(id => leaders.find(l => l.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  return (
    <View style={styles.container}>
      <Header title={t('cells')} />
      <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
        <Text style={styles.addBtnText}>{t('addCell')}</Text>
      </TouchableOpacity>
      <FlatList
        data={cells}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.rowContent} onPress={() => setEditing({ ...item, sub_leader_ids: item.sub_leader_ids ?? [] })}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{t('cellLeader')}: {item.leader?.name ?? t('none')}</Text>
              {!!subLeaderNames(item) && (
                <Text style={styles.meta}>{t('subCellLeader')}: {subLeaderNames(item)}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDeleteId(item.id)}>
              <Text style={styles.delete}>{t('delete')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noCells')}</Text>}
      />

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>{t('editCell')}</Text>
          <Text style={styles.label}>{t('cellName')}</Text>
          <TextInput style={styles.input} value={editing?.name ?? ''} onChangeText={v => setEditing(e => e ? { ...e, name: v } : e)} />
          <Text style={styles.label}>{t('cellLeader')}</Text>
          {[{ id: '', name: t('none') }, ...leaders].map(l => {
            const active = (editing?.leader_id ?? '') === l.id;
            const isSub = editing?.sub_leader_ids?.includes(l.id) ?? false;
            return (
              <TouchableOpacity
                key={l.id}
                style={[styles.subRow, active && styles.subRowActive, isSub && styles.subRowDisabled]}
                onPress={() => !isSub && setEditing(e => e ? { ...e, leader_id: l.id || null } : e)}
                disabled={isSub}
              >
                <Text style={[styles.subLabel, active && styles.subLabelActive, isSub && styles.subLabelDisabled]}>{l.name}</Text>
                <Text style={styles.subCheck}>{active ? '✓' : ''}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.label}>{t('subCellLeader')}</Text>
          {leaders.map(l => {
            const active = editing?.sub_leader_ids?.includes(l.id) ?? false;
            const isLeader = editing?.leader_id === l.id;
            return (
              <TouchableOpacity
                key={l.id}
                style={[styles.subRow, active && styles.subRowActive, isLeader && styles.subRowDisabled]}
                onPress={() => !isLeader && toggleSubLeader(l.id)}
                disabled={isLeader}
              >
                <Text style={[styles.subLabel, active && styles.subLabelActive, isLeader && styles.subLabelDisabled]}>{l.name}</Text>
                <Text style={styles.subCheck}>{active ? '✓' : ''}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveEdit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : t('save')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{t('deleteCell')}</Text>
            <Text style={styles.confirmMsg}>{t('deleteConfirm')}</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.confirmCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={confirmDelete}>
                <Text style={styles.confirmDeleteText}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={adding} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{t('addCell')}</Text>
          <Text style={styles.label}>{t('cellName')}</Text>
          <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder={t('cellNamePlaceholder')} autoFocus />
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={addCell} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : t('add')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  addBtn: { margin: 16, backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  rowContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  delete: { fontSize: 13, color: '#ef4444', paddingLeft: 16 },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  subRowActive: { borderColor: '#2563EB', backgroundColor: '#EEF2FF' },
  subRowDisabled: { opacity: 0.3 },
  subLabel: { fontSize: 15, color: '#333' },
  subLabelActive: { color: '#2563EB', fontWeight: '600' },
  subLabelDisabled: { color: '#999' },
  subCheck: { fontSize: 16, color: '#2563EB' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16, marginBottom: 40 },
  cancelText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  confirmMsg: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmDelete: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  confirmDeleteText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
