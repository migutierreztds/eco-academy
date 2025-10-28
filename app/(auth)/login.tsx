// app/(auth)/login.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter, useRootNavigationState } from "expo-router";
import { supabase } from "~/lib/supabase";

// ✅ Static import so Metro validates the path at build time
const logo = require("../../assets/icon.png");

export default function Login() {
  const router = useRouter();
  const navState = useRootNavigationState(); // ← wait for root to mount before navigating

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password]
  );

  const goToWasteDiversion = () => {
    // On native, navigating before the Root Layout mounts throws.
    if (!navState?.key) return;
    // Use segment path so web shows /waste-diversion but native resolves correctly.
    router.replace("(tabs)/home");
  };

  // Auto-redirect if already logged in
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.log("getSession error:", error);
      if (data?.session) {
        console.log("🟢 Existing session detected, redirecting…");
        goToWasteDiversion();
      } else {
        console.log("ℹ️ No session on mount.");
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      console.log("👂 onAuthStateChange:", _e, !!session);
      if (session) goToWasteDiversion();
    });

    return () => {
      listener.subscription?.unsubscribe?.();
    };
  }, [navState?.key]); // re-run once the root is ready

  // 🔐 Sign In
  const signIn = async () => {
    const canSubmitNow = email.trim().length > 0 && password.length > 0;
    if (!canSubmitNow || loading) {
      if (!canSubmitNow) Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const trimmedEmail = email.trim();
      console.log("➡️ Attempting sign-in with:", trimmedEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      console.log("⬅️ signIn result:", {
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error?.message ?? null,
      });

      if (error) {
        Alert.alert("Login failed", error.message);
        return;
      }
      if (!data?.session) {
        Alert.alert(
          "Login incomplete",
          "We couldn’t establish a session. Please confirm your email, or check your Supabase URL/Anon key."
        );
        return;
      }

      // ✅ We have a session — go!
      goToWasteDiversion(); // safe: will no-op until navState is ready
    } catch (err: any) {
      console.error("Sign-in error:", err);
      Alert.alert("Login error", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Sign Up (optional)
  const signUp = async () => {
    const canSubmitNow = email.trim().length > 0 && password.length > 0;
    if (!canSubmitNow || loading) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      Alert.alert("Check your email", "Confirm your account to finish signing up.");
    } catch (err: any) {
      console.error("Sign-up error:", err);
      Alert.alert("Sign up failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helpers to capture browser autofill on RN Web
  const onEmailChange = (e: any) => {
    const val = e?.nativeEvent?.text ?? e?.target?.value ?? "";
    setEmail(val);
  };
  const onPasswordChange = (e: any) => {
    const val = e?.nativeEvent?.text ?? e?.target?.value ?? "";
    setPassword(val);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        {/* Logo */}
        <Image
          source={logo}
          style={styles.logo}
          accessibilityLabel="Eco Academy logo"
          onLoad={() => console.log("✅ Logo loaded")}
          onError={(e) => console.log("❌ Logo failed:", e.nativeEvent?.error)}
        />

        {/* Title */}
        <Text style={styles.heading}>Sign in</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            nativeID="email"
            value={email}
            onChangeText={setEmail}
            onChange={onEmailChange}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Link href="/(auth)/forgot" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </View>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Enter your password"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              secureTextEntry={secure}
              textContentType="password"
              autoComplete="current-password"
              nativeID="password"
              value={password}
              onChangeText={setPassword}
              onChange={onPasswordChange}
              returnKeyType="done"
              onSubmitEditing={signIn}
            />
            <Pressable
              onPress={() => setSecure((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={secure ? "Show password" : "Hide password"}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeTxt}>{secure ? "👁️" : "🙈"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Sign In */}
        <Pressable
          onPress={signIn}
          // On web, keep enabled for autofill; on native, respect canSubmit
          disabled={Platform.OS !== "web" ? (!canSubmit || loading) : loading}
          accessibilityRole="button"
          testID="sign-in-btn"
          style={[
            styles.primaryBtn,
            (Platform.OS !== "web" ? (!canSubmit || loading) : loading) && styles.btnDisabled,
          ]}
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnTxt}>Sign in</Text>}
        </Pressable>

        {/* Sign Up */}
        <View style={styles.signupRow}>
          <Text style={styles.muted}>Don’t have an account? </Text>
          <Pressable onPress={signUp}>
            <Text style={styles.signupLink}>Sign up</Text>
          </Pressable>
        </View>

        {/* Dev skip link */}
        <Link href="(tabs)/waste-diversion" style={styles.skip}>
          Skip for now →
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* 🎨 Styles */
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
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  field: { gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { fontSize: 15, fontWeight: "700", color: COLORS.label },
  forgotLink: { fontSize: 14, color: COLORS.link, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  passwordRow: { flexDirection: "row", alignItems: "center" },
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
    marginTop: 4,
  },
  muted: { color: COLORS.muted, fontSize: 14 },
  signupLink: { color: COLORS.link, fontSize: 16, fontWeight: "700" },
  skip: {
    marginTop: 12,
    alignSelf: "center",
    color: COLORS.muted,
    textDecorationLine: "underline",
  },
});