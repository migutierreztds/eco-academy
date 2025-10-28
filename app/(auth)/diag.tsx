// app/(auth)/diag.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { supabase } from "~/lib/supabase";

export default function Diag() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function add(line: string) {
    setLog((l) => [...l, line]);
  }

  async function run() {
    setLog([]);
    setLoading(true);
    try {
      add("Checking auth.getUser…");
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(`auth.getUser: ${userErr.message}`);
      if (!userRes?.user) throw new Error("No user in session.");

      add(`User OK: ${userRes.user.id}`);

      add("Testing profiles select (own row) …");
      const { data: prof, error: selErr } = await supabase
        .from("profiles")
        .select("id, role, district, school")
        .eq("id", userRes.user.id)
        .maybeSingle();
      if (selErr) throw new Error(`profiles.select: ${selErr.message}`);
      add(`profiles.select OK: ${prof ? "row found" : "no row"}`);

      add("Testing insert/upsert …");
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: userRes.user.id, role: "community", district: "Test District", school: null, green_leaders: false }, { onConflict: "id" });
      if (upErr) throw new Error(`profiles.upsert: ${upErr.message}`);
      add("profiles.upsert OK");

      add("All good 🎉");
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      add(`ERROR: ${msg}`);
      Alert.alert("Diagnostics", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.h1}>Diagnostics</Text>
      <Pressable onPress={run} style={styles.btn} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Run checks</Text>}
      </Pressable>
      <View style={styles.log}>
        {log.map((l, i) => (
          <Text key={i} style={{ color: l.startsWith("ERROR") ? "#DC2626" : "#0B2A4A" }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  h1: { fontSize: 20, fontWeight: "800", color: "#0B2A4A" },
  btn: { backgroundColor: "#2e7d32", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
  log: { marginTop: 12, gap: 6 },
});