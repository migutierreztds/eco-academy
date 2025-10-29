import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, Pressable, ActivityIndicator, Alert, FlatList } from "react-native";
import { listGLNUpdates, deleteGLNUpdate, setGLNPostVisibility, GLNUpdate, GLNScope } from "~/lib/gln";
import { useProfile } from "~/lib/useProfile";

/* ---------- Single feed item ---------- */
function Item({
  item,
  isStaff,
  myUserId,
  onAction,
}: {
  item: GLNUpdate;
  isStaff: boolean;
  myUserId?: string;
  onAction: () => void;
}) {
  const isAuthor = myUserId === item.author_id;

  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, gap: 8 }}>
      <Text style={{ fontSize: 12, color: "#6b7280" }}>{new Date(item.created_at).toLocaleString()}</Text>

      {/* District/School badges */}
      {(item.school_name || item.district_name) ? (
        <Text style={{ fontSize: 12, color: "#4b5563" }}>
          {item.school_name ?? ""}
          {item.school_name && item.district_name ? " • " : ""}
          {item.district_name ?? ""}
        </Text>
      ) : null}

      {item.status !== "visible" && (
        <Text style={{ fontSize: 12, color: "#b45309" }}>
          Status: {item.status}
          {item.hidden_reason ? ` — ${item.hidden_reason}` : ""}
        </Text>
      )}

      <Text style={{ fontSize: 16 }}>{item.content}</Text>

      {item.media_url ? (
        <Image
          source={{ uri: item.media_url }}
          style={{ width: "100%", height: 200, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
        {isAuthor && (
          <Pressable
            onPress={async () => {
              try { await deleteGLNUpdate(item.id); onAction(); }
              catch (e: any) { Alert.alert("Delete failed", e.message); }
            }}
            style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fee2e2", borderRadius: 8 }}
          >
            <Text style={{ color: "#b91c1c", fontWeight: "600" }}>Delete</Text>
          </Pressable>
        )}
        {isStaff && (
          item.status === "visible" ? (
            <Pressable
              onPress={async () => {
                try { await setGLNPostVisibility(item.id, false, "Not appropriate"); onAction(); }
                catch (e: any) { Alert.alert("Hide failed", e.message); }
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fde68a", borderRadius: 8 }}
            >
              <Text style={{ color: "#92400e", fontWeight: "600" }}>Hide</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={async () => {
                try { await setGLNPostVisibility(item.id, true); onAction(); }
                catch (e: any) { Alert.alert("Unhide failed", e.message); }
              }}
              style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#d1fae5", borderRadius: 8 }}
            >
              <Text style={{ color: "#065f46", fontWeight: "600" }}>Unhide</Text>
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

/* ---------- Feed ---------- */
export default function GLNFeed({ scope = { kind: "all" } }: { scope?: GLNScope }) {
  const { profile } = useProfile();
  const [items, setItems] = useState<GLNUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listGLNUpdates({ limit: 20, scope });
      setItems(data);
      setEndReached(data.length < 20);
    } catch (e: any) {
      console.warn(e);
      setErrorMsg(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const loadMore = useCallback(async () => {
    if (loadingMore || endReached || items.length === 0) return;
    setLoadingMore(true);
    try {
      const last = items[items.length - 1];
      const more = await listGLNUpdates({ before: last.created_at, limit: 20, scope });
      setItems(prev => [...prev, ...more]);
      if (more.length < 20) setEndReached(true);
    } catch (e: any) {
      console.warn(e);
      setErrorMsg(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [items, loadingMore, endReached, scope]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <ActivityIndicator style={{ marginTop: 16 }} />;

  if (errorMsg) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#b91c1c" }}>Error: {errorMsg}</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#6b7280" }}>No updates to show.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => String(it.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <Item
          item={item}
          isStaff={!!profile?.is_staff}
          myUserId={profile?.id}
          onAction={refresh}
        />
      )}
      onEndReachedThreshold={0.3}
      onEndReached={loadMore}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
    />
  );
}