import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl
} from "react-native";
import { useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "~/lib/supabase";

// ------------------------------------------------------------------
// TYPES & ASSETS
// ------------------------------------------------------------------
type LeaderboardEntry = {
  rank: number;
  school: string;
  district: string;
  score: number; // Pounds per student
  totalDiverted: number; // Total lbs diverted
};

// ------------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------------
export default function LeaderboardScreen() {
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic Header
  useEffect(() => {
    nav.setOptions?.({
      header: () => <AppHeader title="Leaderboard" subtitle="Top Performing Schools" />,
    });
  }, [nav]);

  // Load Data
  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // 1. Fetch raw data (Uppercase Columns)
      const { data, error } = await supabase
        .from("waste_diversion_records")
        .select("SCHOOL, DISTRICT, ENROLLMENT, RECYCLE, COMPOST, MONTH, YEAR");

      if (error) throw error;

      // 2. Aggregate by School
      // We want to calculate "Pounds Per Student" across the entire dataset (or current year)
      // Map: SchoolName -> { totalDiverted, maxEnrollment, district }
      const schoolStats = new Map<string, { diverted: number; enrollment: number; district: string }>();

      (data || []).forEach((row: any) => {
        const school = row.SCHOOL;
        if (!school) return;

        const diverted = (row.RECYCLE || 0) + (row.COMPOST || 0);
        const enrollment = row.ENROLLMENT || 0;

        if (!schoolStats.has(school)) {
          schoolStats.set(school, { diverted: 0, enrollment: 0, district: row.DISTRICT });
        }

        const stat = schoolStats.get(school)!;
        stat.diverted += diverted;
        // Take the max enrollment seen (safest bet for correct normalization)
        stat.enrollment = Math.max(stat.enrollment, enrollment);
      });

      // 3. Calculate Score & Sort
      const ranked: LeaderboardEntry[] = [];
      schoolStats.forEach((val, key) => {
        // Avoid division by zero
        const score = val.enrollment > 0 ? (val.diverted / val.enrollment) : 0;
        ranked.push({
          rank: 0, // assigned later
          school: key,
          district: val.district,
          score: score,
          totalDiverted: val.diverted
        });
      });

      // Sort Descending by Score
      ranked.sort((a, b) => b.score - a.score);

      // Assign Ranks
      ranked.forEach((item, idx) => { item.rank = idx + 1; });

      setEntries(ranked);
    } catch (e) {
      console.error("Leaderboard load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  // ------------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------------
  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;

    return (
      <View style={[styles.card, isTop3 && styles.cardTop3]}>
        <View style={styles.rankCol}>
          {item.rank === 1 ? <Ionicons name="trophy" size={24} color="#FFD700" /> :
            item.rank === 2 ? <Ionicons name="trophy" size={24} color="#C0C0C0" /> :
              item.rank === 3 ? <Ionicons name="trophy" size={24} color="#CD7F32" /> :
                <Text style={styles.rankText}>#{item.rank}</Text>}
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.schoolName}>{item.school}</Text>
          <Text style={styles.districtName}>{item.district}</Text>
        </View>

        <View style={styles.scoreCol}>
          <Text style={styles.scoreVal}>{item.score.toFixed(1)}</Text>
          <Text style={styles.scoreLabel}>lbs/student</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.school}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
              <Text style={styles.headerDesc}>
                Ranked by total diverted waste per student per year.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No data available yet.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0B2A4A", marginBottom: 4 },
  headerDesc: { fontSize: 14, color: "#616161" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Shadow
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop3: {
    borderWidth: 1,
    borderColor: "#FFD700", // Gold border for top 3
    backgroundColor: "#fffbef",
  },

  rankCol: { width: 40, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 18, fontWeight: "700", color: "#9e9e9e" },

  infoCol: { flex: 1, paddingHorizontal: 12 },
  schoolName: { fontSize: 16, fontWeight: "700", color: "#0B2A4A", marginBottom: 2 },
  districtName: { fontSize: 12, color: "#757575" },

  scoreCol: { alignItems: "flex-end", minWidth: 80 },
  scoreVal: { fontSize: 20, fontWeight: "800", color: "#2e7d32" },
  scoreLabel: { fontSize: 10, color: "#9e9e9e" },

  emptyText: { textAlign: "center", marginTop: 40, color: "#9e9e9e" },
});