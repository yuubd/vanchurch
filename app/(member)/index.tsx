import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type Prayer = { id: string; body: string; created_at: string; prayCount: number; prayedByMe: boolean; authorName?: string; isMine: boolean };

export default function MemberHome() {
  const { t, lang } = useTranslation();
  const [myId, setMyId] = useState('');
  const [name, setName] = useState('');
  const [churchCell, setChurchCell] = useState('');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [cellPrayers, setCellPrayers] = useState<Prayer[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    const { data } = await supabase
      .from('users')
      .select('name, cell_id, church_id, cells!users_cell_id_fkey(name), churches!users_church_id_fkey(name, cell_prayer_sharing)')
      .eq('id', user.id)
      .single();

    setName((data as any)?.name ?? '');
    const church = (data as any)?.churches?.name ?? '';
    const cell = (data as any)?.cells?.name ?? '';
    setChurchCell([church, cell].filter(Boolean).join(' · '));

    const sharing = (data as any)?.churches?.cell_prayer_sharing ?? false;
    setSharingEnabled(sharing);

    // My own prayer requests
    const { data: myPrayerData } = await supabase.from('prayer_requests')
      .select('id, body, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const myPrayerIds = (myPrayerData ?? []).map((p: any) => p.id);
    const { data: myPrays } = myPrayerIds.length
      ? await supabase.from('prayer_prays').select('prayer_id').in('prayer_id', myPrayerIds)
      : { data: [] };

    const myPrayCountMap: Record<string, number> = {};
    (myPrays ?? []).forEach((p: any) => { myPrayCountMap[p.prayer_id] = (myPrayCountMap[p.prayer_id] ?? 0) + 1; });

    setPrayers((myPrayerData ?? []).map((r: any) => ({
      ...r,
      prayCount: myPrayCountMap[r.id] ?? 0,
      prayedByMe: false,
      isMine: true,
    })));

    // Cell prayer requests when sharing is enabled
    if (sharing && (data as any)?.cell_id) {
      const { data: cellMembers } = await supabase.from('users').select('id, name').eq('cell_id', (data as any).cell_id);
      const memberIds = (cellMembers ?? []).map((m: any) => m.id).filter((id: string) => id !== user.id);
      const memberMap: Record<string, string> = {};
      (cellMembers ?? []).forEach((m: any) => { memberMap[m.id] = m.name; });

      if (memberIds.length) {
        const { data: cellPrayerData } = await supabase.from('prayer_requests')
          .select('id, body, created_at, user_id')
          .in('user_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(30);

        const cellPrayerIds = (cellPrayerData ?? []).map((p: any) => p.id);
        const [{ data: myPrayedCell }, { data: allCellPrays }] = await Promise.all([
          cellPrayerIds.length
            ? supabase.from('prayer_prays').select('prayer_id').eq('user_id', user.id).in('prayer_id', cellPrayerIds)
            : Promise.resolve({ data: [] }),
          cellPrayerIds.length
            ? supabase.from('prayer_prays').select('prayer_id').in('prayer_id', cellPrayerIds)
            : Promise.resolve({ data: [] }),
        ]);

        const prayedSet = new Set((myPrayedCell ?? []).map((p: any) => p.prayer_id));
        const cellPrayCountMap: Record<string, number> = {};
        (allCellPrays ?? []).forEach((p: any) => { cellPrayCountMap[p.prayer_id] = (cellPrayCountMap[p.prayer_id] ?? 0) + 1; });

        setCellPrayers((cellPrayerData ?? []).map((r: any) => ({
          ...r,
          prayCount: cellPrayCountMap[r.id] ?? 0,
          prayedByMe: prayedSet.has(r.id),
          authorName: memberMap[r.user_id] ?? '',
          isMine: false,
        })));
      } else {
        setCellPrayers([]);
      }
    } else {
      setCellPrayers([]);
    }
  }

  async function togglePray(id: string, prayedByMe: boolean) {
    if (prayedByMe) {
      await supabase.from('prayer_prays').delete().match({ prayer_id: id, user_id: myId });
    } else {
      await supabase.from('prayer_prays').insert({ prayer_id: id, user_id: myId });
    }
    setCellPrayers(prev => prev.map(r => r.id === id
      ? { ...r, prayedByMe: !prayedByMe, prayCount: r.prayCount + (prayedByMe ? -1 : 1) }
      : r
    ));
  }

  async function submit() {
    if (!draft.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('prayer_requests').insert({ user_id: user?.id, body: draft.trim() });
    setLoading(false);
    if (error) { Alert.alert('오류', error.message); return; }
    setDraft('');
    loadData();
  }

  function startEdit(id: string, body: string) {
    setEditingId(id);
    setEditDraft(body);
  }

  function cancelEdit() {
    setEditingId('');
    setEditDraft('');
  }

  async function saveEdit(id: string) {
    if (!editDraft.trim()) return;
    const { data, error } = await supabase.from('prayer_requests').update({ body: editDraft.trim() }).eq('id', id).select();
    if (error) { Alert.alert('오류', error.message); return; }
    if (!data || data.length === 0) { Alert.alert('오류', t('editFailed')); return; }
    setEditingId('');
    setEditDraft('');
    loadData();
  }

  function confirmDelete(id: string) {
    Alert.alert(t('deleteConfirm'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deletePrayer(id) },
    ]);
  }

  async function deletePrayer(id: string) {
    const { data, error } = await supabase.from('prayer_requests').delete().eq('id', id).select();
    if (error) { Alert.alert('오류', error.message); return; }
    if (!data || data.length === 0) { Alert.alert('오류', t('deleteFailed')); return; }
    loadData();
  }

  const locale = lang === 'en' ? 'en-US' : 'ko-KR';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.greeting}>{t('greeting')}, {name}{t('greetingSuffix')}</Text>
            <Text style={styles.sub}>{churchCell}</Text>

            <View style={styles.compose}>
              <TextInput
                style={styles.input}
                placeholder={t('sharePrayer')}
                placeholderTextColor="#9CA3AF"
                multiline
                value={draft}
                onChangeText={setDraft}
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={styles.composeFooter}>
                <Text style={styles.charCount}>{draft.length} / 500</Text>
                <TouchableOpacity
                  style={[styles.submitBtn, (!draft.trim() || loading) && styles.submitDisabled]}
                  onPress={submit}
                  disabled={!draft.trim() || loading}
                >
                  <Text style={styles.submitText}>{loading ? t('sending') : t('share')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {sharingEnabled && cellPrayers.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{t('cellPrayersSection')}</Text>
                {cellPrayers.map(item => (
                  <View key={item.id} style={styles.cellCard}>
                    <View style={styles.cellCardHeader}>
                      <Text style={styles.authorName}>{item.authorName}</Text>
                      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <Text style={styles.body}>{item.body}</Text>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[styles.prayBtn, item.prayedByMe && styles.prayBtnActive]}
                        onPress={() => togglePray(item.id, item.prayedByMe)}
                      >
                        <Text style={[styles.prayBtnText, item.prayedByMe && styles.prayBtnTextActive]}>
                          🙏 {item.prayedByMe ? t('prayed') : t('prayTogether')}{item.prayCount > 0 ? ` ${item.prayCount}` : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>{t('myPrayersSection')}</Text>
            {prayers.map(item => (
              <View key={item.id} style={styles.card}>
                {editingId === item.id ? (
                  <View>
                    <TextInput
                      style={styles.editInput}
                      value={editDraft}
                      onChangeText={setEditDraft}
                      multiline
                      textAlignVertical="top"
                      maxLength={500}
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit}>
                        <Text style={styles.editCancelText}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSaveBtn, !editDraft.trim() && styles.submitDisabled]}
                        onPress={() => saveEdit(item.id)}
                        disabled={!editDraft.trim()}
                      >
                        <Text style={styles.editSaveText}>{t('save')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.body}>{item.body}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
                      <View style={styles.myPrayerActions}>
                        {item.prayCount > 0 && (
                          <Text style={styles.prayedBadge}>🙏 {item.prayCount}{t('prayedCount')}</Text>
                        )}
                        <TouchableOpacity onPress={() => startEdit(item.id, item.body)} hitSlop={8}>
                          <Text style={styles.actionText}>{t('edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={8}>
                          <Text style={styles.actionTextDanger}>{t('delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
            {prayers.length === 0 && <Text style={styles.empty}>{t('noPrayersYet')}</Text>}
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
  compose: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, backgroundColor: '#F9FAFB', marginBottom: 32 },
  input: { fontSize: 16, color: '#111827', lineHeight: 24, minHeight: 100, textAlignVertical: 'top' },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  charCount: { fontSize: 12, color: '#9CA3AF' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 14, marginTop: 8 },
  card: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  cellCard: { padding: 14, borderRadius: 12, backgroundColor: '#F0F9FF', marginBottom: 10, borderWidth: 1, borderColor: '#BAE6FD' },
  cellCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  authorName: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  body: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#9CA3AF' },
  prayedBadge: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  prayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#fff' },
  prayBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  prayBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  prayBtnTextActive: { color: '#2563EB' },
  empty: { textAlign: 'center', marginTop: 24, color: '#9CA3AF', fontSize: 15 },
  myPrayerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  actionTextDanger: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  editInput: { fontSize: 15, color: '#111827', lineHeight: 22, minHeight: 70, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 10, padding: 12, backgroundColor: '#F9FAFB', textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  editCancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  editCancelText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  editSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2563EB' },
  editSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
