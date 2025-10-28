// app/quiz/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

type Option = { id: string; label: string; is_correct: boolean; sort_order: number | null };
type Question = { id: string; body: string; sort_order: number | null; quiz_options: Option[] };
type Quiz = { id: string; title: string; description: string | null; pass_mark: number | null };

export default function QuizRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Load quiz + questions
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: qz, error: qErr } = await supabase
          .from("quizzes")
          .select("id, title, description, pass_mark")
          .eq("id", id)
          .maybeSingle();
        if (qErr) throw qErr;
        if (!qz) throw new Error("Quiz not found.");
        setQuiz(qz as Quiz);

        const { data: qs, error: sErr } = await supabase
          .from("quiz_questions")
          .select("id, body, sort_order, quiz_options ( id, label, is_correct, sort_order )")
          .eq("quiz_id", id)
          .order("sort_order", { ascending: true });
        if (sErr) throw sErr;

        const rows = (qs ?? []) as Question[];
        rows.forEach((q) =>
          q.quiz_options.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
        );
        setQuestions(rows);

        const start: Record<string, string | null> = {};
        rows.forEach((q) => (start[q.id] = null));
        setAnswers(start);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Could not load quiz.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const total = questions.length;
  const ready = useMemo(() => Object.values(answers).every((v) => v), [answers]);
  const passingScore = useMemo(() => {
    if (quiz?.pass_mark != null) return quiz.pass_mark;
    return total; // default: perfect score to pass
  }, [quiz?.pass_mark, total]);
  const passed = submitted && score >= passingScore;

  async function submit() {
    if (!quiz) return;
    try {
      setSubmitting(true);
      let s = 0;
      for (const q of questions) {
        const picked = answers[q.id];
        const opt = q.quiz_options.find((o) => o.id === picked);
        if (opt?.is_correct) s += 1;
      }
      setScore(s);
      setSubmitted(true);

      // record attempt
      const { data: uRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = uRes.user?.id;
      if (uid) {
        const { error: iErr } = await supabase
          .from("quiz_attempts")
          .insert({ user_id: uid, quiz_id: quiz.id, score: s, out_of: total });
        if (iErr) throw iErr;
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetQuiz() {
    const start: Record<string, string | null> = {};
    questions.forEach((q) => (start[q.id] = null));
    setAnswers(start);
    setSubmitted(false);
    setScore(0);
  }

  function quitToLearning() {
    router.replace("/(tabs)/learning"); // back to Learning tab
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Blue hero header (flush at top) */}
      <AppHeader
        title={quiz?.title ?? "Quiz"}
        subtitle={quiz?.description ?? "Answer all questions"}
      />

      {/* Body */}
      {!submitted ? (
        <ScrollView contentContainerStyle={styles.container}>
          {loading ? (
            <ActivityIndicator />
          ) : questions.length === 0 ? (
            <Text style={styles.muted}>No questions yet.</Text>
          ) : (
            <>
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.qBlock}>
                  <Text style={styles.qLabel}>
                    Q{idx + 1}. {q.body}
                  </Text>
                  {q.quiz_options.map((opt) => {
                    const picked = answers[q.id] === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.opt, picked && styles.optPicked]}
                        onPress={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                        }
                      >
                        <Text style={[styles.optTxt, picked && styles.optTxtPicked]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <View style={{ height: 100 }} />
            </>
          )}
        </ScrollView>
      ) : (
        // ---------- Completion Screen ----------
        <View style={styles.resultWrap}>
          <Text style={styles.emoji}>{passed ? "🎉" : "📘"}</Text>
          <Text style={styles.resultTitle}>{passed ? "Great job!" : "Nice try!"}</Text>
          <Text style={styles.resultScore}>
            Score: {score} / {total}
          </Text>
          <Text style={styles.resultHint}>
            {passed
              ? "You’ve passed this quiz."
              : `You need at least ${passingScore}/${total} to pass.`}
          </Text>

          <View style={{ height: 16 }} />

          <Pressable style={[styles.primaryBtn]} onPress={resetQuiz}>
            <Text style={styles.primaryBtnTxt}>Retake Quiz</Text>
          </Pressable>

          <Pressable style={[styles.secondaryBtn]} onPress={quitToLearning}>
            <Text style={styles.secondaryBtnTxt}>Return to Learning</Text>
          </Pressable>
        </View>
      )}

      {/* Sticky footer actions (only while taking the quiz) */}
      {!submitted && (
        <View style={styles.footer}>
          <Pressable style={[styles.quitBtn]} onPress={quitToLearning}>
            <Text style={styles.quitTxt}>Quit & return to Learning</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, !ready && { opacity: 0.6 }]}
            onPress={submit}
            disabled={!ready || submitting}
          >
            <Text style={styles.submitTxt}>{submitting ? "Submitting…" : "Submit"}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ——— Styles ——— */
const COLORS = {
  text: "#0B2A4A",
  muted: "#64748B",
  border: "#E5E7EB",
  brand: "#0B66FF",
  correct: "#DCFCE7",
  wrong: "#FEE2E2",
  picked: "#E0EAFF",
  danger: "#B91C1C",
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#fff" },
  muted: { color: COLORS.muted },

  qBlock: { marginTop: 8, gap: 6 },
  qLabel: { color: COLORS.text, fontWeight: "800", fontSize: 16 },

  opt: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    marginTop: 6,
  },
  optPicked: { backgroundColor: COLORS.picked, borderColor: "#C7D2FE" },
  optTxt: { color: COLORS.text },
  optTxtPicked: { fontWeight: "800" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quitBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  quitTxt: { color: COLORS.danger, fontWeight: "800" },
  submitBtn: {
    flex: 1,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitTxt: { color: "#fff", fontWeight: "800" },

  // Completion screen
  resultWrap: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  resultTitle: { fontSize: 22, fontWeight: "900", color: COLORS.text },
  resultScore: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginTop: 6 },
  resultHint: { color: COLORS.muted, marginTop: 4 },

  primaryBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  secondaryBtnTxt: { color: COLORS.text, fontWeight: "800" },
});