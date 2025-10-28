// app/(tabs)/account.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
type Profile = {
  id: string;
  role: string | null;
  district: string | null;
  school: string | null;
  green_leaders: boolean | null;
  created_at?: string | null;
};

type DistrictRow = { id: string; name: string };
type SchoolRow = { id: string; district_id: string; name: string; number?: string | null };

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function roleLabel(role?: string | null) {
  switch (role) {
    case "school_admin":
      return "School Admin";
    case "educator":
      return "Educator";
    case "community":
      return "Community";
    case "facilities":
      return "Facilities";
    case "eco_staff":
      return "Eco Staff";
    default:
      return role ?? "—";
  }
}

function badgeColor(role?: string | null) {
  switch (role) {
    case "school_admin":
      return "#0B66FF";
    case "educator":
      return "#2e7d32";
    case "community":
      return "#7c3aed";
    case "facilities":
      return "#0ea5e9";
    case "eco_staff":
      return "#d97706";
    default:
      return "#6B7280";
  }
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

// Storage helpers
const AVATAR_BUCKET = "avatars";
const avatarPath = (uid: string) => `${uid}.jpg`;

async function getSignedAvatarUrl(uid: string) {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(avatarPath(uid), 60 * 60); // 1 hr
  if (error) return null;
  return data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null;
}

// ────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────
export default function Account() {
  const nav = useNavigation();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [editName, setEditName] = useState<string>("");
  const [editDistrictId, setEditDistrictId] = useState<string | null>(null);
  const [editDistrictName, setEditDistrictName] = useState<string | null>(null);
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [editSchoolName, setEditSchoolName] = useState<string | null>(null);
  const [editGreen, setEditGreen] = useState<boolean>(false);

  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);

  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Header
  useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Account"
          subtitle={email ?? undefined}
          rightSlot={
            <Pressable
              onPress={handleSave}
              disabled={saving || !userId}
              style={[
                styles.savePill,
                (saving || !userId) && { opacity: 0.5 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.savePillTxt}>Save</Text>
              )}
            </Pressable>
          }
        />
      ),
    });
  }, [nav, email, saving, userId, editName, editDistrictId, editSchoolId, editGreen]);

  // Load user + profile
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes.user;
        if (!user) throw new Error("Not signed in.");

        setUserId(user.id);
        setEmail(user.email ?? null);
        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null;
        setName(metaName);

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, role, district, school, green_leaders, created_at")
          .eq("id", user.id)
          .maybeSingle();
        if (pErr) throw pErr;
        const prof = (p as Profile) ?? null;
        setProfile(prof);

        setEditName(metaName ?? "");
        setEditDistrictName(prof?.district ?? null);
        setEditSchoolName(prof?.school ?? null);
        setEditGreen(!!prof?.green_leaders);

        // districts
        const { data: d, error: dErr } = await supabase
          .from("districts")
          .select("id, name")
          .order("name", { ascending: true });
        if (dErr) throw dErr;
        setDistricts((d ?? []) as DistrictRow[]);

        // district id
        const foundDistrict = prof?.district
          ? (d ?? []).find(
              (row) =>
                row.name.toLowerCase() === prof.district!.toLowerCase()
            )
          : null;
        const newDistrictId = foundDistrict?.id ?? null;
        setEditDistrictId(newDistrictId);

        // load schools if needed
        if (newDistrictId) {
          const { data: s } = await supabase
            .from("schools")
            .select("id, district_id, name, number")
            .eq("district_id", newDistrictId)
            .order("name");
          setSchools((s ?? []) as SchoolRow[]);
        }

        // avatar signed URL
        const signed = await getSignedAvatarUrl(user.id);
        if (signed) setAvatarUrl(signed);
      } catch (e: any) {
        console.error(e);
        Alert.alert("Load error", e?.message ?? "Could not load account.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load schools when district changes
  useEffect(() => {
    (async () => {
      if (!editDistrictId) {
        setSchools([]);
        setEditSchoolId(null);
        setEditSchoolName(null);
        return;
      }
      const { data, error } = await supabase
        .from("schools")
        .select("id, district_id, name, number")
        .eq("district_id", editDistrictId)
        .order("name", { ascending: true });
      if (!error) setSchools((data ?? []) as SchoolRow[]);
    })();
  }, [editDistrictId]);

  // ────────────────────────────────────────────────
  // Avatar Picker / Upload
  // ────────────────────────────────────────────────
  async function pickAndUploadAvatar() {
    try {
      if (!userId) return;

      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert("Permission needed", "We need access to your photos to pick an avatar.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploading(true);
      const blob = await uriToBlob(result.assets[0].uri);

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath(userId), blob, {
          upsert: true,
          contentType: "image/jpeg",
        });
      if (upErr) throw upErr;

      const signed = await getSignedAvatarUrl(userId);
      if (signed) setAvatarUrl(signed);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Upload error", e?.message ?? "Could not upload avatar.");
    } finally {
      setUploading(false);
    }
  }

  // ────────────────────────────────────────────────
  // Save
  // ────────────────────────────────────────────────
  async function handleSave() {
    if (!userId) return;
    try {
      setSaving(true);
      const payload = {
        id: userId,
        district: editDistrictName,
        school: editSchoolName,
        green_leaders: !!editGreen,
      };
      const { error: pErr } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);
      if (pErr) throw pErr;

      if ((name ?? "") !== (editName ?? "")) {
        const { error: uErr } = await supabase.auth.updateUser({
          data: { full_name: editName || null, name: editName || null },
        });
        if (uErr) throw uErr;
        setName(editName || null);
      }

      Alert.alert("Saved", "Your profile was updated.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Save error", e?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const memberSince = useMemo(() => {
    const d = profile?.created_at ? new Date(profile.created_at) : null;
    return d ? d.toLocaleDateString() : "—";
  }, [profile?.created_at]);

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header / Avatar */}
      <View style={styles.cardRow}>
        <View style={{ alignItems: "center" }}>
          <Pressable onPress={pickAndUploadAvatar} disabled={uploading}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={{ color: "#64748B" }}>
                  {uploading ? "..." : "Pick\nAvatar"}
                </Text>
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            {uploading ? "Uploading…" : "Tap to change"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            style={styles.input}
            autoCapitalize="words"
          />
          <View style={{ height: 6 }} />
          <Text style={styles.label}>Role</Text>
          <View
            style={[styles.badge, { backgroundColor: badgeColor(profile?.role) }]}
          >
            <Text style={styles.badgeTxt}>{roleLabel(profile?.role)}</Text>
          </View>
        </View>
      </View>

      <Row label="Email">
        <View style={styles.valueBox}>
          <Text style={styles.value}>{email ?? "—"}</Text>
        </View>
      </Row>

      <Row label="District">
        <Pressable style={styles.select} onPress={() => setDistrictModal(true)}>
          <Text style={styles.selectTxt}>
            {editDistrictName ?? "Select district"}
          </Text>
        </Pressable>
      </Row>

      <Row label="School">
        <Pressable
          style={[styles.select, !editDistrictId && styles.disabled]}
          onPress={() => editDistrictId && setSchoolModal(true)}
        >
          <Text style={styles.selectTxt}>
            {editDistrictId
              ? editSchoolName ?? "Select school"
              : "Pick a district first"}
          </Text>
        </Pressable>
      </Row>

      <Row label="Green Leaders Network">
        <View style={styles.inline}>
          <Switch value={editGreen} onValueChange={setEditGreen} />
          <Text style={{ color: "#6B7280", marginLeft: 8 }}>
            Receive program updates & opportunities
          </Text>
        </View>
      </Row>

      <Row label="Member Since">
        <View style={styles.valueBox}>
          <Text style={styles.value}>{memberSince}</Text>
        </View>
      </Row>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ────────────────────────────────────────────────
// UI bits
// ────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const COLORS = {
  text: "#0B2A4A",
  border: "#E5E7EB",
  muted: "#6B7280",
  card: "#FFFFFF",
  brand: "#2e7d32",
  bg: "#FFFFFF",
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.bg,
    gap: 12,
    paddingBottom: 24,
  },
  cardRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarHint: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  label: { fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  valueBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.card,
  },
  value: { color: COLORS.text },
  inline: { flexDirection: "row", alignItems: "center" },
  select: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  selectTxt: { color: COLORS.text },
  disabled: { opacity: 0.5 },
  savePill: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "center",
  },
  savePillTxt: { color: "#fff", fontWeight: "800" },
  row: { gap: 6, marginTop: 8 },
  badge: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  badgeTxt: { color: "#fff", fontWeight: "700" },
});