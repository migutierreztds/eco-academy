import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '~/lib/supabase';

export default function Index() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) return null;
  return authed ? <Redirect href="/(tabs)/library" /> : <Redirect href="/(auth)/login" />;
}