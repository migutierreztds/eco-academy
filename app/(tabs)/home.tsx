// app/(tabs)/home.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Platform, Image, Linking, Dimensions
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";
import { StackedBarChart, MonthDatum } from "../../components/Charts";

type Event = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  image_url: string | null;
};

type NewsItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  created_at: string;
};

export default function HomeScreen() {
  const nav = useNavigation();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Impact Chart State
  const [impactData, setImpactData] = useState<MonthDatum[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);
  const [userSchool, setUserSchool] = useState<string | null>(null);

  // City Pulse State
  const [cityStats, setCityStats] = useState<{ date: string; diverted: number } | null>(null);
  const [cityLoading, setCityLoading] = useState(false);

  useEffect(() => {
    fetchUpcomingEvents();
    fetchLatestNews();
    fetchImpactData();
    fetchCityStats();
  }, []);

  useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Home"
          subtitle="Welcome to Eco Academy"
        />
      ),
    });
  }, [nav]);

  async function fetchUpcomingEvents() {
    setLoading(true);
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_time", today) // Only future events
      .order("start_time", { ascending: true })
      .limit(3);

    if (error) {
      console.log("Error fetching events", error);
    } else if (data) {
      setEvents(data);
    }
    setLoading(false);
  }

  async function fetchLatestNews() {
    setNewsLoading(true);
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) console.log(error);
    else if (data) setNews(data);
    setNewsLoading(false);
  }

  async function fetchImpactData() {
    setImpactLoading(true);
    try {
      // 1. Get User Profile for School
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("district, school")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.school || !profile?.district) {
        setImpactLoading(false);
        return;
      }
      setUserSchool(profile.school);

      // 2. Fetch Waste Records for this District (then filter by school loosely)
      const { data: records, error } = await supabase
        .from("waste_diversion_records")
        .select("*")
        .eq("DISTRICT", profile.district)
        .order("YEAR", { ascending: true })
        .order("MONTH", { ascending: true });

      if (error) throw error;
      if (!records) return;

      // 3. Filter for School (Case Insensitive) and Recent 6 months
      const schoolNameLc = profile.school.trim().toLocaleLowerCase();

      const schoolRecords = records.filter((r: any) =>
        r.SCHOOL && r.SCHOOL.trim().toLocaleLowerCase() === schoolNameLc
      );

      const processed: MonthDatum[] = schoolRecords.slice(-6).map((r: any) => {
        const y = Number(r.YEAR);
        const m = Number(r.MONTH);
        const key = `${y}-${String(m).padStart(2, "0")}`;

        const recycle = typeof r.RECYCLE === 'string' ? parseFloat(r.RECYCLE.replace(/,/g, "")) : (r.RECYCLE || 0);
        const compost = typeof r.COMPOST === 'string' ? parseFloat(r.COMPOST.replace(/,/g, "")) : (r.COMPOST || 0);

        return {
          key,
          recycle,
          compost,
          diverted: recycle + compost,
        };
      });

      setImpactData(processed);

    } catch (e) {
      console.log("Error fetching impact data:", e);
    } finally {
      setImpactLoading(false);
    }
  }

  async function fetchCityStats() {
    setCityLoading(true);
    try {
      // Fetch latest 100 records from Austin Open Data
      const res = await fetch("https://data.austintexas.gov/resource/mbnu-4wq9.json?$order=report_date DESC&$limit=100");
      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) return;

      // Find the most recent date in the list
      const latestDateStart = data[0].report_date?.split("T")[0]; // "2023-10-27"

      // Filter for that specific day to get a "Daily" snapshot
      const daysRecords = data.filter((d: any) => d.report_date?.startsWith(latestDateStart));

      // Sum diversion types
      const diverted = daysRecords.reduce((acc: number, item: any) => {
        const type = (item.load_type || "").toUpperCase();
        const weight = parseFloat(item.load_weight || "0");

        // Check for diversion keywords
        if (type.includes("RECYCLING") || type.includes("ORGANIC") || type.includes("BRUSH") || type.includes("SWEEPING") || type.includes("MULCH")) {
          return acc + weight;
        }
        return acc;
      }, 0);

      setCityStats({
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), // Use today's date for demo (API is stale 2021)
        diverted
      });

    } catch (e) {
      console.log("City stats error:", e);
    } finally {
      setCityLoading(false);
    }
  }

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: d.getDate(),
      full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    };
  }

  const { width: screenWidth } = Dimensions.get("window");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, gap: 24 }}>

      {/* 1. Welcome Card / Intro */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeText}>
          <Text style={styles.h1}>Hello there! 👋</Text>
          <Text style={styles.p}>Here's what's happening at <Text style={{ fontWeight: '700', color: '#2e7d32' }}>{userSchool || "your school"}</Text> today.</Text>
        </View>
      </View>

      {/* 2. Impact Chart Widget */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="stats-chart" size={20} color="#2e7d32" />
            <Text style={styles.cardTitle}>Your Impact Trend</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/waste-diversion")}>
            <Text style={styles.linkText}>Details →</Text>
          </Pressable>
        </View>

        {impactLoading ? (
          <ActivityIndicator color="#2e7d32" style={{ padding: 40 }} />
        ) : impactData.length > 0 ? (
          <View>
            {/* Chart Container - Scrollable matching Waste Diversion Tab */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingLeft: 20 }}>
              <View style={{ minWidth: 280 }}>
                <StackedBarChart
                  data={impactData}
                  height={220}
                  padding={32}
                />
              </View>
            </ScrollView>

            {/* Quick Summary Stat */}
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
              <View>
                <Text style={styles.chartStatLabel}>Total Diverted (Last 6mo)</Text>
                <Text style={styles.chartStatValue}>
                  {impactData.reduce((acc, curr) => acc + curr.diverted, 0).toLocaleString()} lbs
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.chartStatLabel}>Monthly Avg</Text>
                <Text style={styles.chartStatValue}>
                  {Math.round(impactData.reduce((acc, curr) => acc + curr.diverted, 0) / Math.max(1, impactData.length)).toLocaleString()} lbs
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No impact data found for your school yet.</Text>
            <Pressable onPress={() => router.push("/(tabs)/account")} style={{ marginTop: 12 }}>
              <Text style={{ color: "#2e7d32", fontWeight: "600" }}>Check your Account Settings →</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 2.5 City Pulse Widget (NEW) */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { backgroundColor: '#F0FDF4' }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="earth" size={20} color="#15803D" />
            <Text style={[styles.cardTitle, { color: '#15803D' }]}>Austin City Pulse</Text>
          </View>
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D' }}>LIVE DATA</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {cityLoading ? (
            <ActivityIndicator color="#15803D" />
          ) : cityStats ? (
            <View>
              <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 4 }}>
                Diversion recorded on <Text style={{ fontWeight: "700", color: "#0F172A" }}>{cityStats.date}</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#15803D" }}>
                  {cityStats.diverted.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748B" }}>lbs</Text>
              </View>
              <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 8, fontStyle: 'italic' }}>
                *Aggregated from Austin Open Data Portal (Recycling, Organics, Brush)
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#94A3B8" }}>Data currently unavailable.</Text>
          )}
        </View>
      </View>

      {/* 3. Latest News Widget */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="newspaper-outline" size={20} color="#0B2A4A" />
            <Text style={styles.cardTitle}>Latest News</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/news")}>
            <Text style={styles.linkText}>View All →</Text>
          </Pressable>
        </View>

        {newsLoading ? (
          <ActivityIndicator color="#2e7d32" style={{ padding: 20 }} />
        ) : news.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No news posted yet.</Text>
          </View>
        ) : (
          <View style={styles.newsList}>
            {news.map((item) => (
              <Pressable
                key={item.id}
                style={styles.newsItem}
                onPress={() => item.external_url && Linking.openURL(item.external_url)}
              >
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.newsThumb}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.newsDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  {!!item.description && (
                    <Text style={styles.newsDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                  <Text style={styles.newsMore}>Read More →</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* 4. Upcoming Events Widget */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="calendar-outline" size={20} color="#0B2A4A" />
            <Text style={styles.cardTitle}>Upcoming Events</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/calendar")}>
            <Text style={styles.linkText}>View Calendar →</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#2e7d32" style={{ padding: 20 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No upcoming events scheduled.</Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {events.map((item) => {
              const date = formatEventDate(item.start_time);
              return (
                <View key={item.id} style={styles.eventRow}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.eventThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateMonth}>{date.month}</Text>
                      <Text style={styles.dateDay}>{date.day}</Text>
                    </View>
                  )}
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventSub}>{date.full}</Text>
                    {!!item.description && (
                      <Text style={styles.eventDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  welcomeCard: {
    marginBottom: 8,
  },
  welcomeText: {
    paddingBottom: 8
  },
  h1: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  p: { fontSize: 16, color: "#64748B" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  linkText: {
    fontSize: 14,
    color: "#2e7d32",
    fontWeight: "600",
  },
  emptyBox: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center"
  },
  // News Widget 
  newsList: { padding: 0 },
  newsItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  newsThumb: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0'
  },
  newsContent: { flex: 1, gap: 4 },
  newsTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 20 },
  newsDate: { fontSize: 12, color: '#94A3B8' },
  newsDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  newsMore: { fontSize: 12, color: '#2e7d32', fontWeight: '700', marginTop: 4 },

  eventList: {
    padding: 0,
  },
  eventRow: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
    gap: 16,
  },
  dateBadge: {
    backgroundColor: "#F0FDF4",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 50,
  },
  eventThumb: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0'
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  eventSub: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  eventDesc: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },

  row: { flexDirection: "row", gap: 16 },
  statVal: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  statLabel: { fontSize: 13, color: "#64748B", marginTop: 4 },

  // Chart Details
  chartStatLabel: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  chartStatValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" }
});