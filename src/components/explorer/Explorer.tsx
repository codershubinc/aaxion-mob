import { Colors } from '@/constants/theme';
import { useFileExplorer } from '@/hooks/useExplorer';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface FileExplorerProps {
    currentPath: string;
    onBack: () => void;
    onNavigate: (path: string) => void;
    onRootDetected?: (rootPath: string) => void;
    isMobile: boolean;
}

const FileExplorer = ({ currentPath, onBack, onNavigate, onRootDetected, isMobile }: FileExplorerProps) => {

    // --- Use Custom Hook ---
    const { files, loading, rootPath, refresh, currentDirName } = useFileExplorer({
        currentPath,
        onNavigate,
        onRootDetected
    });

    // --- Render Item ---
    const renderItem = ({ item }: { item: any }) => {
        const isDir = item.is_dir;
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
                    <Text style={styles.fileMeta}>{isDir ? "Folder" : `${item.size} B`}</Text>
                </View>
                {isDir && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, isMobile && { paddingLeft: 60 }]}>
                {/* Back Button */}
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{currentDirName === "" ? "File Explorer" : currentDirName}</Text>
                    <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="middle">
                        {rootPath && currentPath === rootPath ? "Root Directory" : currentPath}
                    </Text>
                </View>
            </View>

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
                        data={files}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.raw_path}
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
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 15, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    pathText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
    listContent: { paddingBottom: 20, gap: 8 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    iconBox: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    iconBoxDir: { backgroundColor: 'rgba(255, 215, 0, 0.1)' },
    iconBoxFile: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
    cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    fileName: { color: '#E0E0E0', fontSize: 15, fontWeight: '500', marginBottom: 2 },
    fileMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default FileExplorer;