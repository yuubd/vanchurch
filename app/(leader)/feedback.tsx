import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

type FeedbackItem = { id: string; body: string; created_at: string };

export default function FeedbackScreen() {
  const { t, lang } = useTranslation();
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    loadFeedback(user.id);
  }

  async function loadFeedback(uid: string) {
    const { data } = await supabase.from('feedback').select('id, body, created_at').eq('user_id', uid).order('created_at', { ascending: false });
    setItems(data ?? []);
  }

  async function submit() {
    if (!draft.trim()) return;
    setLoading(true);
    await supabase.from('feedback').insert({ user_id: userId, body: draft.trim() });
    setLoading(false);
    setDraft('');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    loadFeedback(userId);
  }

  const locale = lang === 'en' ? 'en-US' : 'ko-KR';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('feedback')}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.compose}>
            <TextInput
              style={styles.input}
              placeholder={t('feedbackPlaceholder')}
              multiline
              value={draft}
              onChangeText={v => { setDraft(v); setSent(false); }}
              textAlignVertical="top"
              maxLength={1000}
            />
            <View style={styles.composeFooter}>
              <Text style={styles.charCount}>{draft.length} / 1000</Text>
              {sent
                ? <Text style={styles.sentMsg}>{t('feedbackSent')}</Text>
                : <TouchableOpacity style={[styles.submitBtn, (!draft.trim() || loading) && styles.disabled]} onPress={submit} disabled={!draft.trim() || loading}>
                    <Text style={styles.submitText}>{loading ? t('sending') : t('share')}</Text>
                  </TouchableOpacity>
              }
            </View>
            {items.length > 0 && <Text style={styles.sectionLabel}>{t('myFeedback')}</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noFeedback')}</Text>}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  list: { padding: 16 },
  compose: { marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 15, minHeight: 120, color: '#111827', backgroundColor: '#F9FAFB', lineHeight: 22 },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 24 },
  charCount: { fontSize: 12, color: '#9CA3AF' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sentMsg: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  disabled: { opacity: 0.4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },
  card: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  body: { fontSize: 15, color: '#111827', lineHeight: 22, marginBottom: 6 },
  date: { fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 8 },
});
