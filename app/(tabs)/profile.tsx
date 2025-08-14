import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { supabase } from '~/lib/supabase';

export default function Profile(){
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Your Profile</Text>
      <Pressable onPress={() => supabase.auth.signOut()} style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}