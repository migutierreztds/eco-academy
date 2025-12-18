import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, Pressable, Modal, TextInput,
    FlatList, Alert, ActivityIndicator, Platform, Image, Linking
} from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

type NewsItem = {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    external_url: string | null;
    created_at: string;
};

export default function NewsScreen() {
    const nav = useNavigation();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Modal & Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newImg, setNewImg] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        checkUserRole();
        fetchNews();
    }, []);

    useEffect(() => {
        nav.setOptions?.({
            header: () => (
                <AppHeader
                    title="News & Updates"
                    subtitle="Latest from Eco Academy"
                />
            ),
        });
    }, [nav]);

    async function checkUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (data?.role === "Super Admin") setIsAdmin(true);
    }

    async function fetchNews() {
        setLoading(true);
        const { data, error } = await supabase
            .from("news")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) console.log(error);
        else if (data) setNews(data);
        setLoading(false);
    }

    // --- Form Actions ---

    function startCreate() {
        setEditId(null);
        setNewTitle(""); setNewDesc(""); setNewImg(""); setNewUrl("");
        setModalVisible(true);
    }

    function startEdit(item: NewsItem) {
        setEditId(item.id);
        setNewTitle(item.title);
        setNewDesc(item.description || "");
        setNewImg(item.image_url || "");
        setNewUrl(item.external_url || "");
        setModalVisible(true);
    }

    async function saveNews() {
        if (!newTitle.trim()) return Alert.alert("Required", "Title is required");
        setSaving(true);

        let error;
        if (editId) {
            // Update
            const res = await supabase.from("news").update({
                title: newTitle,
                description: newDesc,
                image_url: newImg || null,
                external_url: newUrl || null,
            }).eq("id", editId);
            error = res.error;
        } else {
            // Create
            const res = await supabase.from("news").insert({
                title: newTitle,
                description: newDesc,
                image_url: newImg || null,
                external_url: newUrl || null,
                created_by: (await supabase.auth.getUser()).data.user?.id,
            });
            error = res.error;
        }

        setSaving(false);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            setModalVisible(false);
            setNewTitle(""); setNewDesc(""); setNewImg(""); setNewUrl(""); setEditId(null);
            fetchNews();
            Alert.alert("Success", editId ? "News updated!" : "News posted!");
        }
    }

    function deleteNews(id: string) {
        Alert.alert(
            "Delete News",
            "Are you sure you want to delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.from("news").delete().eq("id", id);
                        if (error) Alert.alert("Error", error.message);
                        else fetchNews();
                    }
                }
            ]
        );
    }

    const openLink = (url: string | null) => {
        if (url) Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={news}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, gap: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No news yet.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {/* Image and Content */}
                            <Pressable onPress={() => openLink(item.external_url)}>
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                                ) : null}
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                    {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
                                    {!!item.external_url && (
                                        <Text style={styles.linkText}>Read more →</Text>
                                    )}
                                </View>
                            </Pressable>

                            {/* Admin Actions */}
                            {isAdmin && (
                                <View style={styles.adminRow}>
                                    <Pressable style={styles.adminBtn} onPress={() => startEdit(item)}>
                                        <Ionicons name="create-outline" size={20} color="#475569" />
                                        <Text style={styles.adminBtnText}>Edit</Text>
                                    </Pressable>
                                    <View style={styles.divider} />
                                    <Pressable style={styles.adminBtn} onPress={() => deleteNews(item.id)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>Delete</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}
                />
            )}

            {/* Admin FAB */}
            {isAdmin && (
                <Pressable style={styles.fab} onPress={startCreate}>
                    <Ionicons name="add" size={30} color="#fff" />
                </Pressable>
            )}

            {/* Create Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Post News</Text>

                        <TextInput style={styles.input} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
                        <TextInput style={[styles.input, styles.textArea]} placeholder="Brief Description" value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} />
                        <TextInput style={styles.input} placeholder="Image URL (optional)" value={newImg} onChangeText={setNewImg} />
                        <TextInput style={styles.input} placeholder="Link URL (e.g. https://...)" value={newUrl} onChangeText={setNewUrl} autoCapitalize="none" />

                        <View style={styles.modalActions}>
                            <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnTxtCancel}>Cancel</Text>
                            </Pressable>

                            <Pressable style={[styles.btn, styles.btnSave, saving && styles.btnDisabled]} onPress={saveNews} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxtSave}>Save</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    emptyText: { textAlign: "center", color: "#64748B", marginTop: 20 },
    card: {
        backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
        borderWidth: 1, borderColor: "#E2E8F0",
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    cardImage: { width: "100%", height: 160, backgroundColor: "#f0f0f0" },
    cardContent: { padding: 16 },
    cardTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
    cardDate: { fontSize: 12, color: "#94A3B8", marginBottom: 8 },
    cardDesc: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 12 },
    linkText: { color: "#2e7d32", fontWeight: "700", fontSize: 14 },
    adminRow: {
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9',
        paddingVertical: 8, backgroundColor: '#FAFAFA'
    },
    adminBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, gap: 8,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    adminBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    divider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },

    // Admin styles (reused from calendar usually)
    fab: {
        position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
        backgroundColor: "#2e7d32", justifyContent: "center", alignItems: "center",
        shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        ...Platform.select({ web: { cursor: "pointer" } })
    },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, alignSelf: "center" },
    modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 20 },
    input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: "#0F172A" },
    textArea: { height: 80, textAlignVertical: "top" },
    modalActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end", marginTop: 12 },
    btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, ...Platform.select({ web: { cursor: "pointer" } }) },
    btnCancel: { backgroundColor: "#F1F5F9" },
    btnSave: { backgroundColor: "#2e7d32" },
    btnDisabled: { opacity: 0.7 },
    btnTxtCancel: { fontWeight: "600", color: "#475569" },
    btnTxtSave: { fontWeight: "700", color: "#fff" },
});
