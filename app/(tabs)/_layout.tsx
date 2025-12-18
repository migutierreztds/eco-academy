// app/(tabs)/_layout.tsx
import React, { useEffect } from "react";
import { Tabs, Slot, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions, View, StyleSheet } from "react-native";
import SideNavigation from "../../components/SideNavigation";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const nav = useNavigation();

  // We no longer need to toggle the parent header. 
  // The sidebar layout handles navigation, and individual screens handle their own titles.
  useEffect(() => {
    nav.setOptions({ headerShown: false });
  }, [nav]);

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <SideNavigation />
        <View style={styles.contentContainer}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,          // ← important: let screens show their own header
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#9e9e9e",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          height: 60,
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="waste-diversion"
        options={{
          title: "Waste Diversion",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: "Learning",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="green-leaders"
        options={{
          title: "Green Leaders",
          tabBarIcon: ({ color }) => <Ionicons name="leaf-outline" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    height: "100%",
  },
});