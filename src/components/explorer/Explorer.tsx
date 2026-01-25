import { API_ENDPOINTS } from '@/constants/apiConstants';
import { Colors } from '@/constants/theme';
import { useFileExplorer } from '@/hooks/useExplorer';
import { fetcher } from '@/utils/requestUtil';
import { uploadFileSmart } from '@/utils/upload';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import BottomMenu from './BottomMenu';
import CreateFolderModal from './CreateFolderModal';
import Thumb from './Thumb';
import UploadToast from './UploadToast';

interface FileExplorerProps {
    currentPath: string;
    onBack: () => void;
    onNavigate: (path: string) => void;
    onRootDetected?: (rootPath: string) => void;
    isMobile: boolean;
    onGoHome: () => void;

}

// Helper to format bytes
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper to check if file is an image
const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
};

const FileExplorer = ({ currentPath, onBack, onNavigate, onRootDetected, isMobile, onGoHome, ...props }: FileExplorerProps) => {

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({
        visible: false,
        filename: '',
        progress: 0,
        speed: '0 MB/s',
        targetDir: ''
    });

    const { width } = useWindowDimensions();

    // Grid Setup: Minimum tile width 100px
    const numColumns = viewMode === 'grid' ? Math.floor((isMobile ? width - 40 : width - 60) / 110) : 1;

    const { files, loading, rootPath, refresh, currentDirName, baseUri, token } = useFileExplorer({
        currentPath,
        onNavigate,
        onRootDetected
    });

    // --- Action Handlers ---

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true, // Native uploader likes real paths
            });

            if (result.canceled) return;
            const file = result.assets[0];

            // 1. Show Toast
            setUploadStatus({
                visible: true,
                filename: file.name,
                progress: 0,
                speed: 'Starting...',
                targetDir: currentPath || "/"
            });

            // 2. Use the new Native Multipart Uploader
            await uploadFileSmart(
                file.uri,
                file.name,
                file.mimeType || 'application/octet-stream',
                currentPath || "/",
                (progress, speed) => {
                    setUploadStatus(prev => ({
                        ...prev,
                        progress: progress,
                        speed: speed
                    }));
                }
            );

            Alert.alert("Success", "File uploaded successfully");
            refresh();

        } catch (e: any) {
            console.error(e);
            Alert.alert("Error", e.message || "Failed to upload file");
        } finally {
            setTimeout(() => setUploadStatus(prev => ({ ...prev, visible: false })), 1000);
        }
    };

    const handleCreateFolder = async (newFolderName: string) => {
        try {
            const safePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
            const fullPath = safePath + newFolderName;

            await fetcher(`${API_ENDPOINTS.FILES.CREATE_DIRECTORY}?path=${encodeURIComponent(fullPath)}`, "POST");

            Alert.alert("Success", "Folder created successfully");
            refresh();
        } catch (error) {
            console.log("Err creating folder", error);
            Alert.alert("Error", "Failed to create folder");
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isDir = item.is_dir;
        const isImage = !isDir && isImageFile(item.name);

        // --- LIST VIEW ---
        if (viewMode === 'list') {
            return (
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => isDir && onNavigate(item.raw_path)}
                    activeOpacity={isDir ? 0.7 : 1}
                    disabled={!isDir}
                >
                    <View style={[styles.iconBox, isDir ? styles.iconBoxDir : styles.iconBoxFile]}>
                        {isImage ? (
                            <Thumb
                                path={item.raw_path}
                                baseUri={baseUri}
                                token={token}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Ionicons name={isDir ? "folder" : "document-text"} size={22} color={isDir ? "#FFD700" : "#A0A0A0"} />
                        )}
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.fileMeta}>{isDir ? "Folder" : formatBytes(item.size)}</Text>
                    </View>
                    {isDir && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />}
                </TouchableOpacity>
            );
        }

        // --- GRID VIEW ---
        else {
            return (
                <TouchableOpacity
                    style={styles.gridTile}
                    onPress={() => isDir && onNavigate(item.raw_path)}
                    activeOpacity={isDir ? 0.7 : 1}
                    disabled={!isDir}
                >
                    {/* Visual Area */}
                    <View style={styles.gridVisualContainer}>
                        {isImage ? (
                            <Thumb
                                path={item.raw_path}
                                baseUri={baseUri}
                                token={token}
                                style={styles.gridThumbImage}
                            />
                        ) : (
                            <View style={[styles.gridIconBox, isDir ? styles.iconBoxDir : styles.iconBoxFile]}>
                                <Ionicons name={isDir ? "folder" : "document-text"} size={32} color={isDir ? "#FFD700" : "#A0A0A0"} />
                            </View>
                        )}
                    </View>

                    {/* Text Area */}
                    <View style={styles.gridTextContainer}>
                        <Text style={styles.gridFileName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.fileMeta}>
                            {isDir ? "Folder" : formatBytes(item.size)}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isMobile && { paddingLeft: 60 }]}>
                <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {currentDirName === "" ? "File Explorer" : currentDirName}
                    </Text>
                    <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="middle">
                        {rootPath && currentPath === rootPath ? "Root Directory" : currentPath}
                    </Text>
                </View>

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

            {/* List Content */}
            <View style={{ flex: 1 }}>
                {loading && files.length === 0 ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={Colors.dark.tint} />
                    </View>
                ) : files.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Ionicons name="folder-open-outline" size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>This folder is empty.</Text>
                    </View>
                ) : (
                    <FlatList
                        key={viewMode}
                        data={files}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.raw_path}
                        numColumns={numColumns}
                        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
                        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#FFF" />
                        }
                    />
                )}
            </View>

            {/* Floating Bottom Menu */}
            <BottomMenu
                onHomePress={onGoHome}
                onUploadPress={handleUpload}
                onCreateFolderPress={() => {
                    console.log("Crete older press");

                    setCreateModalVisible(true)
                }}
            />

            {/* Create Folder Modal */}
            <CreateFolderModal
                visible={isCreateModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onCreate={handleCreateFolder}
            />
            <UploadToast
                visible={uploadStatus.visible}
                filename={uploadStatus.filename}
                progress={uploadStatus.progress}
                speed={uploadStatus.speed}
                targetDir={uploadStatus.targetDir}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10, paddingBottom: 10 },
    iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    pathText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },

    listContent: { paddingBottom: 20 },

    // --- List Item Styles ---
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    iconBox: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    fileName: { color: '#E0E0E0', fontSize: 15, fontWeight: '500', marginBottom: 2 },
    fileMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

    // --- Grid Item Styles ---
    columnWrapper: { gap: 10 },
    gridTile: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        minWidth: 100,
        maxWidth: 150,
        overflow: 'hidden',
    },
    gridVisualContainer: {
        height: 80,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    gridThumbImage: {
        width: '100%',
        height: '100%',
    },
    gridIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridTextContainer: {
        padding: 8,
        width: '100%',
    },
    gridFileName: {
        color: '#E0E0E0',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },

    // Shared Colors
    iconBoxDir: { backgroundColor: 'rgba(255, 215, 0, 0.1)' },
    iconBoxFile: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default FileExplorer;