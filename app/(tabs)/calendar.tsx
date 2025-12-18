import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, Pressable, Modal, TextInput,
    FlatList, Alert, ActivityIndicator, Platform, Image
} from "react-native";
import { useNavigation } from "expo-router";
import { Calendar, DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import { supabase } from "~/lib/supabase";

type Event = {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    start_time: string;
    created_by: string;
};

export default function CalendarScreen() {
    const nav = useNavigation();
    const [events, setEvents] = useState<Event[]>([]);
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newImg, setNewImg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        checkUserRole();
        fetchEvents();
    }, []);

    useEffect(() => {
        // Process events into marked dates
        const marks: any = {};
        events.forEach((e) => {
            const dateKey = e.start_time.split("T")[0];
            marks[dateKey] = { marked: true, dotColor: "#2e7d32" };
        });
        // Highlight selected
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: "#2e7d32"
        };
        setMarkedDates(marks);
    }, [events, selectedDate]);

    // Update header
    useEffect(() => {
        nav.setOptions?.({
            header: () => (
                <AppHeader
                    title="Calendar"
                    subtitle="Events & Schedules"
                />
            ),
        });
    }, [nav]);

    async function checkUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (data?.role === "Super Admin") {
            setIsAdmin(true);
        }
    }

    async function fetchEvents() {
        setLoading(true);
        const { data, error } = await supabase
            .from("events")
            .select("*")
            .order("start_time", { ascending: true });

        if (error) {
            console.log("Error fetching events", error);
        } else if (data) {
            setEvents(data);
        }
        setLoading(false);
    }

    // --- Form Actions ---

    function startCreate() {
        setEditId(null);
        setNewTitle("");
        setNewDesc("");
        setNewImg("");
        // Default to today if nothing selected, or keep selectedDate
        setModalVisible(true);
    }

    function startEdit(item: Event) {
        setEditId(item.id);
        setNewTitle(item.title);
        setNewDesc(item.description || "");
        setNewImg(item.image_url || "");
        // We might want to switch selectedDate to the event's date, 
        // but usually the user is already on that day or simply viewing the list.
        setModalVisible(true);
    }

    async function saveEvent() {
        if (!newTitle.trim()) {
            Alert.alert("Required", "Please enter an event title.");
            return;
        }
        setSaving(true);

        const eventDate = selectedDate; // Or derive from existing event if we allowed changing dates (for now simplistic)
        const startTime = eventDate + "T09:00:00Z";

        let error;
        if (editId) {
            // Update
            const res = await supabase.from("events").update({
                title: newTitle,
                description: newDesc,
                image_url: newImg || null,
                // We keep the same time or update it if we had a date picker. 
                // For now assuming we edit title/desc only on the same day, or simply re-save the time.
            }).eq("id", editId);
            error = res.error;
        } else {
            // Create
            const res = await supabase.from("events").insert({
                title: newTitle,
                description: newDesc,
                image_url: newImg || null,
                start_time: startTime,
                created_by: (await supabase.auth.getUser()).data.user?.id,
            });
            error = res.error;
        }

        setSaving(false);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            setModalVisible(false);
            setNewTitle(""); setNewDesc(""); setNewImg(""); setEditId(null);
            fetchEvents();
            Alert.alert("Success", editId ? "Event updated!" : "Event created!");
        }
    }

    function deleteEvent(id: string) {
        Alert.alert(
            "Delete Event",
            "Are you sure you want to delete this event?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.from("events").delete().eq("id", id);
                        if (error) Alert.alert("Error", error.message);
                        else fetchEvents();
                    }
                }
            ]
        );
    }

    const selectedEvents = events.filter(e => e.start_time.startsWith(selectedDate));

    return (
        <View style={styles.container}>
            <Calendar
                onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                markedDates={markedDates}
                theme={{
                    todayTextColor: "#2e7d32",
                    arrowColor: "#2e7d32",
                }}
            />

            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>
                    Events for {new Date(selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </Text>

                {loading ? (
                    <ActivityIndicator color="#2e7d32" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={selectedEvents}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No events scheduled for this day.</Text>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.eventCard}>
                                {item.image_url && (
                                    <View>
                                        <Image source={{ uri: item.image_url }} style={styles.eventImage} resizeMode="cover" />
                                        <View style={styles.imageOverlay} />
                                    </View>
                                )}
                                {!item.image_url && <View style={styles.eventBar} />}
                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle}>{item.title}</Text>
                                    {!!item.description && (
                                        <Text style={styles.eventDesc}>{item.description}</Text>
                                    )}

                                    {isAdmin && (
                                        <View style={styles.adminRow}>
                                            <Pressable style={styles.adminBtn} onPress={() => startEdit(item)}>
                                                <Ionicons name="create-outline" size={18} color="#475569" />
                                                <Text style={styles.adminBtnText}>Edit</Text>
                                            </Pressable>
                                            <View style={styles.divider} />
                                            <Pressable style={styles.adminBtn} onPress={() => deleteEvent(item.id)}>
                                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                                <Text style={[styles.adminBtnText, { color: '#EF4444' }]}>Delete</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Admin FAB */}
            {isAdmin && (
                <Pressable
                    style={styles.fab}
                    onPress={startCreate}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </Pressable>
            )}

            {/* Create Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{editId ? "Edit Event" : "New Event"}</Text>
                        <Text style={styles.modalSub}>{editId ? "Updating details" : `Adding for: ${selectedDate}`}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Event Title"
                            value={newTitle}
                            onChangeText={setNewTitle}
                            autoFocus
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description (optional)"
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                            numberOfLines={3}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Image URL (optional)"
                            value={newImg}
                            onChangeText={setNewImg}
                        />

                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.btn, styles.btnCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.btnTxtCancel}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.btn, styles.btnSave, saving && styles.btnDisabled]}
                                onPress={saveEvent}
                                disabled={saving}
                            >
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
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    listSection: {
        flex: 1,
        padding: 20,
        backgroundColor: "#F8FAFC",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 12,
    },
    emptyText: {
        color: "#64748B",
        fontStyle: "italic",
        marginTop: 8,
    },
    eventCard: {
        flexDirection: "column",
        backgroundColor: "#fff",
        borderRadius: 8,
        marginBottom: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    eventBar: {
        width: 6,
        backgroundColor: "#2e7d32",
    },
    eventContent: {
        padding: 12,
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 4,
    },
    eventDesc: {
        fontSize: 14,
        color: "#475569",
    },
    eventImage: {
        width: "100%",
        height: 120,
        backgroundColor: "#f0f0f0",
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)' // Subtle dim
    },
    adminRow: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 12
    },
    adminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    adminBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569'
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E2E8F0'
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#2e7d32",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        ...Platform.select({
            web: { cursor: "pointer" }
        })
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
        marginBottom: 4,
    },
    modalSub: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        color: "#0F172A",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "flex-end",
    },
    btn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        ...Platform.select({ web: { cursor: "pointer" } })
    },
    btnCancel: {
        backgroundColor: "#F1F5F9",
    },
    btnSave: {
        backgroundColor: "#2e7d32",
    },
    btnDisabled: {
        opacity: 0.7,
    },
    btnTxtCancel: {
        fontWeight: "600",
        color: "#475569",
    },
    btnTxtSave: {
        fontWeight: "700",
        color: "#fff",
    },
});
