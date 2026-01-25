import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from './storage';
import { sidebarStyles as styles, THEME } from './styles';
import SidebarIpInput from './updateIp';

export const SidebarContent = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.sidebarInner, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

            {/* --- TOP SECTION --- */}
            <View style={{ flex: 1 }}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>Aaxion</Text>
                </View>

                {/* Main Navigation */}
                <View style={styles.menuContainer}>
                    <SidebarIpInput />

                    <Pressable style={styles.menuItem}>
                        <Ionicons name="folder-open-outline" size={22} color={THEME.textDim} />
                        <Text style={{ marginLeft: 15, fontSize: 16, color: THEME.text, fontWeight: '500' }}>Files</Text>
                    </Pressable>
                </View>
            </View>

            {/* --- BOTTOM SECTION --- */}
            {/* marginTop: 'auto' pushes this entire block to the bottom */}
            <View style={{ marginTop: 'auto', gap: 10 }}>
                <Storage />
                {/* Settings / Footer Menu */}
                <View style={[styles.menuContainer, { marginTop: 10 }]}>
                    <Pressable style={styles.menuItem}>
                        <Ionicons name="settings-outline" size={22} color={THEME.textDim} />
                    </Pressable>
                </View>

            </View>
        </View>
    );
};