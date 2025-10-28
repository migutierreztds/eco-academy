// app/(tabs)/home.tsx
import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

export default function HomeScreen() {
  const nav = useNavigation();
  const router = useRouter();

  // ---- Navigation to login (works on native & web) ----
  const goToLogin = useMemo(
    () => () => {
      router.replace("/(auth)/login");
      if (Platform.OS === "web") setTimeout(() => window.location.assign("/(auth)/login"), 0);
    },
    [router]
  );

  // ---- Sign out handler ----
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    goToLogin();
  }

  // Standard blue header — no sign-out button up top
  useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Home"
          subtitle="Welcome to Eco Academy"
        />
      ),
    });
  }, [nav]);

  return (
    <View style={styles.container}>
      <Text style={styles.body}>Welcome to the Home tab 👋</Text>

      <Pressable
        style={styles.signOutBtn}
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.signOutTxt}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    color: "#0B2A4A",
  },
  signOutBtn: {
    marginTop: 24,
    backgroundColor: "#e53935",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  signOutTxt: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});