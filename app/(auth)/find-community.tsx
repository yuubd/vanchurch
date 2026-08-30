import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useDelayedMount } from '../../lib/useDelayedMount';
import { friendlyError } from '../../lib/friendlyError';
import { showAlert } from '../../lib/alert';
import { useTranslation } from '../../lib/i18n';

type Church = { id: string; name: string };
type PendingRequest = { id: string; churches: { name: string } | null };

export default function FindCommunity() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Church | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const searchReady = useDelayedMount();
  const { t } = useTranslation();

  useEffect(() => {
    loadChurches();
    loadPending();
  }, []);

  async function loadChurches() {
    const { data } = await supabase.from('churches').select('id, name').eq('is_public', true).order('name');
    setChurches((data ?? []) as Church[]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadChurches(), loadPending()]);
    setRefreshing(false);
  }

  async function loadPending() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('join_requests')
      .select('id, churches(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPending(data as any);
  }

  async function cancelPending() {
    if (!pending) return;
    setCancelling(true);
    const { error } = await supabase.from('join_requests').delete().eq('id', pending.id);
    setCancelling(false);
    if (error) { showAlert(t('error'), friendlyError(error)); return; }
    setPending(null);
  }

  const filtered = query.trim()
    ? churches.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : churches;

  async function requestJoin() {
    if (!selected) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { error } = await supabase.from('join_requests').upsert(
      { user_id: user.id, church_id: selected.id, status: 'pending', created_at: new Date().toISOString() },
      { onConflict: 'user_id,church_id' }
    );
    setLoading(false);
    if (error) { showAlert(t('error'), friendlyError(error)); return; }
    router.replace({ pathname: '/(auth)/pending', params: { churchName: selected.name } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(auth)/onboarding')} style={styles.back}>
          <Text style={styles.backText}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('findCommunityTitle')}</Text>
        <Text style={styles.subtitle}>{t('findCommunitySubtitle')}</Text>
      </View>

      {pending && (() => {
        const [before, after] = t('requestSentTo').split('%');
        return (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              {before}
              <Text style={styles.pendingChurch}>{pending.churches?.name ?? ''}</Text>
              {after}
            </Text>
            <TouchableOpacity onPress={cancelPending} disabled={cancelling} hitSlop={8}>
              <Text style={styles.pendingCancel}>{cancelling ? '...' : t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {searchReady ? (
        <TextInput
          style={styles.search}
          placeholder={t('searchCommunityPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      ) : (
        <View style={styles.search} />
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.churchRow, selected?.id === item.id && styles.churchRowSelected]}
            onPress={() => setSelected(item)}
          >
            <Text style={[styles.churchName, selected?.id === item.id && styles.churchNameSelected]}>{item.name}</Text>
            {selected?.id === item.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noSearchResults')}</Text>}
        ListFooterComponent={
          <TouchableOpacity onPress={() => router.replace('/(auth)/create-community')} style={styles.createLink}>
            <Text style={styles.createLinkText}>{t('createCommunityDirectly')}</Text>
          </TouchableOpacity>
        }
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!selected || loading || !!pending) && styles.btnDisabled]}
          onPress={requestJoin}
          disabled={!selected || loading || !!pending}
        >
          <Text style={styles.btnText}>{loading ? '...' : t('requestToJoin')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 28, paddingBottom: 12, paddingTop: 60 },
  back: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#9CA3AF' },
  search: { marginHorizontal: 24, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 8 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 12, padding: 14, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  pendingText: { flex: 1, fontSize: 13, color: '#92400E' },
  pendingChurch: { fontWeight: '700' },
  pendingCancel: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginLeft: 12 },
  list: { paddingHorizontal: 24, paddingBottom: 20 },
  churchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  churchRowSelected: { backgroundColor: '#EFF6FF' },
  churchName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  churchNameSelected: { color: '#2563EB' },
  check: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 14 },
  createLink: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  createLinkText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  footer: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#F3F4F6' },
  btn: { backgroundColor: '#1D3FAA', borderRadius: 14, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
