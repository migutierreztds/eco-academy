// app/(auth)/signup.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "~/lib/supabase";

const logo = require("../../assets/icon.png");

export default function SignUp() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure1, setSecure1] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!email.trim()) e.push("Email is required.");
    if (password.length < 6) e.push("Password must be at least 6 characters.");
    if (password !== confirm) e.push("Passwords don’t match.");
    if (!agree) e.push("You must agree to the Terms.");
    return e;
  }, [email, password, confirm, agree]);

  const canSubmit = errors.length === 0 && !loading;

  const onSignUp = async () => {
    if (!canSubmit) {
      Alert.alert("Fix and try again", errors.join("\n"));
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // We defer profile creation (name, etc.) to the onboarding flow
      });
      if (error) throw error;

      if (data?.session) {
        // Session created immediately (auto-confirm enabled or dev mode)
        // Go straight to onboarding wizard
        router.replace("/(auth)/onboarding");
      } else {
        // Confirmation email sent
        router.replace("/(auth)/verify-email");
      }
    } catch (err: any) {
      Alert.alert("Sign up failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        {/* Logo */}
        <Image source={logo} style={styles.logo} accessibilityLabel="Eco Academy logo" />

        {/* Title */}
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subHeading}>Step 1 of 2: Secure your login</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@school.edu"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="At least 6 characters"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              secureTextEntry={secure1}
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
            />
            <Pressable
              onPress={() => setSecure1((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={secure1 ? "Show password" : "Hide password"}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeTxt}>{secure1 ? "👁️" : "🙈"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Re-enter your password"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              secureTextEntry={secure2}
              textContentType="password"
              value={confirm}
              onChangeText={setConfirm}
              returnKeyType="done"
              onSubmitEditing={onSignUp}
            />
            <Pressable
              onPress={() => setSecure2((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={secure2 ? "Show password" : "Hide password"}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeTxt}>{secure2 ? "👁️" : "🙈"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Terms */}
        <View style={[styles.field, styles.rowBetween]}>
          <Text style={styles.label}>I agree to the Terms</Text>
          <Switch value={agree} onValueChange={setAgree} />
        </View>
        <Text style={[styles.muted, { marginTop: -6 }]}>
          By creating an account, you agree to our{" "}
          <Text style={styles.link}>Terms</Text> and <Text style={styles.link}>Privacy Policy</Text>.
        </Text>

        {/* Submit */}
        <Pressable
          onPress={onSignUp}
          disabled={!canSubmit}
          style={[styles.primaryBtn, (!canSubmit || loading) && styles.btnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnTxt}>Continue →</Text>
          )}
        </Pressable>

        {/* Already have an account? */}
        <View style={styles.signupRow}>
          <Text style={styles.muted}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.signupLink}>
            Log in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const COLORS = {
  text: "#0B2A4A",
  label: "#0B2A4A",
  border: "#E5E7EB",
  inputBg: "#FFFFFF",
  primary: "#F5B016",
  primaryTxt: "#112031",
  brandGreen: "#18A35B",
  link: "#0B5CCC",
  muted: "#6B7280",
  card: "#FFFFFF",
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 250,
    height: 132,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 6,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: "700", color: COLORS.label },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  eyeBtn: {
    height: 48,
    width: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  eyeTxt: { fontSize: 18 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnTxt: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  muted: { color: COLORS.muted, fontSize: 14 },
  signupLink: { color: COLORS.link, fontSize: 16, fontWeight: "700" },
  link: { color: COLORS.link, fontSize: 14, fontWeight: "700" },
});