// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth group (login, etc.) */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Tabs group */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Quiz segment (all routes under /quiz) */}
      <Stack.Screen
        name="quiz"
        options={{
          headerShown: false,      // <- hides the native header for /quiz/*
          presentation: "card",
        }}
      />
    </Stack>
  );
}