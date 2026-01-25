import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { fetcher } from '@/utils/requestUtil';
import { THEME } from './styles';

// --- Types ---
interface StorageDevice {
    device?: string; // e.g., "/dev/sdb1"
    mount_point?: string;
    total: number;
    used: number;
    available: number;
    usage_percentage: number;
}

interface StorageResponse extends StorageDevice {
    external_devices: StorageDevice[] | null;
}

// --- Helper ---
const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- Sub-Component for a Single Bar ---
const StorageBar = ({ label, used, total, percent, isExternal = false }: { label: string, used: number, total: number, percent: number, isExternal?: boolean }) => {
    const barColor = percent > 90 ? (THEME.danger || '#FF5252') : (isExternal ? '#FF9800' : THEME.accent); // Orange for external, Blue for internal

    return (
        <View style={[styles.deviceContainer, isExternal && styles.externalContainer]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    {isExternal && <Ionicons name="bus-outline" size={12} color={THEME.textDim} />}
                    <Text style={styles.label} numberOfLines={1}>{label}</Text>
                </View>
                <Text style={styles.percent}>{percent.toFixed(0)}%</Text>
            </View>

            <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]} />
            </View>

            <Text style={styles.details}>
                {formatBytes(used)} / {formatBytes(total)}
            </Text>
        </View>
    );
};

const Storage = () => {
    const [data, setData] = useState<StorageResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { baseUrl, token } = await api.getAll();
            if (!baseUrl) return;
            const res = await fetcher(`${baseUrl}/api/system/storage`, "GET", token || undefined);
            if (res) setData(res);
        } catch (e) {
            console.error("Storage fetch failed", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (!data) return null;

    return (
        <View style={styles.container}>
            {/* Header Title & Refresh */}
            <View style={styles.mainHeader}>
                <Text style={styles.mainTitle}>System Storage</Text>
                <TouchableOpacity onPress={loadData} disabled={loading} style={styles.refreshBtn}>
                    {loading ? <ActivityIndicator size="small" color={THEME.textDim} /> : <Ionicons name="refresh" size={14} color={THEME.textDim} />}
                </TouchableOpacity>
            </View>

            {/* 1. Main Internal Storage */}
            <StorageBar
                label="Internal Disk"
                used={data.used}
                total={data.total}
                percent={data.usage_percentage}
            />

            {/* 2. External Devices List */}
            {data.external_devices && data.external_devices.length > 0 && (
                <View style={styles.externalSection}>
                    <View style={styles.divider} />
                    {data.external_devices.map((device, index) => (
                        <StorageBar
                            key={index}
                            label={device.mount_point?.split('/').pop() || "USB Drive"}
                            used={device.used}
                            total={device.total}
                            percent={device.usage_percentage}
                            isExternal={true}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginHorizontal: 10,
    },
    mainHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    mainTitle: {
        fontSize: 12,
        textTransform: 'uppercase',
        color: THEME.textDim,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    refreshBtn: {
        padding: 4,
    },
    // Device Item Styles
    deviceContainer: {
        marginBottom: 4,
    },
    externalContainer: {
        marginTop: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    label: {
        fontSize: 13,
        color: THEME.text,
        fontWeight: '600',
        flex: 1, // Allows truncation if name is long
    },
    percent: {
        fontSize: 12,
        color: THEME.textDim,
        fontVariant: ['tabular-nums'],
    },
    track: {
        height: 5,
        backgroundColor: '#424242',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
    details: {
        fontSize: 10,
        color: THEME.textDim,
        textAlign: 'right',
    },
    // External Section Separator
    externalSection: {
        marginTop: 5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 10,
    }
});

export default Storage;