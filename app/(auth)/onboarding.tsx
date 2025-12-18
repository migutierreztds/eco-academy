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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------
type Role = "school_admin" | "educator" | "student" | "parent" | "community" | "custodial";

const ROLES: { key: Role; label: string; icon: string; requiresSchool: boolean }[] = [
  { key: "school_admin", label: "School Admin", icon: "🏫", requiresSchool: true },
  { key: "educator", label: "Educator", icon: "👩‍🏫", requiresSchool: true },
  { key: "student", label: "Student", icon: "🎓", requiresSchool: true },
  { key: "custodial", label: "Custodial Team", icon: "🧹", requiresSchool: true }, // usually assigned to a location
  { key: "parent", label: "Parent/Guardian", icon: "👪", requiresSchool: false }, // optional school? keeping simplier for now
  { key: "community", label: "Community Resident", icon: "🏡", requiresSchool: false },
];

type DistrictRow = { id: string; name: string };
type SchoolRow = { id: string; district_id: string; name: string; number?: string | null };

export default function Onboarding() {
  const router = useRouter();

  // ----------------------------------------------------------------
  // STEPS: 1=Identity, 2=Role, 3=School(conditional), 4=GreenLeaders
  // ----------------------------------------------------------------
  const [step, setStep] = useState(1);

  // DATA STATE
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState(""); // @...

  const [role, setRole] = useState<Role | null>(null);

  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  const [joinGreenLeaders, setJoinGreenLeaders] = useState(false);

  // UI STATE
  const [saving, setSaving] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Pickers
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [districtModal, setDistrictModal] = useState(false);
  const [schoolModal, setSchoolModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  // ----------------------------------------------------------------
  // COMPUTED
  // ----------------------------------------------------------------
  const roleConfig = ROLES.find((r) => r.key === role);
  const schoolRequired = roleConfig?.requiresSchool ?? false;

  const canAdvanceStep1 = firstName.trim().length > 0 && lastName.trim().length > 0 && handle.trim().length > 0;
  const canAdvanceStep2 = !!role;
  const canAdvanceStep3 = !schoolRequired || (!!districtId && !!schoolId);

  // ----------------------------------------------------------------
  // EFFECTS
  // ----------------------------------------------------------------

  // Load Districts on Step 3 entry (lazy load)
  useEffect(() => {
    if (step === 3 && districts.length === 0) {
      loadDistricts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Load Schools when district changes
  useEffect(() => {
    if (!districtId) {
      setSchools([]);
      setSchoolId(null);
      setSchoolName(null);
      return;
    }
    loadSchools(districtId);
  }, [districtId]);

  // Load Districts (from View)
  async function loadDistricts() {
    try {
      setLoadingDistricts(true);
      const { data, error } = await supabase
        .from("view_districts_dropdown")
        .select("name") // View only returns 'name'
        .order("name", { ascending: true });

      if (error) throw error;

      // Map view output to expected {id, name} shape for the list
      // Since we don't need IDs anymore (we store text), we use name as ID
      const rows = (data || []).map((r: any) => ({
        id: r.name,
        name: r.name
      }));
      setDistricts(rows);
    } catch (e) {
      console.log("Error loading districts", e);
    } finally {
      setLoadingDistricts(false);
    }
  }

  // Load Schools (from View)
  async function loadSchools(distName: string) {
    try {
      const { data, error } = await supabase
        .from("view_schools_dropdown")
        .select("name")
        .eq("district", distName) // Use district name for filtering
        .order("name", { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((r: any) => ({
        id: r.name, // using Name as ID
        district_id: distName,
        name: r.name,
      }));
      setSchools(rows);
    } catch (e) {
      console.log("Error loading schools", e);
    }
  }

  // ----------------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------------

  const onNext = () => {
    if (step === 1 && canAdvanceStep1) setStep(2);
    else if (step === 2 && canAdvanceStep2) {
      // If role doesn't need school info, skip step 3 ? 
      // Actually, let's keep it optional but usually better to skip to minimize friction if not needed.
      // Current Logic: If NOT required, we skip to Step 4 (Green Leaders).
      if (!schoolRequired) {
        setStep(4);
      } else {
        setStep(3);
      }
    } else if (step === 3 && canAdvanceStep3) setStep(4);
  };

  const onBack = () => {
    if (step > 1) {
      if (step === 4 && !schoolRequired) setStep(2); // Jump back logic
      else setStep(step - 1);
    }
  };

  const onFinish = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Format handle (ensure @ prefix)
      const formattedHandle = handle.startsWith("@") ? handle : `@${handle}`;

      const payload = {
        id: user.id,
        // New Profile Columns
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        handle: formattedHandle,
        role: role,

        // Location (Now using text names as primary keys)
        // We no longer use UUIDs for districts/schools since they come from the CSV
        district: districtName,
        school: schoolName,

        // Legacy fallback (can be NULL or removed later)
        district_id: null,
        school_id: null,

        // Feature Flags
        green_leaders: joinGreenLeaders,
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Error saving profile", e?.message);
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------------
  // FILTERING
  // ----------------------------------------------------------------
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


  // ----------------------------------------------------------------
  // RENDER STEPS
  // ----------------------------------------------------------------

  // STEP 1: IDENTITY
  const renderIdentity = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let’s get to know you</Text>
      <Text style={styles.stepSubtitle}>How should we address you?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Jane"
          value={firstName}
          onChangeText={setFirstName}
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Doe"
          value={lastName}
          onChangeText={setLastName}
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Choose a Handle</Text>
        <TextInput
          style={styles.input}
          placeholder="@EcoWarrior"
          value={handle}
          autoCapitalize="none"
          onChangeText={setHandle}
          returnKeyType="done"
        />
        <Text style={styles.hint}>This will be visible on leaderboards.</Text>
      </View>
    </View>
  );

  // STEP 2: ROLE
  const renderRole = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What describes you best?</Text>
      <Text style={styles.stepSubtitle}>Select your primary role.</Text>

      <View style={styles.grid}>
        {ROLES.map((r) => {
          const isSelected = role === r.key;
          return (
            <Pressable
              key={r.key}
              style={[styles.roleCard, isSelected && styles.roleCardActive]}
              onPress={() => setRole(r.key)}
            >
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={[styles.roleLabel, isSelected && styles.roleLabelActive]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // STEP 3: SCHOOL / DISTRICT
  const renderSchool = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Find your School</Text>
      <Text style={styles.stepSubtitle}>Connect to contribute to your school's score.</Text>

      {/* District Picker */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>School District</Text>
        <Pressable
          style={styles.select}
          onPress={() => setDistrictModal(true)}
        >
          <Text style={[styles.selectText, !districtId && styles.placeholderText]}>
            {districtName ?? "Select District..."}
          </Text>
        </Pressable>
      </View>

      {/* School Picker */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>School Name</Text>
        <Pressable
          style={[styles.select, !districtId && styles.disabledSelect]}
          disabled={!districtId}
          onPress={() => setSchoolModal(true)}
        >
          <Text style={[styles.selectText, !schoolName && styles.placeholderText]}>
            {schoolName ?? "Select School..."}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // STEP 4: GREEN LEADERS
  const renderGreenLeaders = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Step!</Text>
      <Text style={styles.stepSubtitle}>Join the movement.</Text>

      <View style={styles.promoCard}>
        <Text style={styles.promoEmoji}>🌱🏆</Text>
        <Text style={styles.promoTitle}>Green Leaders Network</Text>
        <Text style={styles.promoText}>
          Competitions, badges, and real-time impact tracking.
          Join thousands of others making a difference.
        </Text>

        <Pressable
          style={[styles.glButton, joinGreenLeaders && styles.glButtonActive]}
          onPress={() => setJoinGreenLeaders(!joinGreenLeaders)}
        >
          <Text style={[styles.glBtnText, joinGreenLeaders && styles.glBtnTextActive]}>
            {joinGreenLeaders ? "✅  I'm In!" : "Click to Join"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader title="Setup Profile" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map(s => (
              <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
            ))}
          </View>

          {step === 1 && renderIdentity()}
          {step === 2 && renderRole()}
          {step === 3 && renderSchool()}
          {step === 4 && renderGreenLeaders()}

          <View style={styles.footer}>
            {step > 1 && (
              <Pressable onPress={onBack} style={styles.backButton}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            )}

            {step < 4 ? (
              <Pressable
                style={[styles.nextButton,
                ((step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2) || (step === 3 && !canAdvanceStep3))
                && styles.btnDisabled]}
                onPress={onNext}
                disabled={(step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2) || (step === 3 && !canAdvanceStep3)}
              >
                <Text style={styles.nextText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.finishButton}
                onPress={onFinish}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.finishText}>Finish Setup</Text>}
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALS */}
      {/* Repeats the modal logic from before but cleaner usage */}
      <Modal visible={districtModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search..."
              value={districtSearch}
              onChangeText={setDistrictSearch}
            />
            <FlatList
              data={loadingDistricts ? [] : filteredDistricts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.listItem} onPress={() => {
                  setDistrictId(item.id);
                  setDistrictName(item.name);
                  setDistrictModal(false);
                  // Reset school
                  setSchoolId(null);
                  setSchoolName(null);
                }}>
                  <Text style={styles.listText}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={loadingDistricts ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}
            />
            <Pressable style={styles.closeModal} onPress={() => setDistrictModal(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={schoolModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select School</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search..."
              value={schoolSearch}
              onChangeText={setSchoolSearch}
            />
            <FlatList
              data={filteredSchools}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.listItem} onPress={() => {
                  setSchoolId(item.id);
                  setSchoolName(item.name);
                  setSchoolModal(false);
                }}>
                  <Text style={styles.listText}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.closeModal} onPress={() => setSchoolModal(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const COLORS = {
  primary: "#0B66FF",
  dark: "#0B2A4A",
  success: "#2E7D32",
  bg: "#F9FAFB",
  white: "#FFFFFF",
  border: "#E5E7EB",
  muted: "#6B7280",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, padding: 24 },

  progressRow: { flexDirection: "row", gap: 8, marginBottom: 32, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },

  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: "800", color: COLORS.dark, marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: COLORS.muted, marginBottom: 24 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: COLORS.dark, marginBottom: 6 },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.dark
  },

  select: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center"
  },
  selectText: { fontSize: 16, color: COLORS.dark },
  placeholderText: { color: COLORS.muted },
  disabledSelect: { backgroundColor: "#F3F4F6", opacity: 0.7 },

  // Roles
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  roleCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: "#EFF6FF" },
  roleIcon: { fontSize: 32, marginBottom: 8 },
  roleLabel: { fontSize: 14, fontWeight: "600", color: COLORS.dark, textAlign: "center" },
  roleLabelActive: { color: COLORS.primary },

  // Footer Buttons
  footer: { flexDirection: "row", marginTop: 24, alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 12 },
  backText: { fontSize: 16, color: COLORS.muted, fontWeight: "600" },

  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginLeft: "auto"
  },
  finishButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginLeft: "auto"
  },
  btnDisabled: { opacity: 0.5 },
  nextText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  finishText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Promo Card (Green Leaders)
  promoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promoEmoji: { fontSize: 48, marginBottom: 16 },
  promoTitle: { fontSize: 20, fontWeight: "800", color: COLORS.dark, marginBottom: 8 },
  promoText: { textAlign: "center", color: COLORS.muted, lineHeight: 22, marginBottom: 24 },
  glButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.success,
    alignItems: "center",
  },
  glButtonActive: { backgroundColor: COLORS.success },
  glBtnText: { color: COLORS.success, fontSize: 16, fontWeight: "700" },
  glBtnTextActive: { color: "#FFF" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { height: "80%", backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  modalSearch: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 12, marginBottom: 12 },
  listItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  listText: { fontSize: 16, color: COLORS.dark },
  closeModal: { marginTop: 16, alignSelf: "center", padding: 12 },
  closeText: { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
});