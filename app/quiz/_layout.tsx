// app/quiz/_layout.tsx
import { Stack } from "expo-router";

export default function QuizLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,   // hide native header (removes the "(tabs)" back button)
        presentation: "card",
      }}
    />
  );
}