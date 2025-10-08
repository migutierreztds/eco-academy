// app/(tabs)/resources.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function Resources() {
  const params = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resources</Text>
      <Text style={styles.sub}>
        Placeholder. Query params: {JSON.stringify(params)}
      </Text>
      <Text style={styles.sub}>
        Show lists of lessons (Elementary / Middle / High) with filters and search.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#44546B", marginTop: 4 },
});