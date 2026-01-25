import { useSidebar } from '@/context/SidebarContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StatusBar,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SidebarContent } from './SidebarComp';
import { BREAKPOINT, SIDEBAR_WIDTH, sidebarStyles as styles, THEME } from "./styles";



interface Props {
    children: React.ReactNode;
}

const Sidebar = ({ children }: Props) => {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isLargeScreen = width >= BREAKPOINT;

    const { isOpen, toggleSidebar, closeSidebar } = useSidebar();

    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isLargeScreen) closeSidebar();
    }, [isLargeScreen]);

    // Animate when context state changes
    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    const drawerTranslateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SIDEBAR_WIDTH, 0],
    });

    const backdropOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.surface} />

            {/* Desktop Sidebar */}
            {isLargeScreen && (
                <View style={[styles.sidebarDesktop, { width: SIDEBAR_WIDTH }]}>
                    <SidebarContent />
                </View>
            )}

            {/* Main Content & Floating Button */}
            <View style={styles.mainContent}>
                <View style={styles.contentContainer}>
                    {children}
                </View>

                {!isLargeScreen && (
                    <Pressable
                        onPress={toggleSidebar}
                        style={[
                            styles.floatingBtn,
                            { top: insets.top + 10, left: 20 }
                        ]}
                    >
                        <Ionicons name="menu" size={24} color={THEME.text} />
                    </Pressable>
                )}
            </View>

            {/* Mobile Drawer */}
            {!isLargeScreen && (
                <>
                    <TouchableWithoutFeedback onPress={closeSidebar}>
                        <Animated.View
                            style={[
                                styles.backdrop,
                                {
                                    opacity: backdropOpacity,
                                    zIndex: isOpen ? 100 : -1,
                                }
                            ]}
                        />
                    </TouchableWithoutFeedback>

                    <Animated.View
                        style={[
                            styles.mobileSidebar,
                            { transform: [{ translateX: drawerTranslateX }] }
                        ]}
                    >
                        <SidebarContent />
                    </Animated.View>
                </>
            )}
        </View>
    );
};

export default Sidebar;

