import { SidebarProvider } from '@/context/SidebarContext';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme} >
      <SidebarProvider>

        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </SidebarProvider>
    </ThemeProvider>
  );
}
