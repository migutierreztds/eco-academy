// app/(auth)/verify-email.tsx
import { View, Text, StyleSheet } from "react-native";

export default function VerifyEmail() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Check your email</Text>
      <Text style={styles.p}>
        We sent you a verification link. Open it to finish creating your account.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  p: { fontSize: 16, color: "#444", textAlign: "center" },
});