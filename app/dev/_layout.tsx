import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function DevLayout() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // The dashboard reads across every church, so gate the route group on the role as
    // well as the RPCs. The RPCs are the real boundary (each re-checks is_developer()
    // server-side) — this just avoids rendering an empty shell to anyone else.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/(auth)/login'); return; }
      supabase.rpc('is_developer').then(({ data }) => {
        if (data === true) setAllowed(true);
        else router.replace('/(auth)/login');
      });
    });
  }, []);

  if (!allowed) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
