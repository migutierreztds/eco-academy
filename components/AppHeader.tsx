// components/AppHeader.tsx
import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle?: string;
  onLogoPress?: () => void;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode; // e.g., back button (not used in tabs, but handy later)
  backgroundColor?: string;
};

export default function AppHeader({
  title,
  subtitle,
  onLogoPress,
  rightSlot,
  leftSlot,
  backgroundColor = "#0B66FF",
}: Props) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor, width: "100%" }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 10,
          paddingTop: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Left slot (optional) */}
        <View style={{ width: 32, alignItems: "flex-start" }}>
          {leftSlot ?? null}
        </View>

        {/* Center: Logo + Title/Subtitle */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Pressable
            hitSlop={8}
            onPress={onLogoPress}
            disabled={!onLogoPress}
            style={{ alignItems: "center" }}
          >
            {/* Optional: replace with your Eco Academy logo asset */}
            {/* <Image source={require("../assets/ecoacademy-logo.png")} style={{ width: 24, height: 24, marginBottom: 4 }} /> */}
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Pressable>
        </View>

        {/* Right slot (optional) */}
        <View style={{ width: 32, alignItems: "flex-end" }}>
          {rightSlot ?? null}
        </View>
      </View>
    </SafeAreaView>
  );
}