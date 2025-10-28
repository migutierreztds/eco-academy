// lib/profile.ts
import { supabase } from "~/lib/supabase";

export type Role = "school_admin" | "educator" | "community" | "facilities";
export type Profile = {
  id: string;
  role: Role;
  district: string;
  school?: string | null;
  green_leaders: boolean;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

// Upsert with client-side validation
export async function upsertMyProfile(input: Omit<Profile, "id">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Role-specific validation
  if (!input.district?.trim()) throw new Error("Please select a district");
  if (input.role === "educator" && !input.school?.trim()) {
    throw new Error("Educators must select a school");
  }

  const payload = {
    id: user.id,
    role: input.role,
    district: input.district.trim(),
    school: input.school?.trim() || null,
    green_leaders: !!input.green_leaders,
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
  return payload;
}