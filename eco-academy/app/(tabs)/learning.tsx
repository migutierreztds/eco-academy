// app/(tabs)/learning.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Learning() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learning</Text>
      <Text style={styles.sub}>Quizzes & certifications (Coming Soon).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#44546B" },
});