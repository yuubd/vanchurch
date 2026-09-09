import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { useWebPullToRefresh } from '../../lib/useWebPullToRefresh';

type Totals = {
  total_churches: number;
  total_users: number;
  users_without_church: number;
  total_cells: number;
  total_prayers: number;
  signups_7d: number;
  prayers_7d: number;
  pending_invites: number;
};

type Church = {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  member_count: number;
  cell_count: number;
  prayer_count: number;
  pending_requests: number;
  last_prayer_at: string | null;
};

type Feedback = {
  id: string;
  body: string;
  created_at: string;
  user_name: string | null;
  church_name: string | null;
};

function relativeDays(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export default function DevDashboard() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { t, lang } = useTranslation();

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const [totalsRes, churchesRes, feedbackRes] = await Promise.all([
      supabase.rpc('dev_totals'),
      supabase.rpc('dev_churches'),
      supabase.rpc('dev_feedback'),
    ]);
    setTotals((totalsRes.data ?? [])[0] ?? null);
    setChurches(churchesRes.data ?? []);
    setFeedback(feedbackRes.data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useWebPullToRefresh(onRefresh);

  const locale = lang === 'en' ? 'en-US' : 'ko-KR';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#1D3FAA" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={60} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('devDashboard')}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>{t('back')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statNum, { color: '#2563EB' }]}>{totals?.total_churches ?? 0}</Text>
          <Text style={styles.statLabel}>{t('devChurches')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statNum, { color: '#16A34A' }]}>{totals?.total_users ?? 0}</Text>
          <Text style={styles.statLabel}>{t('devUsers')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statNum, { color: '#92400E' }]}>+{totals?.signups_7d ?? 0}</Text>
          <Text style={styles.statLabel}>{t('devSignups7d')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
          <Text style={[styles.statNum, { color: '#6D28D9' }]}>{totals?.total_prayers ?? 0}</Text>
          <Text style={styles.statLabel}>{t('devPrayers')}</Text>
        </View>
      </View>

      <View style={styles.miniRow}>
        <Text style={styles.mini}>{t('devCells')}: {totals?.total_cells ?? 0}</Text>
        <Text style={styles.mini}>{t('devNoChurch')}: {totals?.users_without_church ?? 0}</Text>
        <Text style={styles.mini}>{t('devPrayers7d')}: {totals?.prayers_7d ?? 0}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('devChurchBreakdown')}</Text>
      {churches.map(c => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{c.name}</Text>
            {c.is_public && <Text style={styles.publicBadge}>{t('devPublic')}</Text>}
          </View>
          <Text style={styles.cardMeta}>
            {t('devMembersShort')} {c.member_count} · {t('devCellsShort')} {c.cell_count} · {t('devPrayersShort')} {c.prayer_count}
            {c.pending_requests > 0 ? ` · ${t('devPendingShort')} ${c.pending_requests}` : ''}
          </Text>
          <Text style={styles.cardSub}>
            {t('devCreated')} {new Date(c.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
            {' · '}{t('devLastPrayer')} {relativeDays(c.last_prayer_at)}
          </Text>
        </View>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{t('devFeedback')}</Text>
      {feedback.length === 0 ? (
        <Text style={styles.empty}>{t('noFeedback')}</Text>
      ) : (
        feedback.map(f => (
          <View key={f.id} style={styles.card}>
            <Text style={styles.feedbackBody}>{f.body}</Text>
            <Text style={styles.cardSub}>
              {f.user_name ?? '—'}{f.church_name ? ` · ${f.church_name}` : ''}
              {' · '}{new Date(f.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        ))
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  backLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, flexBasis: '45%', borderRadius: 14, padding: 16 },
  statNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  miniRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  mini: { fontSize: 12, color: '#9CA3AF' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 20, marginBottom: 12 },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  publicBadge: { fontSize: 11, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden', fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#374151' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  feedbackBody: { fontSize: 14, color: '#111827', lineHeight: 20 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
});
