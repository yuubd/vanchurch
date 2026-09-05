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
    // useSegments()'s typed-routes tuple type only guarantees index 0; cast to a
    // plain string array since we need to inspect deeper segments at runtime.
    const segs = segments as readonly string[];
    const inAuth = segs[0] === '(auth)';
    const inJoin = segs[0] === 'join';
    const onLoginScreen = inAuth && segs[1] === 'login';
    const initialLanding = segs.length === 0; // cold launch, before any route has settled
    // Only redirect-by-role on cold launch, the login screen, or a join deep-link.
    // Other (auth) screens (onboarding, create-community, find-community,
    // profile-setup, pending) are deliberate steps the user is mid-way through and
    // manage their own navigation — re-running this on every `segments` change
    // while inside them bounced the user straight back to onboarding on every step
    // (e.g. tapping "Create community" instantly redirected back).
    if (!session && !inAuth && !inJoin) {
      router.replace('/(auth)/login');
    } else if (session && (initialLanding || onLoginScreen || inJoin)) {
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

    // An admin/cell leader may have invited this phone number before it ever signed up —
    // let them accept/decline before falling into normal onboarding.
    if (!data.church_id) {
      const { data: invite } = await supabase.rpc('get_my_pending_invite');
      if (invite && invite.length > 0) {
        router.replace('/(auth)/invite-confirm');
        return;
      }
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
