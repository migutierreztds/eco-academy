import React from 'react';
import { View, Text, Switch, FlatList, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '~/lib/supabase';

type Lesson = { id: string; title: string; published: boolean };

export default function Admin(){
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('id,title,published').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Lesson[];
    }
  });

  const mutate = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from('lessons').update({ published }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lessons'] }),
    onError: (e: any) => Alert.alert('Update failed', e.message)
  });

  if (isLoading) return <Text style={{ padding: 16 }}>Loading…</Text>;

  return (
    <FlatList
      data={data || []}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700' }}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text>{item.published ? 'Published' : 'Draft'}</Text>
            <Switch value={item.published} onValueChange={(val) => mutate.mutate({ id: item.id, published: val })} />
          </View>
        </View>
      )}
      ListEmptyComponent={<View style={{ padding: 16 }}><Text>No lessons found.</Text></View>}
    />
  );
}