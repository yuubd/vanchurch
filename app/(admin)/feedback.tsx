import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type FeedbackItem = { id: string; body: string; created_at: string; userName: string; cellName: string };

export default function AdminFeedbackScreen() {
  const { t, lang } = useTranslation();
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => { loadFeedback(); }, []);

  async function loadFeedback() {
    const [{ data: feedbackData }, { data: allUsers }] = await Promise.all([
      supabase.from('feedback').select('id, body, created_at, user_id').order('created_at', { ascending: false }),
      supabase.from('users').select('id, name, cells!users_cell_id_fkey(name)'),
    ]);

    const userMap: Record<string, { name: string; cellName: string }> = {};
    (allUsers ?? []).forEach((u: any) => {
      userMap[u.id] = { name: u.name ?? '', cellName: u.cells?.name ?? '' };
    });

    setItems((feedbackData ?? []).map((f: any) => ({
      ...f,
      userName: userMap[f.user_id]?.name ?? '—',
      cellName: userMap[f.user_id]?.cellName ?? '',
    })));
  }

  const locale = lang === 'en' ? 'en-US' : 'ko-KR';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('allFeedback')}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.userName}</Text>
              {!!item.cellName && <Text style={styles.cell}>{item.cellName}</Text>}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noFeedback')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  list: { padding: 16 },
  card: { padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontWeight: '700', fontSize: 15, color: '#111827' },
  cell: { fontSize: 12, color: '#2563EB', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  body: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 8 },
  date: { fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },
});
