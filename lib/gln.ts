// lib/gln.ts
import { supabase } from "~/lib/supabase";

/** Base post model + fields exposed by v_gl_updates for filtering/badges */
export type GLNUpdate = {
  id: number;
  author_id: string;
  content: string;
  media_url: string | null;
  status: "visible" | "hidden" | "flagged";
  hidden_reason: string | null;
  hidden_by: string | null;
  created_at: string;
  updated_at: string | null;

  // From v_gl_updates (effective scope + names)
  effective_district_id?: string | null;
  effective_school_id?: string | null;
  district_name?: string | null;
  school_name?: string | null;
};

/** Feed scope */
export type GLNScope =
  | { kind: "all" }
  | { kind: "my_district"; id: string }
  | { kind: "my_school"; id: string };

/* -------------------- Membership helpers -------------------- */

export async function requestJoinGLN() {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ gln_status: "pending" })
    .eq("id", user.id);

  if (error) throw error;
}

/* -------------------- Posting -------------------- */

export async function postGLNUpdate(
  content: string,
  mediaUrl?: string,
  schoolId?: string,
  districtId?: string
) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("gl_updates").insert({
    author_id: user.id,
    content,
    media_url: mediaUrl ?? null,
    school_id: schoolId ?? null,
    district_id: districtId ?? null,
  });

  if (error) throw error;
}

/* -------------------- Feed (scope-aware) -------------------- */

export async function listGLNUpdates(opts?: {
  before?: string;   // pagination cursor (created_at)
  limit?: number;    // default 20
  scope?: GLNScope;  // All / My District / My School
}) {
  const { before, limit = 20, scope } = opts ?? {};

  // Query the VIEW so we get district/school names + effective_* ids
  let q = supabase
    .from("v_gl_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) q = q.lt("created_at", before);

  if (scope?.kind === "my_district") {
    q = q.eq("effective_district_id", scope.id);
  } else if (scope?.kind === "my_school") {
    q = q.eq("effective_school_id", scope.id);
  }
  // 'all' -> no extra filter

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GLNUpdate[];
}

/* -------------------- Moderation -------------------- */

export async function deleteGLNUpdate(id: number) {
  const { error } = await supabase.from("gl_updates").delete().eq("id", id);
  if (error) throw error;
}

export async function setGLNPostVisibility(id: number, visible: boolean, reason?: string) {
  const payload: Partial<GLNUpdate> = visible
    ? { status: "visible", hidden_reason: null }
    : { status: "hidden", hidden_reason: reason ?? null };
  const { error } = await supabase.from("gl_updates").update(payload).eq("id", id);
  if (error) throw error;
}

export async function flagGLNPost(id: number, reason?: string) {
  const { error } = await supabase
    .from("gl_updates")
    .update({ status: "flagged", hidden_reason: reason ?? null })
    .eq("id", id);
  if (error) throw error;
}