import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Helper ---
const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- Props ---
interface StorageTileProps {
    title: string;
    subtitle: string;
    used: number;
    total: number;
    percent: number;
    type?: 'internal' | 'external';
    onPress: () => void;
}

const StorageTile = ({
    title,
    subtitle,
    used,
    total,
    percent,
    type = 'internal',
    onPress
}: StorageTileProps) => {
    const isCritical = percent > 90;
    const barColor = isCritical ? '#FF5252' : (type === 'internal' ? '#4A90E2' : '#FF9800');
    const iconName = type === 'internal' ? 'server' : 'usb';
    const bg = type === 'internal' ? 'rgba(74, 144, 226, 0.1)' : 'rgba(255, 152, 0, 0.1)';

    return (
        <TouchableOpacity
            style={styles.tile}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.tileHeader}>
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <Ionicons name={iconName} size={24} color={barColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.tileSubtitle}>{subtitle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.bigPercent, { color: barColor }]}>
                        {percent.toFixed(0)}%
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginTop: 4 }} />
                </View>
            </View>

            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]} />
            </View>

            <View style={styles.statsRow}>
                <View>
                    <Text style={styles.statLabel}>Used</Text>
                    <Text style={styles.statValue}>{formatBytes(used)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>{formatBytes(total)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    tile: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    tileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    tileSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    bigPercent: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    barTrack: {
        height: 12,
        backgroundColor: '#333',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 15,
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        color: '#DDD',
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    }
});

export default StorageTile;