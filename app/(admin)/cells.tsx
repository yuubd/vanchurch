import { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useTranslation } from '../../lib/i18n';
import { friendlyError } from '../../lib/friendlyError';
import { showAlert } from '../../lib/alert';
import { isValidDate } from '../../lib/dob';
import { useWebPullToRefresh } from '../../lib/useWebPullToRefresh';

type Leader = { id: string; name: string };
type Cell = { id: string; name: string; leader_id: string | null; sub_leader_ids: string[]; leader: { name: string } | null };
type Member = { id: string; name: string; cell_id: string | null };

export default function CellsScreen() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Cell | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const addInputRef = useRef<TextInput>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberDob, setNewMemberDob] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const memberNameRef = useRef<TextInput>(null);
  const { t } = useTranslation();

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useWebPullToRefresh(onRefresh);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from('users').select('church_id').eq('id', user.id).single();
    const churchId = me?.church_id ?? '';

    const [{ data: cellData }, { data: leaderData }, { data: memberData }] = await Promise.all([
      supabase.from('cells').select('id, name, leader_id, sub_leader_ids, leader:users!cells_leader_id_fkey(name)').eq('church_id', churchId).order('name'),
      supabase.from('users').select('id, name').eq('church_id', churchId).overlaps('roles', ['cell_leader', 'admin', 'pastor']).order('name'),
      supabase.from('users').select('id, name, cell_id').eq('church_id', churchId).order('name'),
    ]);
    setCells((cellData ?? []) as any);
    setLeaders(leaderData ?? []);
    setMembers(memberData ?? []);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);

    const prevLeaderId = cells.find(c => c.id === editing.id)?.leader_id ?? null;
    const newLeaderId = editing.leader_id ?? null;

    const { error } = await supabase.from('cells')
      .update({ name: editing.name, leader_id: newLeaderId, sub_leader_ids: editing.sub_leader_ids })
      .eq('id', editing.id);
    if (error) { setSaving(false); showAlert(t('error'), friendlyError(error)); return; }

    // Assigning a leader here only updated cells.leader_id — it must also grant
    // the cell_leader role and set the user's cell_id, or their profile/tabs
    // never reflect the change (this was previously out of sync).
    if (newLeaderId && newLeaderId !== prevLeaderId) {
      const { data: leaderUser } = await supabase.from('users').select('roles').eq('id', newLeaderId).single();
      const roles = leaderUser?.roles ?? [];
      const nextRoles = roles.includes('cell_leader') ? roles : [...roles, 'cell_leader'];
      await supabase.from('users').update({ roles: nextRoles, cell_id: editing.id }).eq('id', newLeaderId);
    }

    // If the leader changed away from someone, revoke their cell_leader role
    // only if they don't still lead a different cell.
    if (prevLeaderId && prevLeaderId !== newLeaderId) {
      const { data: stillLeading } = await supabase.from('cells').select('id').eq('leader_id', prevLeaderId).neq('id', editing.id);
      if (!stillLeading?.length) {
        const { data: prevUser } = await supabase.from('users').select('roles, cell_id').eq('id', prevLeaderId).single();
        const nextRoles = (prevUser?.roles ?? []).filter((r: string) => r !== 'cell_leader');
        const nextCellId = prevUser?.cell_id === editing.id ? null : prevUser?.cell_id;
        await supabase.from('users').update({ roles: nextRoles, cell_id: nextCellId }).eq('id', prevLeaderId);
      }
    }

    // Apply member checklist changes: assign newly-checked members to this
    // cell, unassign previously-assigned members that got unchecked.
    const originallyIn = new Set(members.filter(m => m.cell_id === editing.id).map(m => m.id));
    const toAdd = [...memberIds].filter(id => !originallyIn.has(id));
    const toRemove = [...originallyIn].filter(id => !memberIds.has(id));
    if (toAdd.length) await supabase.from('users').update({ cell_id: editing.id }).in('id', toAdd);
    if (toRemove.length) await supabase.from('users').update({ cell_id: null }).in('id', toRemove);

    setSaving(false);
    setEditing(null);
    loadData();
  }

  function toggleMember(id: string) {
    setMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function addMemberToCell() {
    if (!editing || newMemberPhone.replace(/\D/g, '').length < 10) return;
    if (newMemberDob && !isValidDate(newMemberDob)) return;
    setAddingMember(true);
    setAddMemberError('');
    const { data, error } = await supabase.functions.invoke('add-member', {
      body: { name: newMemberName.trim(), phone: newMemberPhone, cellId: editing.id, dateOfBirth: newMemberDob || undefined },
    });
    setAddingMember(false);
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      setAddMemberError(body?.error ?? '멤버 추가에 실패했습니다');
      return;
    }
    if (data?.id) setMemberIds(prev => new Set(prev).add(data.id));
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberDob('');
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
    if (error) { showAlert(t('error'), friendlyError(error)); return; }
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.rowContent} onPress={() => {
              setEditing({ ...item, sub_leader_ids: item.sub_leader_ids ?? [] });
              setMemberIds(new Set(members.filter(m => m.cell_id === item.id).map(m => m.id)));
              setShowAddMember(false);
              setNewMemberName('');
              setNewMemberPhone('');
              setAddMemberError('');
            }}>
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
          <Text style={styles.sectionLabel}>{t('members')}</Text>
          <Text style={styles.sectionHint}>{t('unassignedMembersHint')}</Text>
          {[...members]
            .filter(m => !m.cell_id || m.cell_id === editing?.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(m => {
              const checked = memberIds.has(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.subRow, checked && styles.subRowActive]}
                  onPress={() => toggleMember(m.id)}
                >
                  <Text style={[styles.subLabel, checked && styles.subLabelActive]}>{m.name}</Text>
                  <Text style={styles.subCheck}>{checked ? '✓' : ''}</Text>
                </TouchableOpacity>
              );
            })}

          {showAddMember ? (
            <View style={styles.inlineAddCard}>
              <Text style={styles.label}>{t('nameOptional')}</Text>
              <TextInput
                ref={memberNameRef}
                style={styles.input}
                placeholder={t('namePlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={newMemberName}
                onChangeText={setNewMemberName}
              />
              <Text style={styles.label}>{t('phoneNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder="604-000-0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={newMemberPhone}
                onChangeText={setNewMemberPhone}
              />
              <Text style={styles.label}>{t('dateOfBirth')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('dateOfBirthPlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                value={newMemberDob}
                onChangeText={setNewMemberDob}
              />
              {!!newMemberDob && !isValidDate(newMemberDob) && <Text style={styles.addMemberError}>{t('dateOfBirthInvalid')}</Text>}
              {!!addMemberError && <Text style={styles.addMemberError}>{addMemberError}</Text>}
              <View style={styles.inlineAddBtns}>
                <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setShowAddMember(false); setNewMemberName(''); setNewMemberPhone(''); setNewMemberDob(''); setAddMemberError(''); }}>
                  <Text style={styles.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineAddBtn, (newMemberPhone.replace(/\D/g, '').length < 10 || (!!newMemberDob && !isValidDate(newMemberDob)) || addingMember) && styles.disabled]}
                  onPress={addMemberToCell}
                  disabled={newMemberPhone.replace(/\D/g, '').length < 10 || (!!newMemberDob && !isValidDate(newMemberDob)) || addingMember}
                >
                  <Text style={styles.saveBtnText}>{addingMember ? '...' : t('add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addMemberLink} onPress={() => { setAddMemberError(''); setShowAddMember(true); }}>
              <Text style={styles.addMemberLinkText}>{t('addMember')}</Text>
            </TouchableOpacity>
          )}

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

      <Modal visible={adding} animationType="slide" presentationStyle="pageSheet" onShow={() => addInputRef.current?.focus()}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{t('addCell')}</Text>
          <Text style={styles.label}>{t('cellName')}</Text>
          <TextInput ref={addInputRef} style={styles.input} value={newName} onChangeText={setNewName} placeholder={t('cellNamePlaceholder')} placeholderTextColor="#9CA3AF" />
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
  sectionLabel: { fontSize: 14, color: '#666', marginTop: 24, marginBottom: 4, fontWeight: '700' },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  addMemberLink: { alignItems: 'center', marginTop: 20 },
  addMemberLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  addMemberError: { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  inlineAddCard: { marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F0F0F0' },
  inlineAddBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  inlineCancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  inlineAddBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center' },
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
