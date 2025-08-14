import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { supabase } from '~/lib/supabase';
import { Link } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else Alert.alert('Check your email to confirm your account.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eco Academy</Text>
      <TextInput placeholder="Email" style={styles.input} autoCapitalize='none' onChangeText={setEmail} />
      <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={setPassword} />
      <Pressable onPress={signIn} style={styles.btn} disabled={loading}><Text style={styles.btnTxt}>{loading ? '...' : 'Sign In'}</Text></Pressable>
      <Pressable onPress={signUp} style={[styles.btn, styles.outline]} disabled={loading}><Text style={[styles.btnTxt, styles.outlineTxt]}>Create account</Text></Pressable>
      <Link href="/(tabs)/library">Skip for now →</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12 },
  btn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { color: 'white', fontWeight: '700' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#16a34a' },
  outlineTxt: { color: '#16a34a' }
});