// app/index.tsx
import React from "react";
import { Redirect } from "expo-router";

export default function Index() {
  // ✅ IMPORTANT: Redirect to Landing Page by default
  // The Auth flow (Login/Signup) will redirect to (tabs)/home upon success.
  return <Redirect href="/welcome" />;
}