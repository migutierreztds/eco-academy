// app/(tabs)/green-leaders.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useProfile } from "~/lib/useProfile";
import { requestJoinGLN, postGLNUpdate, type GLNScope } from "~/lib/gln";
import { pickAndUploadToGLN } from "~/lib/upload";
import GLNFeed from "~/components/GLNFeed";
import GLNFilterBar from "~/components/GLNFilterBar";
import { useNavigation } from "expo-router";
import AppHeader from "../../components/AppHeader"; // same path as Resources

export default function GreenLeadersScreen() {
  const { profile, loading } = useProfile();
  const nav = useNavigation();          // + NEW
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [posting, setPosting] = useState(false);
  React.useEffect(() => {
    nav.setOptions?.({
      header: () => (
        <AppHeader
          title="Green Leaders"
          subtitle="Share campus updates with other schools"
        />
      ),
    });
  }, [nav]);

  // Feed scope + a key to force-refresh feed after posting
  const [scope, setScope] = useState<GLNScope>({ kind: "all" });
  const [feedKey, setFeedKey] = useState(0);

  const attach = async () => {
    try {
      const url = await pickAndUploadToGLN();
      if (url) setMediaUrl(url);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  };

  const post = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await postGLNUpdate(content.trim(), mediaUrl);
      setContent("");
      setMediaUrl(undefined);
      setFeedKey((k) => k + 1); // force the feed to refresh
      Alert.alert("Posted!", "Your update is live.");
    } catch (e: any) {
      Alert.alert("Couldn’t post", e.message);
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <Text style={{ padding: 16 }}>Loading…</Text>;

  // --- Not a member yet ---
  if (!profile || ["none", "revoked"].includes(profile.gln_status)) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Green Leaders Network</Text>
        <Text>
          Share your campus sustainability stories with other schools! Join to start posting updates.
        </Text>

        <Pressable
          onPress={async () => {
            try {
              await requestJoinGLN();
              Alert.alert("Request sent", "We’ll review your request shortly.");
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          }}
          style={{ backgroundColor: "#10B981", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
            Request to Join
          </Text>
        </Pressable>

        {/* Read-only feed + filter (All only, since profile may not have IDs) */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "600" }}>Recent Green Leader Updates</Text>
          <GLNFilterBar value={scope} onChange={setScope} />
          <GLNFeed key={feedKey} scope={scope} />
        </View>
      </ScrollView>
    );
  }

  // --- Pending approval ---
  if (profile.gln_status === "pending") {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Request Pending</Text>
        <Text>
          Thanks for joining! You’ll be able to post once your membership is approved.
        </Text>

        {/* Read-only feed + filter (can use profile IDs if present) */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "600" }}>Current Green Leader Feed</Text>
          <GLNFilterBar
            value={scope}
            myDistrictId={profile?.district_id ?? null}
            mySchoolId={profile?.school_id ?? null}
            onChange={setScope}
          />
          <GLNFeed key={feedKey} scope={scope} />
        </View>
      </ScrollView>
    );
  }

  // --- Approved (full access) ---
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

      {/* Composer */}
      <View style={{ gap: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
        <Text style={{ fontWeight: "600" }}>Share an update</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="What’s happening at your campus?"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            padding: 10,
            borderRadius: 8,
            minHeight: 80,
          }}
        />
        {mediaUrl ? <Text style={{ fontSize: 12 }}>Attached: {mediaUrl}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={attach}
            style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: "#e5e7eb" }}
          >
            <Text style={{ textAlign: "center" }}>Attach photo</Text>
          </Pressable>
          <Pressable
            onPress={post}
            disabled={posting || !content.trim()}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              backgroundColor: posting || !content.trim() ? "#93C5FD" : "#3B82F6",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
              {posting ? "Posting…" : "Post"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Filter + Feed */}
      <View style={{ gap: 12 }}>
        <GLNFilterBar
          value={scope}
          myDistrictId={profile?.district_id ?? null}
          mySchoolId={profile?.school_id ?? null}
          onChange={setScope}
        />
        <GLNFeed key={feedKey} scope={scope} />
      </View>
    </ScrollView>
  );
}