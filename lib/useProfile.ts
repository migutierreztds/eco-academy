import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase";

export type Profile = {
  id: string;
  gln_status: "none" | "pending" | "approved" | "revoked";
  gln_joined_at: string | null;
  is_staff: boolean;
  district_id: string | null;
  school_id: string | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          if (mounted) setProfile(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, gln_status, gln_joined_at, is_staff, district_id, school_id")
          .eq("id", user.id)
          .single();

        if (!mounted) return;
        if (error) console.warn("Profile fetch error:", error);
        setProfile((data as Profile) ?? null);
      } catch (e) {
        console.error("useProfile error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => { mounted = false; };
  }, []);

  return { profile, loading };
}