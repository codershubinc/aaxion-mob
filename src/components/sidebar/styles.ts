import { StyleSheet } from "react-native";
export const BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 250;

export const THEME = {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#E0E0E0",
    textDim: "#A0A0A0",
    accent: "#4A90E2",
    backdrop: "rgba(0,0,0,0.7)",
    floatingBtn: "#2C2C2C",
    danger: "#FF5252"
};

export const sidebarStyles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: THEME.background,
    },
    sidebarDesktop: {
        backgroundColor: THEME.surface,
        height: "100%",
    },
    sidebarInner: { flex: 1, paddingHorizontal: 20 },
    mobileSidebar: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: THEME.surface,
        zIndex: 101,
        elevation: 10,
    },
    logoContainer: { marginTop: 20, marginBottom: 40, paddingHorizontal: 10 },
    logo: {
        fontSize: 24,
        fontWeight: "bold",
        color: THEME.accent,
        letterSpacing: 1,
    },
    menuContainer: { flex: 1 },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 10,
        marginBottom: 5,
        borderRadius: 8,
    },
    menuText: {
        marginLeft: 15,
        fontSize: 16,
        color: THEME.text,
        fontWeight: "500",
    },
    mainContent: {
        flex: 1,
        backgroundColor: THEME.background,
        position: "relative",
    },
    contentContainer: { flex: 1 },
    floatingBtn: {
        position: "absolute",
        width: 45,
        height: 45,
        borderRadius: 25,
        backgroundColor: THEME.floatingBtn,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 50,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: THEME.backdrop,
    },
});
