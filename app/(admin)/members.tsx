import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useTranslation } from '../../lib/i18n';

type Cell = { id: string; name: string };
type Member = { id: string; name: string; roles: string[]; cell_id: string | null; cells: { name: string } | null };

const ALL_ROLES = ['member', 'cell_leader', 'pastor', 'admin'] as const;

const ROLE_PRIORITY: Record<string, number> = { pastor: 0, admin: 1, cell_leader: 2, member: 3 };

function sortMembers(list: Member[]): Member[] {
  return [...list].sort((a, b) => {
    const cellA = a.cells?.name ?? '￿';
    const cellB = b.cells?.name ?? '￿';
    if (cellA !== cellB) return cellA.localeCompare(cellB);
    const roleA = Math.min(...(a.roles.map(r => ROLE_PRIORITY[r] ?? 99)));
    const roleB = Math.min(...(b.roles.map(r => ROLE_PRIORITY[r] ?? 99)));
    if (roleA !== roleB) return roleA - roleB;
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
  const { t } = useTranslation();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: memberData }, { data: cellData }] = await Promise.all([
      supabase.from('users').select('id, name, roles, cell_id, cells!users_cell_id_fkey(name)'),
      supabase.from('cells').select('id, name').order('name'),
    ]);
    setMembers(sortMembers((memberData ?? []) as any));
    setCells(cellData ?? []);
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

  function toggleRole(role: string) {
    setEditing(e => {
      if (!e) return e;
      const has = e.roles.includes(role);
      const next = has ? e.roles.filter(r => r !== role) : [...e.roles, role];
      return { ...e, roles: next.length ? next : ['member'] };
    });
  }

  return (
    <View style={styles.container}>
      <Header title={t('members')} />
      <FlatList
        data={members}
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
            return (
              <TouchableOpacity key={role} style={[styles.roleRow, active && styles.roleRowActive]} onPress={() => toggleRole(role)}>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role}</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 4 },
  metaCell: { fontSize: 12, color: '#999' },
  roleBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  editLabel: { fontSize: 13, color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 8 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  roleRowActive: { borderColor: '#2563EB', backgroundColor: '#EEF2FF' },
  roleLabel: { fontSize: 15, color: '#333' },
  roleLabelActive: { color: '#2563EB', fontWeight: '600' },
  roleCheck: { fontSize: 16, color: '#2563EB' },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
