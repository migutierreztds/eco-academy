// app/sandbox.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function Sandbox() {
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Sandbox</Text>
      <Text>One screen. No tabs. No modals. No lists.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", padding: 24 },
  h1: { fontSize: 20, fontWeight: "800" },
});