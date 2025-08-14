import React, { useEffect, useState } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { QueryProvider } from '~/lib/query';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // any async boot logic
      setReady(true);
      SplashScreen.hideAsync();
    };
    init();
  }, []);

  if (!ready) return <View />;

  return (
    <QueryProvider>
      <Slot />
    </QueryProvider>
  );
}