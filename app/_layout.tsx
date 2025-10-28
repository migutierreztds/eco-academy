// app/_layout.tsx
import 'react-native-reanimated';        // first
import 'react-native-gesture-handler';   // then
import React from 'react';
import { Slot } from 'expo-router';
export default function RootLayout() { return <Slot />; }