import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export const INVITE_TOKEN_KEY = 'pending_invite_token';

export default function JoinRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    handle();
  }, [token]);

  async function handle() {
    await AsyncStorage.setItem(INVITE_TOKEN_KEY, token);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    await processInvite(user.id, token, router);
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>잠깐만요...</Text>
    </View>
  );
}

export async function processInvite(userId: string, token: string, router: ReturnType<typeof useRouter>) {
  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .eq('invite_token', token)
    .single();

  if (!church) {
    await AsyncStorage.removeItem(INVITE_TOKEN_KEY);
    router.replace('/(auth)/find-community');
    return;
  }

  // Already in this church
  const { data: profile } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', userId)
    .single();

  if (profile?.church_id === church.id) {
    await AsyncStorage.removeItem(INVITE_TOKEN_KEY);
    const { data: roleData } = await supabase.from('users').select('roles').eq('id', userId).single();
    const roles: string[] = roleData?.roles ?? ['member'];
    if (roles.includes('admin') || roles.includes('pastor')) router.replace('/(admin)');
    else if (roles.includes('cell_leader')) router.replace('/(leader)');
    else router.replace('/(member)');
    return;
  }

  // Upsert join request (ignore if already exists)
  await supabase.from('join_requests').upsert(
    { user_id: userId, church_id: church.id, status: 'pending' },
    { onConflict: 'user_id,church_id', ignoreDuplicates: true }
  );

  await AsyncStorage.removeItem(INVITE_TOKEN_KEY);
  router.replace({ pathname: '/(auth)/pending', params: { churchName: church.name } });
}
