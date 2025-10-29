import * as ImagePicker from "expo-image-picker";
import { supabase } from "~/lib/supabase";

/**
 * Opens the media library, lets the user pick an image,
 * uploads it to the `gln-media` bucket at {userId}/{timestamp}.{ext},
 * and returns the public URL.
 */
export async function pickAndUploadToGLN(): Promise<string | undefined> {
  // 1) Pick image
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (res.canceled || !res.assets?.length) return;

  const asset = res.assets[0];

  // 2) Ensure signed-in user
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not signed in");

  // 3) Build storage path
  const ext =
    (asset.fileName?.split(".").pop() ||
      asset.uri.split("?")[0].split(".").pop() ||
      "jpg").toLowerCase();
  const path = `${user.id}/${Date.now()}.${ext}`;

  // 4) Convert asset to Blob (Expo-friendly)
  //    fetch(file://...) works in Expo and returns a Blob we can pass to storage.upload
  const resp = await fetch(asset.uri);
  const blob = await resp.blob();

  // 5) Upload to Supabase Storage
  const { error: upErr } = await supabase.storage
    .from("gln-media")
    .upload(path, blob, {
      contentType: asset.mimeType || `image/${ext}`,
      upsert: true,
    });
  if (upErr) throw upErr;

  // 6) Get public URL
  const { data: pub } = supabase.storage.from("gln-media").getPublicUrl(path);
  return pub.publicUrl;
}