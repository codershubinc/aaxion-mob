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

interface SidebarContentProps {
    onLogout: () => void;
}

export const SidebarContent = ({ onLogout }: SidebarContentProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.sidebarInner, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

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

            {/* --- BOTTOM SECTION --- */}
            <View style={{ gap: 10 }}>
                <Storage />
                {/* Settings / Footer Menu */}
                <View style={{ marginTop: 10 }}>
                    <Pressable style={styles.menuItem}>
                        <Ionicons name="settings-outline" size={22} color={THEME.textDim} />
                        <Text style={{ marginLeft: 15, fontSize: 16, color: THEME.text, fontWeight: '500' }}>Settings</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={onLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        <Text style={{ marginLeft: 15, fontSize: 16, color: "#EF4444", fontWeight: '500' }}>Logout</Text>
                    </Pressable>
                </View>

            </View>
        </View>
    );
};