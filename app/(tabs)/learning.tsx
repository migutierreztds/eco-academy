// app/(tabs)/learning.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  pass_mark: number | null;
};

type LatestAttempt = {
  quiz_id: string;
  score: number;
  out_of: number;
  created_at: string;
};

export default function Learning() {
  const router = useRouter();
  const nav = useNavigation();

  // Make the header match other tabs (Resources, etc.)
  useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Learning"
          subtitle="Training & quizzes"
        />
      ),
    });
  }, [nav]);

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [latest, setLatest] = useState<Record<string, LatestAttempt>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({}); // accordion per category

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) All published quizzes
        const { data: qz, error: qErr } = await supabase
          .from("quizzes")
          .select("id, title, description, category, pass_mark")
          .eq("is_published", true)
          .order("category", { ascending: true })
          .order("title", { ascending: true });
        if (qErr) throw qErr;
        setQuizzes((qz ?? []) as QuizRow[]);

        // 2) Latest attempts for the current user (RLS handles privacy)
        const { data: uRes, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        const uid = uRes.user?.id;

        if (uid) {
          const { data: la, error: lErr } = await supabase
            .from("quiz_latest_attempts")
            .select("quiz_id, score, out_of, created_at")
            .eq("user_id", uid);
          if (lErr) throw lErr;

          const map: Record<string, LatestAttempt> = {};
          (la ?? []).forEach((row) => (map[row.quiz_id] = row as LatestAttempt));
          setLatest(map);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group by category
  const groups = useMemo(() => {
    const g: Record<string, QuizRow[]> = {};
    for (const q of quizzes) {
      if (!g[q.category]) g[q.category] = [];
      g[q.category].push(q);
    }
    return g;
  }, [quizzes]);

  // Accordion default: open first group
  useEffect(() => {
    const cats = Object.keys(groups);
    if (cats.length && Object.keys(open).length === 0) {
      setOpen({ [cats[0]]: true });
    }
  }, [groups, open]);

  function completionPill(q: QuizRow) {
    const att = latest[q.id];
    if (!att) return <Badge label="Not started" tone="muted" />;
    const passed =
      typeof q.pass_mark === "number"
        ? att.score >= q.pass_mark
        : att.score === att.out_of;
    return passed ? (
      <Badge label={`Completed ${att.score}/${att.out_of}`} tone="success" />
    ) : (
      <Badge label={`Attempted ${att.score}/${att.out_of}`} tone="warn" />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        Object.entries(groups).map(([category, list]) => (
          <View key={category} style={styles.section}>
            {/* Section header (accordion) */}
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [category]: !o[category] }))}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>{category}</Text>
              <Text style={styles.chev}>{open[category] ? "▾" : "▸"}</Text>
            </Pressable>

            {open[category] && (
              <View style={styles.cardList}>
                {list.map((q) => (
                  <Pressable
                    key={q.id}
                    style={styles.card}
                    onPress={() => router.push(`/quiz/${q.id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{q.title}</Text>
                      {!!q.description && (
                        <Text style={styles.cardSub}>{q.description}</Text>
                      )}
                    </View>
                    <View>{completionPill(q)}</View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/* ——— UI bits ——— */
function Badge({ label, tone }: { label: string; tone: "success" | "warn" | "muted" }) {
  const style =
    tone === "success"
      ? { backgroundColor: "#E6F4EA", borderColor: "#CDE9D3", color: "#1B5E20" }
      : tone === "warn"
      ? { backgroundColor: "#FEF3C7", borderColor: "#FDE68A", color: "#92400E" }
      : { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0", color: "#475569" };
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: style.backgroundColor, borderColor: style.borderColor },
      ]}
    >
      <Text style={[styles.badgeTxt, { color: style.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Match Resources: padding + white background
  container: { padding: 16, paddingBottom: 24, gap: 12, backgroundColor: "#FFFFFF" },

  section: { marginTop: 8 },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0B2A4A" },
  chev: { color: "#64748B", fontWeight: "800" },

  cardList: { marginTop: 8, gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: { color: "#0B2A4A", fontWeight: "800" },
  cardSub: { color: "#64748B", marginTop: 2 },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeTxt: { fontSize: 12, fontWeight: "800" },
});