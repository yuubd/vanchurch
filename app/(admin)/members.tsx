import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

type Cell = { id: string; name: string };
type Member = { id: string; name: string; roles: string[]; cell_id: string | null; cells: { name: string } | null };

const ALL_ROLES = ['member', 'cell_leader', 'pastor', 'admin'] as const;

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: memberData }, { data: cellData }] = await Promise.all([
      supabase.from('users').select('id, name, roles, cell_id, cells(name)').order('name'),
      supabase.from('cells').select('id, name').order('name'),
    ]);
    setMembers(memberData ?? []);
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
      <Header title="멤버 / Members" />
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setEditing({ ...item })}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.roles.join(', ')} · {item.cells?.name ?? '셀 없음 / No cell'}</Text>
            </View>
            <Text style={styles.edit}>편집 / Edit</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>멤버가 없습니다 / No members yet</Text>}
      />

      {/* Edit modal */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editing?.name}</Text>
          <Text style={styles.label}>역할 / Roles</Text>
          {ALL_ROLES.map(role => {
            const active = editing?.roles.includes(role) ?? false;
            return (
              <TouchableOpacity key={role} style={[styles.roleRow, active && styles.roleRowActive]} onPress={() => toggleRole(role)}>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role}</Text>
                <Text style={styles.roleCheck}>{active ? '✓' : ''}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.label}>셀 / Cell</Text>
          <Picker selectedValue={editing?.cell_id ?? ''} onValueChange={v => setEditing(e => e ? { ...e, cell_id: v || null } : e)}>
            <Picker.Item label="셀 없음 / No cell" value="" />
            {cells.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
          </Picker>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveEdit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : '저장 / Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
            <Text style={styles.cancelText}>취소 / Cancel</Text>
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
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  edit: { fontSize: 13, color: '#4F46E5' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginTop: 16, marginBottom: 8 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  roleRowActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  roleLabel: { fontSize: 15, color: '#333' },
  roleLabelActive: { color: '#4F46E5', fontWeight: '600' },
  roleCheck: { fontSize: 16, color: '#4F46E5' },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
