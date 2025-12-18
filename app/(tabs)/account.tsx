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
import { Ionicons } from "@expo/vector-icons";
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
  handle: string | null;
};

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
  const [editHandle, setEditHandle] = useState<string>("");
  const [editDistrict, setEditDistrict] = useState<string | null>(null);
  const [editSchool, setEditSchool] = useState<string | null>(null);
  const [editGreen, setEditGreen] = useState<boolean>(false);

  // Data Sources (Strings)
  const [allDistricts, setAllDistricts] = useState<string[]>([]);
  // Mapping of District -> Schools[]
  const [districtToSchools, setDistrictToSchools] = useState<Record<string, string[]>>({});

  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Computed schools based on selected district
  const availableSchools = useMemo(() => {
    if (!editDistrict) return [];
    return districtToSchools[editDistrict] || [];
  }, [editDistrict, districtToSchools]);

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
  }, [nav, email, saving, userId, editName, editDistrict, editSchool, editGreen]);

  // Load user + profile + Reference Data
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
          .select("id, role, district, school, green_leaders, created_at, handle")
          .eq("id", user.id)
          .maybeSingle();
        if (pErr) throw pErr;
        const prof = (p as Profile) ?? null;
        setProfile(prof);

        setEditName(metaName ?? "");
        setEditHandle(prof?.handle ?? "");
        setEditDistrict(prof?.district ?? null);
        setEditSchool(prof?.school ?? null);
        setEditGreen(!!prof?.green_leaders);

        // Fetch Reference Data from waste_diversion_records (Dynamic)
        // We select distinct districts and schools
        const { data: records, error: rErr } = await supabase
          .from("waste_diversion_records")
          .select("DISTRICT, SCHOOL");

        if (rErr) throw rErr;

        const dMap: Record<string, Set<string>> = {};
        records?.forEach((r: any) => {
          if (!r.DISTRICT) return;
          if (!dMap[r.DISTRICT]) dMap[r.DISTRICT] = new Set();
          if (r.SCHOOL) dMap[r.DISTRICT].add(r.SCHOOL);
        });

        const dists = Object.keys(dMap).sort();
        const finalMap: Record<string, string[]> = {};
        dists.forEach(d => {
          finalMap[d] = Array.from(dMap[d]).sort();
        });

        setAllDistricts(dists);
        setDistrictToSchools(finalMap);

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

      // Split name for profiles table
      const parts = (editName ?? "").trim().split(" ");
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ") ?? "";

      const payload = {
        id: userId,
        district: editDistrict,
        school: editSchool,
        green_leaders: !!editGreen,
        first_name: firstName || null,
        last_name: lastName || null,
        handle: editHandle || null
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
        // if (uErr) throw uErr; // Metadata update is secondary, don't block
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
    <View style={{ flex: 1 }}>
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
            <Text style={styles.label}>Handle</Text>
            <TextInput
              value={editHandle}
              onChangeText={setEditHandle}
              placeholder="@username"
              style={styles.input}
              autoCapitalize="none"
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
              {editDistrict ?? "Select district"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </Pressable>
        </Row>

        <Row label="School">
          <Pressable
            style={[styles.select, !editDistrict && styles.disabled]}
            onPress={() => editDistrict && setSchoolModal(true)}
          >
            <Text style={styles.selectTxt}>
              {editDistrict
                ? editSchool ?? "Select school"
                : "Pick a district first"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
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

        {/* Bottom Save Button */}
        <Pressable
          style={[styles.bigSaveBtn, (saving || !userId) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || !userId}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigSaveTxt}>Save Changes</Text>}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ────────────────── MODALS ────────────────── */}

      {/* District Modal - Centered Dialog */}
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
              data={allDistricts}
              keyExtractor={(d) => d}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, item === editDistrict && styles.modalOptionSelected]}
                  onPress={() => {
                    setEditDistrict(item);
                    setEditSchool(null); // Reset school
                    setDistrictModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, item === editDistrict && styles.modalOptionTextSelected]}>
                    {item}
                  </Text>
                  {item === editDistrict && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* School Modal - Centered Dialog */}
      <Modal visible={schoolModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSchoolModal(false)}>
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
              data={availableSchools.filter((s) => s.toLowerCase().includes(schoolSearch.toLowerCase()))}
              keyExtractor={(s) => s}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, item === editSchool && styles.modalOptionSelected]}
                  onPress={() => {
                    setEditSchool(item);
                    setSchoolModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, item === editSchool && styles.modalOptionTextSelected]}>
                    {item}
                  </Text>
                  {item === editSchool && <Ionicons name="checkmark" size={20} color="#2e7d32" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

    </View>
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center"
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
  bigSaveBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  bigSaveTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  // Modal Styles - Centered Dialog
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  keyboardView: { width: "100%" },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    paddingBottom: 24,
    maxHeight: "70%",
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }
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