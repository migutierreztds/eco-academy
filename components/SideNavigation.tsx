import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '~/lib/supabase';

export default function SideNavigation() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { name: 'home', title: 'Home', icon: 'home', route: '/(tabs)/home' },
        { name: 'news', title: 'News', icon: 'newspaper', route: '/(tabs)/news' },
        { name: 'waste-diversion', title: 'Waste Diversion', icon: 'leaf', route: '/(tabs)/waste-diversion' },
        { name: 'calendar', title: 'Calendar', icon: 'calendar', route: '/(tabs)/calendar' },
        { name: 'resources', title: 'Resources', icon: 'book', route: '/(tabs)/resources' },
        { name: 'learning', title: 'Learning', icon: 'school', route: '/(tabs)/learning' },
        { name: 'account', title: 'Account', icon: 'person-circle', route: '/(tabs)/account' },
        { name: 'leaderboard', title: 'Leaderboard', icon: 'trophy-outline', route: '/(tabs)/leaderboard' },
        { name: 'green-leaders', title: 'Green Leaders', icon: 'leaf-outline', route: '/(tabs)/green-leaders' },
    ];

    const onSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/welcome');
    };

    return (
        <View style={styles.container}>
            {/* Header / Logo Area */}
            <View style={styles.header}>
                <Image
                    source={require('../assets/logo-eco-academy.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.navItems}>
                {tabs.map((tab) => {
                    // Check if the current pathname matches the tab route
                    // Simple check: exact match or starts with (for nested routes if any)
                    // Since structure is plain, mostly exact match on the segment
                    const isActive = pathname === tab.route || pathname.includes(tab.name);

                    return (
                        <Pressable
                            key={tab.name}
                            style={[styles.navItem, isActive && styles.navItemActive]}
                            onPress={() => router.push(tab.route as any)}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={22}
                                color={isActive ? '#2e7d32' : '#757575'}
                            />
                            <Text style={[styles.navText, isActive && styles.navTextActive]}>
                                {tab.title}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Spacer to push Sign Out to bottom */}
            <View style={{ flex: 1 }} />

            {/* Sign Out Button */}
            <Pressable
                style={styles.signOutBtn}
                onPress={onSignOut}
            >
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 240,
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0',
        height: '100%',
        paddingVertical: 12, // Reduced top padding
        paddingHorizontal: 12,
    },
    header: {
        marginBottom: 24,
        paddingHorizontal: 12,
        alignItems: 'center', // added center align for container
    },
    logo: {
        width: 180,
        height: 180,
        alignSelf: 'center',
    },
    navItems: {
        gap: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 12,
        // Web hover effect could be added with platform specific code or libraries,
        // keeping it simple for now.
        ...Platform.select({
            web: {
                cursor: 'pointer',
            }
        })
    },
    navItemActive: {
        backgroundColor: '#e8f5e9',
    },
    navText: {
        fontSize: 15,
        color: '#616161',
        fontWeight: '500',
    },
    navTextActive: {
        color: '#2e7d32',
        fontWeight: '700',
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 12,
        marginTop: 16,
        ...Platform.select({
            web: { cursor: 'pointer' }
        })
    },
    signOutText: {
        fontSize: 15,
        color: '#ef4444',
        fontWeight: '600',
    }
});
