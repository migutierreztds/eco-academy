// app/(tabs)/home.tsx
import React from "react";
import { View, Text, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "~/lib/supabase";

export default function HomeScreen() {
  const router = useRouter();

  const goToLogin = () => {
    // Expo Router navigation
    router.replace("/(auth)/login");

    // Web hard redirect as a safety net (ensures full reload + cleared session UI)
    if (Platform.OS === "web") {
      // slight delay to avoid racing the router
      setTimeout(() => {
        window.location.assign("/(auth)/login");
      }, 0);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    goToLogin();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Eco Academy</Text>
        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={styles.body}>Welcome to the Home tab 👋</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2e7d32",
  },
  signOutButton: {
    backgroundColor: "#e53935",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    // Small tweak so it looks nice on web hover
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  signOutText: {
    color: "#fff",
    fontWeight: "500",
  },
  body: {
    marginTop: 40,
    fontSize: 16,
    color: "#333",
  },
});