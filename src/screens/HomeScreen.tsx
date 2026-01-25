import FileExplorer from '@/components/explorer/Explorer';
import Sidebar from '@/components/sidebar/Sidebar';
import StorageDashboard from '@/components/StorageDashboard';
import { Colors } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from 'react';
import {
    BackHandler,
    StyleSheet,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HomeScreen = () => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    // State: Current Path (null = Dashboard)
    const [explorerDir, setExplorerDir] = useState<string | null>(null);

    // --- Helper: Go up one level or exit ---
    const handleNavigateBack = useCallback(() => {
        setExplorerDir((currentPath) => {
            if (!currentPath) return null;

            // 1. If we are at root ('/'), exit to dashboard
            if (currentPath === '/') return null;

            // 2. Remove trailing slash if present (except for root)
            const cleanPath = currentPath.endsWith('/') && currentPath.length > 1
                ? currentPath.slice(0, -1)
                : currentPath;

            // 3. Find parent directory
            const lastSlashIndex = cleanPath.lastIndexOf('/');

            // If no slash found (rare) or it's top level, return null to exit
            if (lastSlashIndex === -1) return null;

            // 4. Calculate new path
            // If the slash is at index 0 (e.g. "/etc"), the parent is "/"
            const newPath = lastSlashIndex === 0 ? '/' : cleanPath.substring(0, lastSlashIndex);

            // Check if we hit the "exit" condition (optional logic depending on mount points)
            // For now, if newPath is empty, we go null
            return newPath || null;
        });
        return true; // Tells BackHandler we handled the event
    }, []);

    // --- Handle Hardware Back Button (Android) ---
    useEffect(() => {
        const onBackPress = () => {
            if (explorerDir) {
                return handleNavigateBack();
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [explorerDir, handleNavigateBack]);

    return (
        <Sidebar>
            <View
                style={[
                    styles.contentContainer,
                    {
                        paddingTop: insets.top + 10,
                        paddingBottom: insets.bottom + 20,
                        paddingLeft: isMobile ? 20 : 30,
                        paddingRight: 30
                    }
                ]}
            >
                {!explorerDir ? (
                    // --- VIEW 1: DASHBOARD ---
                    <View style={{ flex: 1, marginTop: isMobile ? 50 : 0 }}>
                        <StorageDashboard
                            onSelectDirectory={(path) => setExplorerDir(path)}
                        />
                    </View>
                ) : (
                    // --- VIEW 2: FILE EXPLORER ---
                    <FileExplorer
                        currentPath={explorerDir}
                        onBack={handleNavigateBack}
                        onNavigate={(newPath: any) => setExplorerDir(newPath)}
                        isMobile={isMobile}
                    />
                )}
            </View>
        </Sidebar>
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
});

export default HomeScreen;