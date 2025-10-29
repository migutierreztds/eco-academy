import React from "react";
import { View, Text, Pressable } from "react-native";
import type { GLNScope } from "~/lib/gln";

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#2563EB" : "#e5e7eb",
        backgroundColor: active ? "#DBEAFE" : "white",
      }}
    >
      <Text style={{ color: active ? "#1D4ED8" : "#111827", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export default function GLNFilterBar({
  value,
  myDistrictId,
  mySchoolId,
  onChange,
}: {
  value: GLNScope;
  myDistrictId?: string | null;
  mySchoolId?: string | null;
  onChange: (s: GLNScope) => void;
}) {
  const isAll = value.kind === "all";
  const isMD  = value.kind === "my_district";
  const isMS  = value.kind === "my_school";

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Chip active={isAll} label="All" onPress={() => onChange({ kind: "all" })} />
      {myDistrictId ? (
        <Chip
          active={isMD}
          label="My District"
          onPress={() => onChange({ kind: "my_district", id: myDistrictId })}
        />
      ) : null}
      {mySchoolId ? (
        <Chip
          active={isMS}
          label="My School"
          onPress={() => onChange({ kind: "my_school", id: mySchoolId })}
        />
      ) : null}
    </View>
  );
}