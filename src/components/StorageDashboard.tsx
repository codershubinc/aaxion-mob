import { API_ENDPOINTS } from '@/constants/apiConstants';
import { Colors } from '@/constants/theme';
import { fetcher } from '@/utils/requestUtil';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import StorageTile from './StorageTile';


interface StorageDevice {
    device?: string;
    mount_point?: string;
    filesystem_type?: string;
    total: number;
    used: number;
    available: number;
    usage_percentage: number;
}

interface StorageResponse extends StorageDevice {
    external_devices: StorageDevice[] | null;
}

interface StorageDashboardProps {
    onSelectDirectory: (path: string) => void;
}

const StorageDashboard = ({ onSelectDirectory }: StorageDashboardProps) => {
    const [data, setData] = useState<StorageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {

            const res = await fetcher(API_ENDPOINTS.SYSTEM.STORAGE, "GET");

            if (res) setData(res);
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 50 }} />;

    if (!data) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color="#666" />
                <Text style={styles.errorText}>
                    Unable to load storage info.{'\n'}Check your server connection.
                </Text>
                <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                    <Text style={{ color: Colors.dark.tint }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Storage Overview</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                <Text style={{ color: Colors.dark.tint }}>Refresh</Text>
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
            >
                {/* 1. Main System Drive (Root) */}
                <StorageTile
                    title="System Disk"
                    subtitle="Root Directory"
                    used={data.used}
                    total={data.total}
                    percent={data.usage_percentage}
                    type="internal"
                    onPress={() => onSelectDirectory('/')}
                />

                {/* 2. External Drives */}
                {data.external_devices && data.external_devices.length > 0 && (
                    <>
                        <Text style={styles.subHeader}>External Devices ({data.external_devices.length})</Text>
                        <View style={styles.grid}>
                            {data.external_devices.map((device, idx) => (
                                <StorageTile
                                    key={idx}
                                    title={device.mount_point?.split('/').pop() || `Drive ${idx + 1}`}
                                    subtitle={device.mount_point || "USB Storage"}
                                    used={device.used}
                                    total={device.total}
                                    percent={device.usage_percentage}
                                    type="external"
                                    onPress={() => onSelectDirectory(device.mount_point || '/')}
                                />
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 15, marginLeft: 5 },
    subHeader: { fontSize: 16, fontWeight: '600', color: '#AAA', marginTop: 20, marginBottom: 10, marginLeft: 5 },
    scrollContent: { paddingBottom: 40 },
    grid: { gap: 15 },

    errorContainer: { padding: 20, alignItems: 'center' },
    errorText: { color: '#888', marginTop: 10, textAlign: 'center' },
    retryBtn: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 8 }
});

export default StorageDashboard;