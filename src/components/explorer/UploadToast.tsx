import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';

interface UploadToastProps {
    visible: boolean;
    filename: string;
    progress: number; // 0 to 100
    speed: string;    // e.g. "2.5 MB/s"
    targetDir: string;
}

const UploadToast = ({ visible, filename, progress, speed, targetDir }: UploadToastProps) => {
    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Header: Icon + Filename */}
                <View style={styles.row}>
                    <View style={styles.iconBox}>
                        <Ionicons name="cloud-upload" size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.filename} numberOfLines={1}>{filename}</Text>
                        <Text style={styles.path} numberOfLines={1}>to: {targetDir}</Text>
                    </View>
                    <Text style={styles.percent}>{progress}%</Text>
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>

                {/* Footer: Speed */}
                <View style={styles.footer}>
                    <Text style={styles.speedText}>
                        <Ionicons name="speedometer-outline" size={12} color="#888" /> {speed}
                    </Text>
                    <Text style={styles.statusText}>Uploading...</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60, // Adjust for status bar
        left: 20,
        right: 20,
        zIndex: 1000,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.dark.tint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filename: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    path: {
        color: '#888',
        fontSize: 10,
    },
    percent: {
        color: Colors.dark.tint,
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Progress Bar
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.dark.tint,
        borderRadius: 2,
    },
    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    speedText: {
        color: '#AAA',
        fontSize: 11,
        fontVariant: ['tabular-nums'], // Keeps numbers monospaced to prevent jumping
    },
    statusText: {
        color: '#666',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});

export default UploadToast;