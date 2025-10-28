// app/(tabs)/resources.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  category: "lesson_plan" | "poster" | "coloring_book" | "other";
  grade: "elementary" | "middle" | "high" | "all";
  file_url: string;
  file_type: "pdf" | "image" | "other" | string;
  file_size: string | null;
  tags: string[] | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
};

type Section = {
  id: string;
  title: string;
  subtitle?: string;
  items: ResourceRow[];
};

const COLORS = {
  text: "#0B2A4A",
  border: "#E5E7EB",
  muted: "#6B7280",
  card: "#FFFFFF",
  brand: "#0B66FF",
  accent: "#2e7d32",
  bg: "#FFFFFF",
  chip: "#F1F5F9",
};

function iconForType(type?: string) {
  switch ((type ?? "").toLowerCase()) {
    case "pdf": return "document-text-outline";
    case "image": return "image-outline";
    default: return "document-outline";
  }
}

export default function Resources() {
  const nav = useNavigation();
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "lp-elementary": true,
    "lp-middle": true,
    "lp-high": true,
    "posters": true,
    "coloring": true,
  });

  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Header
  useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Resources"
          subtitle="Lesson plans, posters, and printables"
        />
      ),
    });
  }, [nav]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("grade", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as ResourceRow[]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Load error", e?.message ?? "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRows();
    setRefreshing(false);
  }, [fetchRows]);

  // Filter (search)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false) ||
      (r.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [rows, query]);

  // Group into sections
  const sections: Section[] = useMemo(() => {
    // Lesson Plans split by grade
    const el = filtered.filter((r) => r.category === "lesson_plan" && (r.grade === "elementary" || r.grade === "all"));
    const ms = filtered.filter((r) => r.category === "lesson_plan" && (r.grade === "middle" || r.grade === "all"));
    const hs = filtered.filter((r) => r.category === "lesson_plan" && (r.grade === "high" || r.grade === "all"));

    const posters = filtered.filter((r) => r.category === "poster");
    const coloring = filtered.filter((r) => r.category === "coloring_book");

    const out: Section[] = [
      { id: "lp-elementary", title: "Lesson Plans — Elementary", subtitle: "TEKS-aligned K–5 activities", items: el },
      { id: "lp-middle", title: "Lesson Plans — Middle School", subtitle: "Grades 6–8 | Deeper explorations", items: ms },
      { id: "lp-high", title: "Lesson Plans — High School", subtitle: "Grades 9–12 | Critical thinking", items: hs },
      { id: "posters", title: "Posters", subtitle: "Print-ready classroom posters", items: posters },
      { id: "coloring", title: "Coloring Books", subtitle: "Fun printable activities", items: coloring },
    ];

    // Hide empty sections only if search is active; otherwise show all with empty message
    return query.trim() ? out.filter((s) => s.items.length > 0) : out;
  }, [filtered, query]);

  function toggle(sectionId: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  async function openResource(uri: string) {
    const ok = await Linking.canOpenURL(uri);
    if (!ok) {
      Alert.alert("Cannot open link", "Please check the URL or try again later.");
      return;
    }
    Linking.openURL(uri);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          placeholder="Search resources…"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {/* Sections */}
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Pressable onPress={() => toggle(section.id)} style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons
                name={openSections[section.id] ? "chevron-down" : "chevron-forward"}
                size={18}
                color={COLORS.text}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.subtitle ? (
              <Text numberOfLines={1} style={styles.sectionSubtitle}>
                {section.subtitle}
              </Text>
            ) : <View />}
          </Pressable>

          {openSections[section.id] && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {section.items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <View style={styles.iconWrap}>
                      <Ionicons name={iconForType(item.file_type)} size={20} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {!!item.description && (
                        <Text style={styles.itemDesc}>{item.description}</Text>
                      )}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        {!!item.file_size && <Chip label={item.file_size} />}
                        {!!item.file_type && <Chip label={String(item.file_type).toUpperCase()} />}
                        {!!item.tags?.length && item.tags.slice(0, 3).map((t) => (
                          <Chip key={t} label={t} />
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => openResource(item.file_url)}>
                      <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                      <Text style={[styles.btnTxt, { color: "#fff" }]}>Open / Download</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {section.items.length === 0 && (
                <Text style={styles.empty}>No items found in this section.</Text>
              )}
            </View>
          )}
        </View>
      ))}

      {!loading && sections.length === 0 && (
        <Text style={styles.empty}>No resources match your search.</Text>
      )}
    </ScrollView>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipTxt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, gap: 16, backgroundColor: COLORS.bg },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: "#fff",
  },
  searchInput: { flex: 1, color: COLORS.text },
  section: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { color: COLORS.muted, maxWidth: "60%" },
  card: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12,
    backgroundColor: COLORS.card, gap: 10,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: "#ECFDF5",
    alignItems: "center", justifyContent: "center",
  },
  itemTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  itemDesc: { color: COLORS.muted, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  btnPrimary: { backgroundColor: COLORS.accent },
  btnTxt: { fontWeight: "700" },
  chip: {
    backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  chipTxt: { color: COLORS.muted, fontSize: 12 },
  empty: { color: COLORS.muted, textAlign: "center", paddingVertical: 12 },
});