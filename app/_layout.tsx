import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { LanguageProvider } from '../lib/i18n';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      redirectByRole();
    }
  }, [session, loading]);

  async function redirectByRole() {
    const { data } = await supabase
      .from('users')
      .select('roles, church_id')
      .eq('id', session?.user.id)
      .single();

    if (!data) return;

    const roles: string[] = data.roles ?? ['member'];

    if (roles.includes('admin')) {
      if (!data.church_id) {
        router.replace('/(admin)/setup');
      } else {
        router.replace('/(admin)');
      }
    } else if (roles.includes('pastor')) {
      router.replace('/(pastor)');
    } else if (roles.includes('cell_leader')) {
      router.replace('/(leader)');
    } else {
      router.replace('/(member)');
    }
  }

  return <LanguageProvider><Slot /></LanguageProvider>;
}
