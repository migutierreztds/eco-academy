// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: "#FFFFFF" } }}>
        {/* Hide the parent header for the tab group so "(tabs)" never shows */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* If you have an auth group, keep it hidden too */}
        {/* <Stack.Screen name="(auth)" options={{ headerShown: false }} /> */}
      </Stack>
    </>
  );
}