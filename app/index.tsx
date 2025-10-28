// app/index.tsx
import React from "react";
import { Redirect } from "expo-router";

export default function Index() {
  // ✅ IMPORTANT: include the segment "(tabs)" in the href
  return <Redirect href="/(tabs)/waste-diversion" />;
}