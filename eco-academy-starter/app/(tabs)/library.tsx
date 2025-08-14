import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '~/lib/supabase';

type Lesson = { id: string; title: string; description: string | null };

export default function Library() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('id,title,description').eq('published', true).limit(50);
      if (error) throw error;
      return data as Lesson[];
    }
  });

  if (isLoading) return <Text style={{ padding: 16 }}>Loading…</Text>;
  if (error) return <Text style={{ padding: 16 }}>Error loading lessons.</Text>;

  return (
    <FlatList
      data={data || []}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <Pressable style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontWeight: '700' }}>{item.title}</Text>
          {item.description ? <Text>{item.description}</Text> : null}
        </Pressable>
      )}
      ListEmptyComponent={<View style={{ padding: 16 }}><Text>No lessons yet.</Text></View>}
    />
  );
}