// app/(auth)/onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

type Role = "school_admin" | "educator" | "community" | "facilities";

type DistrictRow = { id: string; name: string };
type SchoolRow = { id: string; district_id: string; name: string; number?: string | null };

const ROLES: { key: Role; label: string }[] = [
  { key: "school_admin", label: "School Administrator" },
  { key: "educator", label: "Educator" },
  { key: "community", label: "Community Member" },
  { key: "facilities", label: "Facilities Staff" },
];

export default function Onboarding() {
  const router = useRouter();

  // form
  const [role, setRole] = useState<Role>("community");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  // data
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]); // schools for selected district

  // ui
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // picker modals
  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const schoolRequired = role === "educator";

  const canSave = useMemo(() => {
    if (!districtId) return false;
    if (schoolRequired && !schoolId) return false;
    return true;
  }, [districtId, schoolId, schoolRequired]);

  // Load districts on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const { data, error } = await supabase
          .from("districts")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) throw new Error(`districts.select: ${error.message}`);

        if (!cancelled) setDistricts((data ?? []) as DistrictRow[]);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load districts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When district changes, load its schools
  useEffect(() => {
    let cancelled = false;
    if (!districtId) {
      setSchools([]);
      setSchoolId(null);
      setSchoolName(null);
      return;
    }
    (async () => {
      try {
        setErr(null);
        const { data, error } = await supabase
          .from("schools")
          .select("id, district_id, name, number")
          .eq("district_id", districtId)
          .order("name", { ascending: true });

        if (error) throw new Error(`schools.select: ${error.message}`);

        const rows = (data ?? []) as SchoolRow[];
        if (cancelled) return;

        setSchools(rows);

        // if we already had a school selected from a previous district, clear it
        if (!rows.find((s) => s.id === schoolId)) {
          setSchoolId(null);
          setSchoolName(null);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load schools.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  async function save() {
    if (!canSave || saving) return;
    try {
      setSaving(true);
      setErr(null);

      const { data: u, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(`auth.getUser: ${userErr.message}`);
      const user = u?.user;
      if (!user) throw new Error("Not signed in.");

      // Persist NAMES to match your existing profiles schema
      const payload = {
        id: user.id,
        role,
        district: districtName,        // text
        school: schoolName ?? null,   // text or null
        green_leaders: false,         // can add a toggle later
      };

      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (upErr) throw new Error(`profiles.upsert: ${upErr.message}`);

      router.replace("/home");
    } catch (e: any) {
      const msg = e?.message ?? "Could not save your profile.";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  // filtered lists
  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter((d) => d.name.toLowerCase().includes(q));
  }, [districtSearch, districts]);

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q) || (s.number ?? "").toLowerCase().includes(q));
  }, [schoolSearch, schools]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppHeader title="Welcome" subtitle="Tell us a bit about you" />

      {!!err && (
        <View style={styles.errBox}>
          <Text style={styles.errTitle}>Error</Text>
          <Text style={styles.errText}>{err}</Text>
        </View>
      )}

      <Text style={styles.label}>I am a…</Text>
      <View style={styles.segment}>
        {ROLES.map((r) => (
          <Pressable
            key={r.key}
            style={[styles.segmentBtn, role === r.key && styles.segmentBtnActive]}
            onPress={() => setRole(r.key)}
            disabled={saving}
          >
            <Text style={[styles.segmentTxt, role === r.key && styles.segmentTxtActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* District picker */}
      <Text style={styles.label}>School District (ISD)</Text>
      <Pressable
        style={styles.select}
        onPress={() => setDistrictModal(true)}
        disabled={loading || saving}
      >
        <Text style={styles.selectTxt}>
          {loading ? "Loading…" : districtName ?? "Select district"}
        </Text>
      </Pressable>

      {/* School picker */}
      <Text style={styles.label}>
        School {schoolRequired ? "(required for Educators)" : "(optional)"}
      </Text>
      <Pressable
        style={[styles.select, !districtId && styles.disabled]}
        onPress={() => districtId && setSchoolModal(true)}
        disabled={!districtId || saving}
      >
        <Text style={styles.selectTxt}>
          {!districtId ? "Pick a district first" : schoolName ?? "Select school"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.5 }]}
        onPress={save}
        disabled={!canSave || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Save & Continue</Text>}
      </Pressable>

      {/* District modal */}
      <Modal visible={districtModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TextInput
              placeholder="Search…"
              value={districtSearch}
              onChangeText={setDistrictSearch}
              style={styles.search}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredDistricts}
              keyExtractor={(d) => d.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setDistrictId(item.id);
                    setDistrictName(item.name);
                    // clear previous school
                    setSchoolId(null);
                    setSchoolName(null);
                    setDistrictModal(false);
                  }}
                >
                  <Text style={styles.modalTxt}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setDistrictModal(false)}>
              <Text style={styles.modalCloseTxt}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* School modal */}
      <Modal visible={schoolModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select School</Text>
              <TextInput
                placeholder="Search by name or number…"
                value={schoolSearch}
                onChangeText={setSchoolSearch}
                style={styles.search}
                autoCapitalize="none"
              />
              <FlatList
                data={filteredSchools}
                keyExtractor={(s) => s.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={{ color: "#6B7280", padding: 8 }}>
                    {districtId ? "No schools found for this district." : "Pick a district first."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      setSchoolId(item.id);
                      setSchoolName(item.name);
                      setSchoolModal(false);
                    }}
                  >
                    <Text style={styles.modalTxt}>
                      {item.name}{item.number ? `  •  #${item.number}` : ""}
                    </Text>
                  </Pressable>
                )}
              />
              <Pressable style={styles.modalClose} onPress={() => setSchoolModal(false)}>
                <Text style={styles.modalCloseTxt}>Close</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const COLORS = {
  text: "#0B2A4A",
  border: "#E5E7EB",
  muted: "#6B7280",
  brand: "#0B66FF",
  bg: "#FFFFFF",
  accent: "#2e7d32",
  err: "#DC2626",
  errBg: "#FEE2E2",
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: COLORS.bg, gap: 14, paddingBottom: 24, minHeight: "100%" },
  label: { fontWeight: "700", color: COLORS.text, marginBottom: 6, marginTop: 4 },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#fff",
  },
  segmentBtnActive: { backgroundColor: "#E6F4EA", borderColor: "#CDE9D3" },
  segmentTxt: { color: COLORS.text },
  segmentTxtActive: { color: COLORS.accent, fontWeight: "800" },
  select: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff", marginBottom: 6,
  },
  selectTxt: { color: COLORS.text },
  disabled: { opacity: 0.5 },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  saveTxt: { color: "#fff", fontWeight: "800" },
  errBox: { backgroundColor: COLORS.errBg, borderWidth: 1, borderColor: COLORS.err, padding: 10, borderRadius: 8 },
  errTitle: { color: COLORS.err, fontWeight: "800", marginBottom: 2 },
  errText: { color: COLORS.err },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "75%", backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  modalItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  modalTxt: { color: COLORS.text, fontSize: 16 },
  modalClose: { marginTop: 8, alignSelf: "center", backgroundColor: COLORS.brand, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalCloseTxt: { color: "#fff", fontWeight: "700" },
  search: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
});