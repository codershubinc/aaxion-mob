import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface FileExplorerProps {
    currentPath: string;
    onBack: () => void;
    onNavigate: (path: string) => void; // <--- New Prop to go deeper
    isMobile: boolean;
}

const FileExplorer = ({ currentPath, onBack, onNavigate, isMobile }: FileExplorerProps) => {

    // Temporary helper to simulate clicking a folder
    const handleTestClick = () => {
        const nextPath = currentPath === '/'
            ? '/test_folder'
            : `${currentPath}/test_folder`;
        onNavigate(nextPath);
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={[
                styles.header,
                isMobile && { paddingLeft: 50 }
            ]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={Colors.dark.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.headerTitle}>File Explorer</Text>
                    <Text style={styles.pathText} numberOfLines={1} ellipsizeMode="head">
                        {currentPath}
                    </Text>
                </View>
            </View>

            {/* Content Area */}
            <View style={styles.contentBox}>
                <Ionicons name="folder-open-outline" size={48} color="#555" />
                <Text style={styles.placeholderText}>
                    Files will appear here
                </Text>

                {/* --- TEMPORARY TEST BUTTON --- */}
                <View style={{ marginTop: 20 }}>
                    <Button title="Go Deeper (Test)" onPress={handleTestClick} color={Colors.dark.tint} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 12,
        height: 50,
    },
    backBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark.text,
    },
    pathText: {
        color: '#888',
        fontSize: 11,
        marginTop: 1,
    },
    contentBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.7,
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#333'
    },
    placeholderText: {
        color: '#666',
        fontSize: 16,
    }
});

export default FileExplorer;