import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomMenuProps {
    onHomePress: () => void;
    onUploadPress: () => void;
    onCreateFolderPress: () => void;
}

const BottomMenu = ({ onHomePress, onUploadPress, onCreateFolderPress }: BottomMenuProps) => {
    const insets = useSafeAreaInsets();

    // Calculate bottom position based on safe area
    const bottomOffset = Platform.OS === 'ios' ? insets.bottom : 20;

    return (
        <View style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
            <View style={styles.floatingContainer}>

                <MenuButton
                    icon="home"
                    label="Home"
                    onPress={onHomePress}
                    color={Colors.dark.tint}
                />

                {/* Vertical Divider Line */}
                <View style={styles.divider} />

                <MenuButton
                    icon="cloud-upload"
                    label="Upload"
                    onPress={onUploadPress}
                />

                <MenuButton
                    icon="folder-open"
                    label="New Folder"
                    onPress={onCreateFolderPress}
                />

            </View>
        </View>
    );
};

// --- Helper Component ---
const MenuButton = ({ icon, label, onPress, color = "#FFF" }: { icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, color?: string }) => (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.6}>
        <View style={styles.iconCircle}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.label, { color: color === "#FFF" ? "#CCC" : color }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        // Optional: Gradient fade behind menu could go here
        backgroundColor: 'transparent',
    },
    floatingContainer: {
        flexDirection: 'row',
        width: '90%', // Not full width
        maxWidth: 400,
        backgroundColor: '#1E1E1E', // Lighter than background
        borderRadius: 35, // <--- HIGH RADII (The Pill Look)
        paddingVertical: 12,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        alignItems: 'center',

        // --- Shadows for Depth ---
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10, // Android shadow

        // Border for subtle definition
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 4,
    },
    iconCircle: {
        // Optional: Add a subtle background circle behind icons if desired
        // backgroundColor: 'rgba(255,255,255,0.03)',
        // padding: 8,
        // borderRadius: 20,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 5,
    }
});

export default BottomMenu;