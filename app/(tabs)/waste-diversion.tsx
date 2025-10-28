// app/(tabs)/waste-diversion.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "~/lib/supabase";
import { StackedBarChart, LineChart } from "../../components/Charts";

// --------- helpers ----------
const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}
async function getProfileDistrictSchool(): Promise<{district?: string; school?: string}> {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) return {};
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("district, school")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { district: prof?.district ?? undefined, school: prof?.school ?? undefined };
}

// --------- types ----------
type Row = {
  MONTH: string; YEAR: string; DISTRICT: string; NUMBER: string; SCHOOL: string;
  ENROLLMENT: string; RECYCLE: string; COMPOST: string; COMBINED?: string;
  ["POUNDS/STUDENT"]?: string;
};

export default function WasteDiversion() {
  const nav = useNavigation();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState<string | null>(null);

  // UI state
  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");

  // selections
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // dynamic header subtitle
  const headerSubtitle = useMemo(() => {
    if (selectedSchool && selectedDistrict) return `${selectedSchool} • ${selectedDistrict}`;
    if (selectedDistrict) return selectedDistrict;
    return undefined;
  }, [selectedDistrict, selectedSchool]);

  useEffect(() => {
    nav.setOptions?.({
      header: () => <AppHeader title="Waste Diversion" subtitle={headerSubtitle} />,
    });
  }, [nav, headerSubtitle]);

  // --------- load data + preselect ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErrText(null);
        setLoading(true);

        // 1) read profile (best-effort; don’t fail the screen if this errors)
        let profileDistrict: string | undefined;
        let profileSchool: string | undefined;
        try {
          const prefs = await getProfileDistrictSchool();
          profileDistrict = prefs.district;
          profileSchool = prefs.school ?? undefined;
        } catch (e: any) {
          console.warn("profile read warning:", e?.message ?? e);
        }

        // 2) read diversion rows (this is the critical call that RLS can block)
        const { data, error } = await supabase
          .from("stg_diversion_csv")
          .select("*")
          .order("DISTRICT", { ascending: true })
          .order("SCHOOL", { ascending: true })
          .order("YEAR", { ascending: true })
          .order("MONTH", { ascending: true });

        if (error) {
          throw new Error(`stg_diversion_csv select: ${error.message}`);
        }

        const r = (data ?? []) as Row[];
        if (cancelled) return;

        setRows(r);

        // distinct districts
        const dists = Array.from(new Set(r.map(x => x.DISTRICT).filter(Boolean))).sort((a,b)=>a.localeCompare(b));

        // choose district: prefer profile if present in data, else first available (or null)
        const chosenDistrict = profileDistrict && dists.includes(profileDistrict)
          ? profileDistrict
          : dists[0] ?? null;

        // choose school for chosen district (prefer profile if present)
        let chosenSchool: string | null = null;
        if (chosenDistrict) {
          const schools = Array.from(
            new Set(r.filter(x => x.DISTRICT === chosenDistrict).map(x => x.SCHOOL).filter(Boolean))
          ).sort((a,b)=>a.localeCompare(b));
          chosenSchool = profileSchool && schools.includes(profileSchool) ? profileSchool : (schools[0] ?? null);
        }

        setSelectedDistrict(chosenDistrict);
        setSelectedSchool(chosenSchool);
      } catch (e: any) {
        console.error(e);
        setErrText(e?.message ?? "Failed to load diversion data.");
        // don’t Alert on web; we render the error inline instead
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --------- derived collections ----------
  const districts = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.DISTRICT && s.add(r.DISTRICT));
    return [...s].sort((a,b)=>a.localeCompare(b));
  }, [rows]);

  const schoolsInDistrict = useMemo(() => {
    if (!selectedDistrict) return [];
    const s = new Set<string>();
    rows.forEach((r) => { if (r.DISTRICT === selectedDistrict) s.add(r.SCHOOL); });
    return [...s].sort((a,b)=>a.localeCompare(b));
  }, [rows, selectedDistrict]);

  const schoolRows = useMemo(() => {
    if (!selectedDistrict || !selectedSchool) return [];
    return rows.filter((r) => r.DISTRICT === selectedDistrict && r.SCHOOL === selectedSchool);
  }, [rows, selectedDistrict, selectedSchool]);

  const enrollment = useMemo(() => {
    if (schoolRows.length === 0) return 0;
    return num(schoolRows[schoolRows.length - 1].ENROLLMENT);
  }, [schoolRows]);

  const monthly = useMemo(() => {
    const map = new Map<string, { year:number; month:number; recycle:number; compost:number; diverted:number }>();
    for (const r of schoolRows) {
      const y = num(r.YEAR);
      const m = num(r.MONTH);
      const key = monthKey(y, m);
      const recycle = num(r.RECYCLE);
      const compost = num(r.COMPOST);
      const diverted = recycle + compost;
      if (!map.has(key)) map.set(key, { year:y, month:m, recycle:0, compost:0, diverted:0 });
      const row = map.get(key)!;
      row.recycle += recycle; row.compost += compost; row.diverted += diverted;
    }
    return [...map.entries()]
      .sort(([a],[b]) => (a < b ? -1 : 1))
      .map(([key, v]) => ({ key, ...v }));
  }, [schoolRows]);

  const maxDiverted = useMemo(() => Math.max(1, ...monthly.map(m => m.diverted)), [monthly]);

  const kpis = useMemo(() => {
    const totalRecycle = monthly.reduce((s,r)=>s+r.recycle,0);
    const totalCompost = monthly.reduce((s,r)=>s+r.compost,0);
    const totalDiverted = totalRecycle + totalCompost;
    const perStudent = enrollment > 0 ? totalDiverted / enrollment : 0;
    return { totalRecycle, totalCompost, totalDiverted, perStudent, enrollment };
  }, [monthly, enrollment]);

  const chartData = monthly;

  // --------- UI ----------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* error banner */}
      {!!errText && (
        <View style={styles.errBox}>
          <Text style={styles.errTitle}>Error</Text>
          <Text style={styles.errText}>{errText}</Text>
        </View>
      )}

      {/* Pickers */}
      <View style={styles.row}>
        <View style={{ flex:1 }}>
          <Text style={styles.label}>ISD</Text>
          <Pressable style={styles.select} onPress={() => setDistrictModal(true)} hitSlop={8}>
            <Text style={styles.selectTxt}>{selectedDistrict ?? (loading ? "Loading…" : "Select ISD")}</Text>
          </Pressable>
        </View>
        <View style={{ width:12 }} />
        <View style={{ flex:1 }}>
          <Text style={styles.label}>School</Text>
          <Pressable
            style={[styles.select, !selectedDistrict && styles.disabled]}
            onPress={() => selectedDistrict && setSchoolModal(true)}
            disabled={!selectedDistrict}
            hitSlop={8}
          >
            <Text style={styles.selectTxt}>
              {selectedDistrict ? (selectedSchool ?? "Select school") : "Pick an ISD first"}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40 }}><ActivityIndicator /></View>
      ) : schoolRows.length === 0 ? (
        <Text style={styles.muted}>No records for this selection.</Text>
      ) : (
        <>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KPI label="Enrollment" value={kpis.enrollment.toLocaleString()} />
            <KPI label="Recycle (lbs)" value={kpis.totalRecycle.toLocaleString()} />
            <KPI label="Compost (lbs)" value={kpis.totalCompost.toLocaleString()} />
            <KPI label="Diverted (lbs)" value={kpis.totalDiverted.toLocaleString()} />
            <KPI label="Diverted / Student (lbs)" value={kpis.perStudent.toFixed(1)} />
          </View>

          {/* Charts */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trends</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <StackedBarChart data={chartData} height={220} />
                <View style={{ height: 10 }} />
                <LineChart data={chartData} height={200} />
              </View>
            </ScrollView>
          </View>

          {/* Monthly bars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Diverted (lbs)</Text>
            <FlatList
              data={monthly}
              keyExtractor={(it) => it.key}
              scrollEnabled={false}
              removeClippedSubviews={false}
              renderItem={({ item }) => {
                const pct = Math.min((item.diverted / maxDiverted) * 100, 100);
                return (
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>{formatMonthLabel(item.key)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barDiverted, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barVal}>{Math.round(item.diverted).toLocaleString()}</Text>
                  </View>
                );
              }}
            />
          </View>
        </>
      )}

      {/* District modal */}
      <Modal visible={districtModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select ISD</Text>
            <FlatList
              data={districts}
              keyExtractor={(d) => d}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedDistrict(item);
                    const set = new Set<string>();
                    rows.forEach(r => { if (r.DISTRICT === item && r.SCHOOL) set.add(r.SCHOOL); });
                    const first = Array.from(set).sort((a,b)=>a.localeCompare(b))[0] ?? null;
                    setSelectedSchool(first);
                    setDistrictModal(false);
                  }}
                >
                  <Text style={styles.modalTxt}>{item}</Text>
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
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select School</Text>
              <TextInput
                placeholder="Search school…"
                value={schoolSearch}
                onChangeText={setSchoolSearch}
                style={styles.search}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <FlatList
                data={schoolsInDistrict.filter((s) => s.toLowerCase().includes(schoolSearch.toLowerCase()))}
                keyExtractor={(s) => s}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedSchool(item);
                      setSchoolModal(false);
                    }}
                  >
                    <Text style={styles.modalTxt}>{item}</Text>
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

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const COLORS = {
  text: "#0B2A4A",
  border: "#E5E7EB",
  muted: "#6B7280",
  card: "#FFFFFF",
  brand: "#2563EB",
  diverted: "#10B981",
  track: "#E5E7EB",
  mono: "#334155",
  errBorder: "#DC2626",
  errBg: "#FEE2E2",
  errText: "#B91C1C",
};

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14, backgroundColor: "#fff" },
  mono: { fontFamily: "monospace", color: COLORS.mono },
  row: { flexDirection: "row", alignItems: "flex-end" },
  label: { fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  select: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff",
  },
  selectTxt: { color: COLORS.text },
  disabled: { opacity: 0.5 },
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" },
  kpi: { minWidth: 150, flexGrow: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  kpiLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 6 },
  kpiValue: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginTop: 8 },
  cardTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 10, fontSize: 16 },
  muted: { color: COLORS.muted },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  barLabel: { width: 100, color: COLORS.text, fontVariant: ["tabular-nums"] },
  barTrack: { flex: 1, height: 12, backgroundColor: COLORS.track, borderRadius: 999, overflow: "hidden" },
  barDiverted: { height: "100%", backgroundColor: COLORS.diverted },
  barVal: { width: 90, textAlign: "right", color: COLORS.text, fontVariant: ["tabular-nums"] },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "75%", backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  modalItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  modalTxt: { color: COLORS.text, fontSize: 16 },
  modalClose: { marginTop: 8, alignSelf: "center", backgroundColor: COLORS.brand, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalCloseTxt: { color: "#fff", fontWeight: "700" },
  search: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  errBox: { borderWidth: 1, borderColor: COLORS.errBorder, backgroundColor: COLORS.errBg, padding: 10, borderRadius: 8 },
  errTitle: { color: COLORS.errText, fontWeight: "800", marginBottom: 4 },
  errText: { color: COLORS.errText },
});