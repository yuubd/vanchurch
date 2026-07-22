import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { LanguageProvider } from '../lib/i18n';
import { INVITE_TOKEN_KEY, processInvite } from './join/[token]';
import { isBiometricEnabled, storeSession } from '../lib/biometrics';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Preload the icon font so tab-bar icons paint on first render in dev / fresh simulators.
    // Production builds bundle the font natively; optional-chained so it never crashes if absent.
    const iconSet = Ionicons as unknown as { loadFont?: () => Promise<void> };
    iconSet.loadFont?.().catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        isBiometricEnabled().then(enabled => {
          if (enabled) storeSession(session.access_token, session.refresh_token);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inJoin = segments[0] === 'join';
    if (!session && !inAuth && !inJoin) {
      router.replace('/(auth)/login');
    } else if (session && (inAuth || inJoin)) {
      redirectByRole();
    }
  }, [session, loading, segments]);

  async function redirectByRole() {
    const { data } = await supabase
      .from('users')
      .select('roles, church_id, name')
      .eq('id', session?.user.id)
      .single();

    if (!data) {
      router.replace('/(auth)/login');
      return;
    }

    // Incomplete onboarding: needs name
    if (!data.name) {
      router.replace('/(auth)/profile-setup');
      return;
    }

    // Check for pending invite token (user tapped a join link before/after login)
    const pendingToken = await AsyncStorage.getItem(INVITE_TOKEN_KEY);
    if (pendingToken) {
      await processInvite(session!.user.id, pendingToken, router);
      return;
    }

    // Incomplete onboarding: needs church
    if (!data.church_id) {
      router.replace('/(auth)/onboarding');
      return;
    }

    const roles: string[] = data.roles ?? ['member'];
    if (roles.includes('admin')) {
      router.replace('/(admin)');
    } else if (roles.includes('pastor')) {
      router.replace('/(admin)'); // pastor has same access as admin
    } else if (roles.includes('cell_leader')) {
      router.replace('/(leader)');
    } else {
      router.replace('/(member)');
    }
  }

  return <LanguageProvider><Slot /></LanguageProvider>;
}
