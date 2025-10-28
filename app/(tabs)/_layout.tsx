// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const HEADER_BLUE = "#0B66FF";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Top header for each tab screen
        headerShown: true,
        headerStyle: { backgroundColor: HEADER_BLUE },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        headerTitleAlign: "center",
        headerShadowVisible: false,

        // Bottom tabs
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#9e9e9e",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          height: 60,
          paddingBottom: 6,
        },

        // Icons
        tabBarIcon: ({ focused, color, size }) => {
          let name: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case "home":
              name = focused ? "home" : "home-outline";
              break;
            case "waste-diversion":
              name = focused ? "leaf" : "leaf-outline";
              break;
            case "resources":
              name = focused ? "book" : "book-outline";
              break;
            case "learning":
              name = focused ? "school" : "school-outline";
              break;
            default:
              name = focused ? "ellipse" : "ellipse-outline";
          }
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="waste-diversion" options={{ title: "Waste Diversion" }} />
      <Tabs.Screen name="resources" options={{ title: "Resources" }} />
      <Tabs.Screen name="learning" options={{ title: "Learning" }} />
    </Tabs>
  );
}