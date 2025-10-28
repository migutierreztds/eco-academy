// hooks/useProfile.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "~/lib/supabase";

export type Role = "school_admin" | "educator" | "community" | "facilities";
export type Profile = {
  id: string;
  role: Role;
  district: string;
  school: string | null;
  green_leaders: boolean;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      setProfile((data as Profile) ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, error, refresh };
}