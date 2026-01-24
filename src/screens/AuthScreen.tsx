import { Colors } from '@/constants/theme';
import { fetcher } from '@/utils/requestUtil';
import { useAaxionDiscovery } from '@/utils/searchServer';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AuthScreenProps {
    onLogin: (token: string) => void;
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { servers, isScanning, scan } = useAaxionDiscovery();

    useEffect(() => {
        scan();
    }, []);

    const selectedServer = servers.length > 0 ? servers[0] : null;

    const handleLogin = async () => {
        try {
            if (!username || !password) return Alert.alert('Error', 'Please enter both username and password');

            if (!selectedServer) {
                return Alert.alert('Error', 'No server found. Please ensure you are on the same network.');
            }

            const ip = selectedServer.ipAddresses[0];
            const port = selectedServer.port;
            const baseUrl = `http://${ip}:${port}`;
            const uri = `${baseUrl}/auth/login`;

            const response = await fetcher(
                uri,
                "POST",
                undefined,
                {
                    username,
                    password
                },
                undefined
                ,
                {
                    'Content-Type': 'application/json'
                }
            )
            const token = response.token;

            if (token) {
                await AsyncStorage.setItem('userToken', token);
                await AsyncStorage.setItem('apiBaseUrl', baseUrl);
                onLogin(token);
            } else {
                throw new Error('No token received');
            }
            return;
        } catch (error) {
            Alert.alert('Login Failed', 'An error occurred during login. Please try again.' + error);
            console.log("Err on login ::", error);

            return;
        }

    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    <Image
                        source={require('@/assets/images/icons/Gemini_Generated_Image_hpml0shpml0shpml-removebg-preview.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Welcome Back</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter username"
                            placeholderTextColor="#666"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter password"
                                placeholderTextColor="#666"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={24}
                                    color={Colors.dark.text}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        {selectedServer ? (
                            <Text style={styles.serverText}>Connected to: {selectedServer.name}</Text>
                        ) : isScanning ? (
                            <View style={styles.scanningContainer}>
                                <ActivityIndicator size="small" color={Colors.dark.tint} />
                                <Text style={styles.scanningText}>Searching for server...</Text>
                            </View>
                        ) : (
                            <Button title="Retry Scan" onPress={scan} color={Colors.dark.tint} />
                        )}
                        <Button
                            title="Login"
                            onPress={handleLogin}
                            color={Colors.dark.tint}
                            disabled={!selectedServer}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: Colors.dark.background,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: Colors.dark.background,
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        color: Colors.dark.text,
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        color: Colors.dark.text,
        marginBottom: 8,
        fontSize: 16,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderRadius: 8,
        paddingHorizontal: 15,
        color: Colors.dark.text,
        backgroundColor: Colors.dark.surface,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.border,
        borderRadius: 8,
        backgroundColor: Colors.dark.surface,
        gap: 10,
    },
    serverText: {
        color: Colors.dark.success,
        textAlign: 'center',
        marginBottom: 10,
    },
    scanningContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    scanningText: {
        color: Colors.dark.text,
        fontStyle: 'italic',
        height: 50,
        width: '100%',
    },
    passwordInput: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        color: Colors.dark.text,
    },
    eyeIcon: {
        padding: 10,
    },
    buttonContainer: {
        marginTop: 20,
        width: '100%',
    }
});

export default AuthScreen;