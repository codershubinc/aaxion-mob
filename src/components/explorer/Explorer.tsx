import { Colors } from '@/constants/theme';
import { useFileExplorer } from '@/hooks/useExplorer';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

interface FileExplorerProps {
    currentPath: string;
    onBack: () => void;
    onNavigate: (path: string) => void;
    onRootDetected?: (rootPath: string) => void;
    isMobile: boolean;
}

// Helper to format bytes
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileExplorer = ({ currentPath, onBack, onNavigate, onRootDetected, isMobile }: FileExplorerProps) => {

    // --- View State: 'list' or 'grid' ---
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Get screen width for grid calculations
    const { width } = useWindowDimensions();
    // Calculate number of columns for grid mode (adjust 110 based on tile min width)
    const numColumns = viewMode === 'grid' ? Math.floor((isMobile ? width - 40 : width - 300) / 110) : 1;

    const { files, loading, rootPath, refresh, currentDirName } = useFileExplorer({
        currentPath,
        onNavigate,
        onRootDetected
    });

    // --- Render Item (Handles both List and Grid) ---
    const renderItem = ({ item }: { item: any }) => {
        const isDir = item.is_dir;

        if (viewMode === 'list') {
            // --- LIST VIEW (Existing Card Style) ---
            return (
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => isDir && onNavigate(item.raw_path)}
                    activeOpacity={isDir ? 0.7 : 1}
                    disabled={!isDir}
                >
                    <View style={[styles.iconBox, isDir ? styles.iconBoxDir : styles.iconBoxFile]}>
                        <Ionicons name={isDir ? "folder" : "document-text"} size={22} color={isDir ? "#FFD700" : "#A0A0A0"} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.fileMeta}>{isDir ? "Folder" : formatBytes(item.size)}</Text>
                    </View>
                    {isDir && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />}
                </TouchableOpacity>
            );
        } else {
            // --- GRID VIEW (Square Tiles) ---
            return (
                <TouchableOpacity
                    style={styles.gridTile}
                    onPress={() => isDir && onNavigate(item.raw_path)}
                    activeOpacity={isDir ? 0.7 : 1}
                    disabled={!isDir}
                >
                    <View style={[styles.gridIconBox, isDir ? styles.iconBoxDir : styles.iconBoxFile]}>
                        <Ionicons name={isDir ? "folder" : "document-text"} size={32} color={isDir ? "#FFD700" : "#A0A0A0"} />
                    </View>
                    <Text style={styles.gridFileName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.fileMeta}>
                        {isDir ? "Folder" : formatBytes(item.size)}
                    </Text>
                </TouchableOpacity>
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* --- Header Row --- */}
            <View style={[styles.header, isMobile && { paddingLeft: 60 }]}>
                {/* Back Button */}
                <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Title & Path */}
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {currentDirName === "" ? "File Explorer" : currentDirName}
                    </Text>
                    <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="middle">
                        {rootPath && currentPath === rootPath ? "Root Directory" : currentPath}
                    </Text>
                </View>

                {/* Toggle View Button */}
                <TouchableOpacity
                    onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
                    style={styles.iconBtn}
                >
                    <Ionicons
                        name={viewMode === 'list' ? "grid-outline" : "list-outline"}
                        size={20}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>

            {/* --- Content Area --- */}
            {loading && files.length === 0 ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={Colors.dark.tint} />
                </View>
            ) : (
                files.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="folder-open-outline" size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>This folder is empty.</Text>
                    </View>
                ) :
                    <FlatList
                        key={viewMode} // Forces re-render when switching modes
                        data={files}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.raw_path}
                        numColumns={numColumns}
                        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#FFF" />
                        }
                    />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10, paddingBottom: 10 },
    iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    pathText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },

    listContent: { paddingBottom: 20 },

    // --- List Styles ---
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    iconBox: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    fileName: { color: '#E0E0E0', fontSize: 15, fontWeight: '500', marginBottom: 2 },
    fileMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

    // --- Grid Styles ---
    columnWrapper: { gap: 10 },
    gridTile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        padding: 15,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        minWidth: 100,
        maxWidth: 150,
    },
    gridIconBox: {
        width: 50, height: 50, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginBottom: 10
    },
    gridFileName: {
        color: '#E0E0E0', fontSize: 13, fontWeight: '500', textAlign: 'center'
    },

    // Shared Icon Colors
    iconBoxDir: { backgroundColor: 'rgba(255, 215, 0, 0.1)' },
    iconBoxFile: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default FileExplorer;