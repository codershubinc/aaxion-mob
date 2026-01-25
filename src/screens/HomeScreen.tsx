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

    // State: The actual root path of the server (e.g. /home/user)
    const [serverRoot, setServerRoot] = useState<string | null>(null);

    // --- Helper: Go up one level or exit ---
    const handleNavigateBack = useCallback(() => {
        setExplorerDir((currentPath) => {
            if (!currentPath) return null;

            // 1. EXIT CONDITIONS:
            // If current path is generic root '/' OR 
            // If current path matches the known Server Root
            if (currentPath === '/' || (serverRoot && currentPath === serverRoot)) {
                return null; // Go back to Dashboard
            }

            // 2. Remove trailing slash
            const cleanPath = currentPath.endsWith('/') && currentPath.length > 1
                ? currentPath.slice(0, -1)
                : currentPath;

            // 3. Find parent directory
            const lastSlashIndex = cleanPath.lastIndexOf('/');

            // Safety check
            if (lastSlashIndex === -1) return null;

            // 4. Calculate new path
            const newPath = lastSlashIndex === 0 ? '/' : cleanPath.substring(0, lastSlashIndex);

            return newPath || null;
        });
        return true;
    }, [serverRoot]); // Dependent on serverRoot

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
                        // Capture the root path when Explorer loads it
                        onRootDetected={(root) => setServerRoot(root)}
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