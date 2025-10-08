// app/(tabs)/waste-diversion.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function WasteDiversion() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waste Diversion</Text>
      <Text style={styles.sub}>
        This is a placeholder. Plug in your CSV-driven charts here (per school, per month).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#44546B" },
});