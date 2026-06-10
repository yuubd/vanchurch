import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type Cell = { id: string; name: string };
type Member = { id: string; name: string; roles: string[]; cell_id: string | null; cells: { name: string } | null };
type JoinRequest = { id: string; user_id: string; created_at: string; users: { name: string; phone?: string } | null };

const ALL_ROLES = ['member', 'cell_leader', 'pastor', 'admin'] as const;

const ROLE_PRIORITY: Record<string, number> = { pastor: 0, admin: 1, cell_leader: 2, member: 3 };

type SortMode = 'name' | 'cell' | 'role';
const SORT_MODES: SortMode[] = ['cell', 'name', 'role'];

function sortMembers(list: Member[], mode: SortMode, asc: boolean): Member[] {
  const dir = asc ? 1 : -1;
  return [...list].sort((a, b) => {
    if (mode === 'name') return dir * a.name.localeCompare(b.name);
    if (mode === 'cell') {
      const cellA = a.cells?.name ?? '￿';
      const cellB = b.cells?.name ?? '￿';
      if (cellA !== cellB) return dir * cellA.localeCompare(cellB);
      return a.name.localeCompare(b.name);
    }
    const roleA = Math.min(...(a.roles.map(r => ROLE_PRIORITY[r] ?? 99)));
    const roleB = Math.min(...(b.roles.map(r => ROLE_PRIORITY[r] ?? 99)));
    if (roleA !== roleB) return dir * (roleA - roleB);
    return a.name.localeCompare(b.name);
  });
}

const ROLE_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  admin:       { backgroundColor: '#FEF3C7', color: '#92400E' },
  pastor:      { backgroundColor: '#DCFCE7', color: '#166534' },
  cell_leader: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  member:      { backgroundColor: '#F3F4F6', color: '#6B7280' },
};

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('cell');
  const [sortAsc, setSortAsc] = useState(true);
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [myChurchId, setMyChurchId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const { t } = useTranslation();

  const isPastor = myRoles.includes('pastor');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: myProfile } = user
      ? await supabase.from('users').select('roles, church_id').eq('id', user.id).single()
      : { data: null };

    const churchId = (myProfile as any)?.church_id ?? null;
    setMyRoles((myProfile as any)?.roles ?? []);
    setMyChurchId(churchId);

    const queries: Promise<any>[] = [
      supabase.from('users').select('id, name, roles, cell_id, cells!users_cell_id_fkey(name)'),
      supabase.from('cells').select('id, name').order('name'),
    ];
    if (churchId) {
      queries.push(
        supabase.from('join_requests')
          .select('id, user_id, created_at, users!join_requests_user_id_fkey(name)')
          .eq('church_id', churchId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
      );
    }

    const [{ data: memberData }, { data: cellData }, joinRes] = await Promise.all(queries);
    setMembers((memberData ?? []) as any);
    setCells(cellData ?? []);
    setJoinRequests((joinRes?.data ?? []) as any);
  }

  async function approveRequest(req: JoinRequest) {
    await Promise.all([
      supabase.from('join_requests').update({ status: 'approved' }).eq('id', req.id),
      supabase.from('users').update({ church_id: myChurchId, roles: ['member'] }).eq('id', req.user_id),
    ]);
    loadData();
  }

  async function rejectRequest(req: JoinRequest) {
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', req.id);
    loadData();
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('users')
      .update({ roles: editing.roles, cell_id: editing.cell_id })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditing(null);
    loadData();
  }

  function canToggleRole(role: string): boolean {
    if (role === 'pastor' || role === 'admin') return isPastor;
    if (role === 'cell_leader') return isPastor || myRoles.includes('admin');
    return true;
  }

  function toggleRole(role: string) {
    if (!canToggleRole(role)) return;
    setEditing(e => {
      if (!e) return e;
      const has = e.roles.includes(role);
      const next = has ? e.roles.filter(r => r !== role) : [...e.roles, role];
      return { ...e, roles: next.length ? next : ['member'] };
    });
  }

  const sorted = sortMembers(members, sortMode, sortAsc);

  function cycleSort() {
    if (sortAsc) {
      setSortAsc(false);
    } else {
      setSortAsc(true);
      setSortMode(m => SORT_MODES[(SORT_MODES.indexOf(m) + 1) % SORT_MODES.length]);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('members')}</Text>
        <TouchableOpacity onPress={cycleSort}>
          <Text style={styles.sortBtnText}>{t(sortMode === 'name' ? 'sortByName' : sortMode === 'cell' ? 'sortByCell' : 'sortByRole')} {sortAsc ? '↑' : '↓'}</Text>
        </TouchableOpacity>
      </View>
      {joinRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingHeader}>{t('pendingApprovals')} ({joinRequests.length})</Text>
          {joinRequests.map(req => (
            <View key={req.id} style={styles.pendingRow}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingName}>{req.users?.name ?? '—'}</Text>
                <Text style={styles.pendingDate}>{new Date(req.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.pendingBtns}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(req)}>
                  <Text style={styles.rejectText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approveRequest(req)}>
                  <Text style={styles.approveText}>{t('approve')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setEditing({ ...item })}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.metaRow}>
                {item.roles.map(r => (
                  <Text key={r} style={[styles.roleBadge, ROLE_STYLE[r]]}>{r}</Text>
                ))}
                <Text style={styles.metaCell}> · {item.cells?.name ?? t('noCell')}</Text>
              </View>
            </View>
            <Text style={styles.editLabel}>{t('edit')}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noMembers')}</Text>}
      />

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing?.name}</Text>
          <Text style={styles.label}>{t('roles')}</Text>
          {ALL_ROLES.map(role => {
            const active = editing?.roles.includes(role) ?? false;
            const disabled = !canToggleRole(role);
            return (
              <TouchableOpacity key={role} style={[styles.roleRow, active && styles.roleRowActive, disabled && styles.roleRowDisabled]} onPress={() => toggleRole(role)} disabled={disabled}>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive, disabled && styles.roleLabelDisabled]}>{role}</Text>
                <Text style={styles.roleCheck}>{active ? '✓' : ''}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.label}>{t('cell')}</Text>
          <Picker selectedValue={editing?.cell_id ?? ''} onValueChange={v => setEditing(e => e ? { ...e, cell_id: v || null } : e)}>
            <Picker.Item label={t('noCell')} value="" />
            {cells.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
          </Picker>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveEdit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : t('save')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  sortBtnText: { fontSize: 13, color: '#9CA3AF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 4 },
  metaCell: { fontSize: 12, color: '#999' },
  roleBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  editLabel: { fontSize: 13, color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  pendingSection: { backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 12 },
  pendingHeader: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 10 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pendingDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  pendingBtns: { flexDirection: 'row', gap: 8 },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  rejectText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  approveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#2563EB' },
  approveText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 8 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  roleRowActive: { borderColor: '#2563EB', backgroundColor: '#EEF2FF' },
  roleRowDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  roleLabel: { fontSize: 15, color: '#333' },
  roleLabelActive: { color: '#2563EB', fontWeight: '600' },
  roleLabelDisabled: { color: '#D1D5DB' },
  roleCheck: { fontSize: 16, color: '#2563EB' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
