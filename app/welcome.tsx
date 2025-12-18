import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
    Image,
    Pressable,
    Platform
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing
} from "react-native-reanimated";

// ------------------------------------------------------------------
// ASSETS & CONFIG
// ------------------------------------------------------------------
// You might want to replace this with a real high-res image asset
const BG_IMAGE_URI = "https://images.unsplash.com/photo-1542601906990-b4d3fb7d5b43?q=80&w=2800&auto=format&fit=crop";

const SLIDES = [
    {
        id: 1,
        title: "Track Your Impact",
        desc: "Real-time waste diversion metrics for your school. See the difference you make every day.",
        icon: "bar-chart",
    },
    {
        id: 2,
        title: "Compete & Win",
        desc: "Join the Green Leaders Network. Climb the leaderboard and earn recognition for your campus.",
        icon: "trophy",
    },
    {
        id: 3,
        title: "Learn & Grow",
        desc: "Access a library of resources to help your community build sustainable habits.",
        icon: "book",
    },
];

export default function WelcomeScreen() {
    const { width, height } = useWindowDimensions();
    const router = useRouter();
    const isDesktop = width >= 768;

    // Carousel State
    const [activeSlide, setActiveSlide] = useState(0);

    // Auto-advance carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % SLIDES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // ------------------------------------------------------------------
    // RENDER HELPERS
    // ------------------------------------------------------------------

    const renderDots = () => (
        <View style={styles.dotContainer}>
            {SLIDES.map((_, idx) => (
                <Pressable key={idx} onPress={() => setActiveSlide(idx)}>
                    <View
                        style={[
                            styles.dot,
                            activeSlide === idx && styles.dotActive
                        ]}
                    />
                </Pressable>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* 
        LEFT PANEL (Desktop) / TOP PANEL (Mobile) 
        - Contains the visual 'Wow' factor
      */}
            <View style={[styles.visualPanel, isDesktop ? styles.visualPanelDesktop : styles.visualPanelMobile]}>
                <Image
                    source={{ uri: BG_IMAGE_URI }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
                {/* Dark Overlay */}
                <View style={styles.overlay} />

                <View style={styles.brandContainer}>
                    <Image
                        source={require("../assets/logo-eco-academy.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandTitle}>Eco Academy</Text>
                    <Text style={styles.brandSubtitle}>Empowering the next generation of green leaders.</Text>
                </View>
            </View>

            {/* 
        RIGHT PANEL (Desktop) / BOTTOM SHEET (Mobile)
        - Contains content & actions
      */}
            <View style={[styles.contentPanel, isDesktop ? styles.contentPanelDesktop : styles.contentPanelMobile]}>

                {/* Carousel Content */}
                <View style={styles.slideContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={SLIDES[activeSlide].icon as any} size={40} color="#2e7d32" />
                    </View>
                    <Text style={styles.slideTitle}>{SLIDES[activeSlide].title}</Text>
                    <Text style={styles.slideDesc}>{SLIDES[activeSlide].desc}</Text>
                    {renderDots()}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionGroup}>
                    <Pressable
                        style={[styles.btn, styles.btnPrimary]}
                        onPress={() => router.push("/(auth)/signup")}
                    >
                        <Text style={styles.btnTextPrimary}>Get Started</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => router.push("/(auth)/login")}
                    >
                        <Text style={styles.btnTextSecondary}>I already have an account</Text>
                    </Pressable>
                </View>

                <Text style={styles.footerText}>Version 1.0.0 • © 2024 Eco Academy</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row", // default row, but we override for mobile with style logic
        backgroundColor: "#fff",
        flexWrap: "wrap",
    },

    // --- VISUAL PANEL ---
    visualPanel: {
        backgroundColor: "#1b5e20",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    visualPanelDesktop: {
        width: "50%",
        height: "100%",
    },
    visualPanelMobile: {
        width: "100%",
        height: "55%",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.9)", // Light overlay for dark logo text
    },
    brandContainer: {
        zIndex: 10,
        alignItems: "center",
        padding: 32,
    },
    logo: {
        width: 280,
        height: 280,
        marginBottom: 24,
    },
    brandTitle: {
        fontSize: 42,
        fontWeight: "800",
        color: "#1b5e20", // Dark green
        letterSpacing: 1,
        marginBottom: 8,
        textAlign: "center",
    },
    brandSubtitle: {
        fontSize: 18,
        color: "#374151", // Dark gray
        textAlign: "center",
        maxWidth: 400,
        lineHeight: 26,
    },

    // --- CONTENT PANEL ---
    contentPanel: {
        backgroundColor: "#fff",
        justifyContent: "space-between",
        padding: 32,
    },
    contentPanelDesktop: {
        width: "50%",
        height: "100%",
        justifyContent: "center",
        gap: 48,
    },
    contentPanelMobile: {
        width: "100%",
        height: "45%", // Takes remaining height
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32, // Overlap effect
    },

    // --- CAROUSEL ---
    slideContainer: {
        alignItems: "center",
        marginTop: 16,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#e8f5e9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    slideTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#0B2A4A",
        marginBottom: 12,
        textAlign: "center",
    },
    slideDesc: {
        fontSize: 16,
        color: "#616161",
        textAlign: "center",
        lineHeight: 24,
        maxWidth: 400,
        marginBottom: 24,
    },
    dotContainer: {
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#e0e0e0",
    },
    dotActive: {
        backgroundColor: "#2e7d32",
        width: 24,
    },

    // --- ACTIONS ---
    actionGroup: {
        gap: 12,
        maxWidth: 400,
        width: "100%",
        alignSelf: "center",
    },
    btn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            web: { cursor: "pointer", transition: "0.2s" },
        }),
    },
    btnPrimary: {
        backgroundColor: "#0B66FF",
        shadowColor: "#0B66FF",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    btnSecondary: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    btnTextPrimary: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    btnTextSecondary: {
        color: "#616161",
        fontWeight: "600",
        fontSize: 16,
    },

    footerText: {
        textAlign: "center",
        color: "#bdbdbd",
        fontSize: 12,
        marginTop: 24,
    },
});
