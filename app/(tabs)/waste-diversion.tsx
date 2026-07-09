// app/(tabs)/waste-diversion.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
async function getProfileDistrictSchool(): Promise<{ district?: string; school?: string }> {
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
  MONTH: number; YEAR: number; DISTRICT: string; SCHOOL: string;
  ENROLLMENT: number; RECYCLE: number; COMPOST: number;
  COMBINED?: number;
  ["POUNDS/STUDENT"]?: number;
};

export default function WasteDiversion() {
  const nav = useNavigation();

  const [loading, setLoading] = useState(true);          // initial districts load
  const [rowsLoading, setRowsLoading] = useState(false); // per-school data load
  const [errText, setErrText] = useState<string | null>(null);

  // data (scoped — we never pull the whole table anymore)
  const [districts, setDistricts] = useState<string[]>([]);
  const [schoolsInDistrict, setSchoolsInDistrict] = useState<string[]>([]);
  const [schoolRows, setSchoolRows] = useState<Row[]>([]);

  // UI state
  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");

  // selections
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // remember the profile's preferred district/school so we can preselect them once
  const profilePrefs = useRef<{ district?: string; school?: string }>({});
  const appliedProfileSchool = useRef(false);

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

  // 1) On mount: load the district list (lightweight view) + profile prefs, then
  //    preselect a district. We do NOT pull the whole records table.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErrText(null);
        setLoading(true);

        try {
          profilePrefs.current = await getProfileDistrictSchool();
        } catch (e: any) {
          console.warn("profile read warning:", e?.message ?? e);
        }

        const { data, error } = await supabase
          .from("view_districts_dropdown")
          .select("name")
          .order("name", { ascending: true });
        if (error) throw new Error(`districts: ${error.message}`);
        if (cancelled) return;

        const dists = (data ?? []).map((d: any) => d.name).filter(Boolean) as string[];
        setDistricts(dists);

        const pd = profilePrefs.current.district;
        setSelectedDistrict(pd && dists.includes(pd) ? pd : (dists[0] ?? null));
      } catch (e: any) {
        console.error(e);
        setErrText(e?.message ?? "Failed to load districts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) When the district changes: load its schools (from the view) and preselect one.
  useEffect(() => {
    if (!selectedDistrict) { setSchoolsInDistrict([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setErrText(null);
        const { data, error } = await supabase
          .from("view_schools_dropdown")
          .select("name")
          .eq("district", selectedDistrict)
          .order("name", { ascending: true });
        if (error) throw new Error(`schools: ${error.message}`);
        if (cancelled) return;

        const schools = (data ?? []).map((s: any) => s.name).filter(Boolean) as string[];
        setSchoolsInDistrict(schools);

        // Use the profile's school only for the very first render; after that,
        // switching district just picks that district's first school.
        const ps = profilePrefs.current.school;
        const chosen = (!appliedProfileSchool.current && ps && schools.includes(ps))
          ? ps
          : (schools[0] ?? null);
        appliedProfileSchool.current = true;
        setSelectedSchool(chosen);
      } catch (e: any) {
        console.error(e);
        setErrText(e?.message ?? "Failed to load schools.");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDistrict]);

  // 3) When a school is selected: load ONLY that school's monthly records (tiny result).
  useEffect(() => {
    if (!selectedDistrict || !selectedSchool) { setSchoolRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setRowsLoading(true);
        setErrText(null);
        const { data, error } = await supabase
          .from("waste_diversion_records")
          .select("*")
          .eq("DISTRICT", selectedDistrict)
          .eq("SCHOOL", selectedSchool)
          .order("YEAR", { ascending: true })
          .order("MONTH", { ascending: true });
        if (error) throw new Error(`waste_diversion_records: ${error.message}`);
        if (cancelled) return;
        setSchoolRows((data ?? []) as Row[]);
      } catch (e: any) {
        console.error(e);
        setErrText(e?.message ?? "Failed to load diversion data.");
        setSchoolRows([]);
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDistrict, selectedSchool]);

  // --------- derived metrics (operate on the selected school's rows) ----------
  const enrollment = useMemo(() => {
    if (schoolRows.length === 0) return 0;
    // Find the latest year/month in the dataset
    let maxY = 0, maxM = 0;
    schoolRows.forEach(r => {
      const y = num(r.YEAR);
      const m = num(r.MONTH);
      if (y > maxY || (y === maxY && m > maxM)) {
        maxY = y;
        maxM = m;
      }
    });

    // Get all rows for that latest month
    const latestRows = schoolRows.filter(r => num(r.YEAR) === maxY && num(r.MONTH) === maxM);

    // Enrollment is usually repeated per row (per account), so we take the MAX, not SUM.
    // (If it were split, we'd expect small numbers, but usually it's total school population).
    if (latestRows.length === 0) return 0;
    return Math.max(...latestRows.map(r => num(r.ENROLLMENT)));
  }, [schoolRows]);

  const monthly = useMemo(() => {
    const map = new Map<string, { year: number; month: number; recycle: number; compost: number; diverted: number }>();
    for (const r of schoolRows) {
      const y = num(r.YEAR);
      const m = num(r.MONTH);
      const key = monthKey(y, m);
      const recycle = num(r.RECYCLE);
      const compost = num(r.COMPOST);
      const diverted = recycle + compost;

      if (!map.has(key)) map.set(key, { year: y, month: m, recycle: 0, compost: 0, diverted: 0 });
      const row = map.get(key)!;
      row.recycle += recycle; row.compost += compost; row.diverted += diverted;
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, v]) => ({ key, ...v }));
  }, [schoolRows]);

  const maxDiverted = useMemo(() => Math.max(1, ...monthly.map(m => m.diverted)), [monthly]);

  const kpis = useMemo(() => {
    const totalRecycle = monthly.reduce((s, r) => s + r.recycle, 0);
    const totalCompost = monthly.reduce((s, r) => s + r.compost, 0);
    const totalDiverted = totalRecycle + totalCompost;
    const perStudent = enrollment > 0 ? totalDiverted / enrollment : 0;
    return { totalRecycle, totalCompost, totalDiverted, perStudent, enrollment };
  }, [monthly, enrollment]);

  const chartData = monthly;

  // --------- UI ----------
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Error Banner */}
        {!!errText && (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={20} color="#B91C1C" />
            <Text style={styles.errText}>{errText}</Text>
          </View>
        )}

        {/* 1. Header & Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.filterRow}>
            {/* District Plug */}
            <Pressable
              style={[styles.filterPill, !selectedDistrict && styles.filterPillActive]}
              onPress={() => setDistrictModal(true)}
            >
              <Ionicons name="business" size={16} color={selectedDistrict ? "#0B2A4A" : "#fff"} />
              <Text style={[styles.filterText, !selectedDistrict && styles.filterTextActive]}>
                {selectedDistrict ?? (loading ? "Loading..." : "Select District")}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedDistrict ? "#94A3B8" : "#fff"} />
            </Pressable>

            {/* School Plug */}
            <Pressable
              style={[
                styles.filterPill,
                selectedDistrict && !selectedSchool && styles.filterPillActive,
                !selectedDistrict && styles.filterDisabled
              ]}
              onPress={() => selectedDistrict && setSchoolModal(true)}
              disabled={!selectedDistrict}
            >
              <Ionicons name="school" size={16} color={selectedSchool ? "#0B2A4A" : (selectedDistrict ? "#fff" : "#94A3B8")} />
              <Text style={[
                styles.filterText,
                selectedDistrict && !selectedSchool && styles.filterTextActive,
                !selectedDistrict && styles.filterTextDisabled
              ]}>
                {selectedSchool ?? "Select School"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedDistrict ? "#94A3B8" : "#CBD5E1"} />
            </Pressable>
          </View>
        </View>

        {(loading || rowsLoading) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2e7d32" />
            <Text style={styles.loadingText}>Crunching the numbers...</Text>
          </View>
        ) : schoolRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No data available for this selection.</Text>
            <Text style={styles.emptySub}>Try selecting a different school or district.</Text>
          </View>
        ) : (
          <>
            {/* 2. Key Performance Indicators (Grid) */}
            <View style={styles.kpiGrid}>
              <KPICard
                label="Total Diverted"
                value={kpis.totalDiverted.toLocaleString()}
                unit="lbs"
                icon="leaf"
                color="#10B981"
                trend="+12%" // Placeholder trending
              />
              <KPICard
                label="Impact / Student"
                value={kpis.perStudent.toFixed(1)}
                unit="lbs"
                icon="people"
                color="#3B82F6"
              />
              <KPICard
                label="Recycled"
                value={kpis.totalRecycle.toLocaleString()}
                unit="lbs"
                icon="refresh-circle"
                color="#0EA5E9"
              />
              <KPICard
                label="Composted"
                value={kpis.totalCompost.toLocaleString()}
                unit="lbs"
                icon="nutrition"
                color="#F59E0B"
              />
            </View>

            {/* 3. Charts Section */}
            <View style={styles.chartCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="bar-chart" size={20} color="#0B2A4A" />
                <Text style={styles.cardTitle}>Diversion Trends</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                <View style={styles.chartWrapper}>
                  <StackedBarChart data={chartData} height={220} padding={32} />
                </View>
              </ScrollView>
            </View>

            {/* 4. Monthly List */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
              <View style={styles.listCard}>
                <FlatList
                  data={monthly}
                  keyExtractor={(it) => it.key}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  renderItem={({ item }) => {
                    const pct = Math.min((item.diverted / maxDiverted) * 100, 100);
                    return (
                      <View style={styles.listItem}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateMonth}>{formatMonthLabel(item.key).split(" ")[0]}</Text>
                          <Text style={styles.dateYear}>{formatMonthLabel(item.key).split(" ")[1]}</Text>
                        </View>

                        <View style={styles.listContent}>
                          <View style={styles.listRow}>
                            <Text style={styles.listLabel}>Diverted</Text>
                            <Text style={styles.listValue}>{Math.round(item.diverted).toLocaleString()} lbs</Text>
                          </View>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressBar, { width: `${pct}%` }]} />
                          </View>
                          <View style={styles.listSubRow}>
                            <Text style={styles.listSub}>♻️ {Math.round(item.recycle)}</Text>
                            <Text style={styles.listSub}>🍂 {Math.round(item.compost)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* MODALS */}
      <Modal visible={districtModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDistrictModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <Pressable onPress={() => setDistrictModal(false)}>
                <Ionicons name="close-circle" size={28} color="#CBD5E1" />
              </Pressable>
            </View>
            <FlatList
              data={districts}
              keyExtractor={(d) => d}
              style={{ flexShrink: 1 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, item === selectedDistrict && styles.modalOptionSelected]}
                  onPress={() => {
                    setSelectedDistrict(item);
                    setSelectedSchool(null); // effect #2 loads this district's schools and picks the first
                    setDistrictModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, item === selectedDistrict && styles.modalOptionTextSelected]}>
                    {item}
                  </Text>
                  {item === selectedDistrict && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={schoolModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSchoolModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
            <View style={[styles.modalContent, styles.modalContentLarge]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select School</Text>
                <Pressable onPress={() => setSchoolModal(false)}>
                  <Ionicons name="close-circle" size={28} color="#CBD5E1" />
                </Pressable>
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                  placeholder="Find your school..."
                  value={schoolSearch}
                  onChangeText={setSchoolSearch}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <FlatList
                data={schoolsInDistrict.filter((s) => s.toLowerCase().includes(schoolSearch.toLowerCase()))}
                keyExtractor={(s) => s}
                style={{ flexShrink: 1 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.modalOption, item === selectedSchool && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedSchool(item);
                      setSchoolModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, item === selectedSchool && styles.modalOptionTextSelected]}>
                      {item}
                    </Text>
                    {item === selectedSchool && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                  </Pressable>
                )}
              />
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

    </View>
  );
}

// --------- COMPONENTS ----------

function KPICard({ label, value, unit, icon, color, trend }: any) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>
          {label} <Text style={styles.kpiUnit}>({unit})</Text>
        </Text>
      </View>
    </View>
  );
}

// --------- STYLES ----------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20 },

  // Section Headers
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 12 },

  // Error
  errBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    padding: 12, borderRadius: 12, marginBottom: 16,
  },
  errText: { color: "#B91C1C", fontSize: 14, flex: 1 },

  // Filters
  filterSection: { marginBottom: 24 },
  filterRow: { flexDirection: "row", gap: 10 },
  filterPill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 100, // Pill shape
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  filterPillActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  filterDisabled: { backgroundColor: "#F1F5F9", opacity: 0.7 },
  filterText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0F172A" },
  filterTextActive: { color: "#fff" },
  filterTextDisabled: { color: "#94A3B8" },

  // KPI Grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  kpiCard: {
    width: "48%", backgroundColor: "#fff", padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: "#F1F5F9",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  kpiUnit: { fontWeight: "400", fontSize: 11 },

  // Charts
  chartCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: "#F1F5F9",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  chartScroll: { paddingVertical: 8 },
  chartWrapper: { minWidth: 280 },

  // List
  listSection: { marginBottom: 20 },
  listCard: {
    backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1, borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row", padding: 16, gap: 16,
  },
  separator: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 70 },
  dateBadge: {
    width: 50, height: 54, borderRadius: 12,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  dateMonth: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", color: "#64748B" },
  dateYear: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },

  listContent: { flex: 1, justifyContent: "center", gap: 6 },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  listLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  listValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },

  progressTrack: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 10, width: "100%" },
  progressBar: { height: "100%", backgroundColor: "#10B981", borderRadius: 10 },

  listSubRow: { flexDirection: "row", gap: 12 },
  listSub: { fontSize: 11, color: "#64748B", fontWeight: "500" },

  // States
  loadingBox: { padding: 40, alignItems: "center", gap: 12 },
  loadingText: { color: "#64748B", fontSize: 14 },
  emptyState: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#0F172A", textAlign: "center" },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  // flex:1 gives the sheet a definite full-height context so modalContent's
  // maxHeight "%" resolves on web; justify flex-end keeps it anchored to the bottom.
  keyboardView: { flex: 1, width: "100%", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: "60%",
  },
  modalContentLarge: { maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0"
  },
  searchInput: { flex: 1, fontSize: 16, color: "#0F172A" },

  modalOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9"
  },
  modalOptionSelected: { backgroundColor: "#F0FDF4", marginHorizontal: -24, paddingHorizontal: 24 },
  modalOptionText: { fontSize: 16, fontWeight: "500", color: "#334155" },
  modalOptionTextSelected: { fontWeight: "700", color: "#15803D" },
});