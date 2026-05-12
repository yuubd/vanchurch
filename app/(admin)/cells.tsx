import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

type Leader = { id: string; name: string };
type Cell = { id: string; name: string; leader_id: string | null; users: { name: string } | null };

export default function CellsScreen() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [editing, setEditing] = useState<Cell | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: cellData }, { data: leaderData }] = await Promise.all([
      supabase.from('cells').select('id, name, leader_id, users(name)').order('name'),
      supabase.from('users').select('id, name').in('role', ['cell_leader', 'admin', 'pastor']).order('name'),
    ]);
    setCells(cellData ?? []);
    setLeaders(leaderData ?? []);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('cells')
      .update({ name: editing.name, leader_id: editing.leader_id })
      .eq('id', editing.id);
    if (!error && editing.leader_id) {
      await supabase.from('users').update({ cell_id: editing.id }).eq('id', editing.leader_id);
    }
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditing(null);
    loadData();
  }

  async function addCell() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from('users').select('church_id').eq('id', user!.id).single();
    const { error } = await supabase.from('cells').insert({ name: newName.trim(), church_id: me?.church_id });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setAdding(false);
    setNewName('');
    loadData();
  }

  async function deleteCell(id: string) {
    Alert.alert('셀 삭제 / Delete cell', '정말 삭제하시겠습니까? / Are you sure?', [
      { text: '취소 / Cancel', style: 'cancel' },
      { text: '삭제 / Delete', style: 'destructive', onPress: async () => {
        await supabase.from('cells').delete().eq('id', id);
        loadData();
      }},
    ]);
  }

  return (
    <View style={styles.container}>
      <Header title="셀 / Cells" />
      <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
        <Text style={styles.addBtnText}>+ 셀 추가 / Add cell</Text>
      </TouchableOpacity>
      <FlatList
        data={cells}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.rowContent} onPress={() => setEditing({ ...item })}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>리더: {item.users?.name ?? '없음 / None'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteCell(item.id)}>
              <Text style={styles.delete}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>셀이 없습니다 / No cells yet</Text>}
      />

      {/* Edit modal */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>셀 편집 / Edit cell</Text>
          <Text style={styles.label}>셀 이름 / Cell name</Text>
          <TextInput style={styles.input} value={editing?.name ?? ''} onChangeText={v => setEditing(e => e ? { ...e, name: v } : e)} />
          <Text style={styles.label}>셀 리더 / Cell leader</Text>
          <Picker selectedValue={editing?.leader_id ?? ''} onValueChange={v => setEditing(e => e ? { ...e, leader_id: v || null } : e)}>
            <Picker.Item label="없음 / None" value="" />
            {leaders.map(l => <Picker.Item key={l.id} label={l.name} value={l.id} />)}
          </Picker>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={saveEdit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : '저장 / Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
            <Text style={styles.cancelText}>취소 / Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add modal */}
      <Modal visible={adding} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>셀 추가 / Add cell</Text>
          <Text style={styles.label}>셀 이름 / Cell name</Text>
          <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="1셀, 청년부 1셀..." autoFocus />
          <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={addCell} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : '추가 / Add'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
            <Text style={styles.cancelText}>취소 / Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  addBtn: { margin: 16, backgroundColor: '#4F46E5', borderRadius: 10, padding: 14, alignItems: 'center' },
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
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#888', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
