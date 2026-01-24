import { Colors } from '@/constants/theme';
import { fetcher } from '@/utils/requestUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

interface HomeScreenProps {
    onLogout: () => void;
}

const HomeScreen = ({ onLogout }: HomeScreenProps) => {
    const handleLogout = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const baseUrl = await AsyncStorage.getItem('apiBaseUrl');

            if (token && baseUrl) {
                await fetcher(
                    `${baseUrl}/auth/logout`,
                    'POST',
                    undefined,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            }
        } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to logout from server, performing local logout.");
        } finally {
            // Clear persistence
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('apiBaseUrl');
            // Update parent state directly
            onLogout();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome Home!</Text>
            <Button title="Logout (Clear Token)" onPress={handleLogout} color={Colors.dark.tint} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.dark.background,
    },
    text: {
        fontSize: 24,
        marginBottom: 20,
        color: Colors.dark.text,
    }
});

export default HomeScreen;