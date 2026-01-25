import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { THEME } from './styles';

const SidebarIpInput = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Mode: 'local' (IP+Port) or 'remote' (Domain/URL)
    const [mode, setMode] = useState<'local' | 'remote'>('local');

    // Local Mode State
    const [protocol, setProtocol] = useState<'http' | 'https'>('http');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('8080');

    // Remote Mode State
    const [remoteUrl, setRemoteUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load existing configuration
    useEffect(() => {
        const loadCurrentConfig = async () => {
            try {
                const storedUrl = await AsyncStorage.getItem('server.local_url');
                if (!storedUrl) return;

                // Simple check: if it has a port or is a local IP pattern, assume Local Mode
                // Regex for IP (approximate)
                const isIp = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.test(storedUrl);

                if (isIp) {
                    setMode('local');
                    const regex = /^(https?):\/\/([^:/]+)(?::(\d+))?/;
                    const match = storedUrl.match(regex);
                    if (match) {
                        setProtocol(match[1] as 'http' | 'https');
                        setIp(match[2]);
                        if (match[3]) setPort(match[3]);
                    }
                } else {
                    setMode('remote');
                    setRemoteUrl(storedUrl);
                }
            } catch (e) {
                console.log("Failed to load config", e);
            }
        };
        loadCurrentConfig();
    }, []);

    const toggleProtocol = () => {
        setProtocol(prev => prev === 'http' ? 'https' : 'http');
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (mode === 'local') {
                // Validate Local IP
                if (!ip.trim()) throw new Error("IP is required");
                const fullLocal = `${protocol}://${ip.trim()}:${port.trim()}`;

                console.log("Saving Local URL:", fullLocal);
                // Save to 'server.local_url'
                await AsyncStorage.setItem('server.local_url', fullLocal);

            } else {
                // Validate Remote URL
                if (!remoteUrl.trim()) throw new Error("URL is required");
                let fullRemote = remoteUrl.trim();
                if (!/^https?:\/\//i.test(fullRemote)) {
                    fullRemote = `https://${fullRemote}`;
                }

                console.log("Saving Remote URL:", fullRemote);
                // Save to 'server.remote_url'
                await AsyncStorage.setItem('server.remote_url', fullRemote);
            }

            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setIsExpanded(false);
            }, 1500);

        } catch (e) {
            Alert.alert("Invalid Input", "Please check your details.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <View style={styles.wrapper}>
            {/* Header Toggle */}
            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIsExpanded(!isExpanded)}
            >
                <View style={styles.row}>
                    <Ionicons name="link-outline" size={22} color={THEME.textDim} />
                    <Text style={styles.menuText}>Connection</Text>
                </View>
                <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={THEME.textDim}
                />
            </TouchableOpacity>

            {/* Expandable Form */}
            {isExpanded && (
                <View style={styles.formContainer}>

                    {/* Mode Switcher */}
                    <View style={styles.modeSwitch}>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'local' && styles.modeActive]}
                            onPress={() => setMode('local')}
                        >
                            <Text style={[styles.modeText, mode === 'local' && styles.modeTextActive]}>Local IP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'remote' && styles.modeActive]}
                            onPress={() => setMode('remote')}
                        >
                            <Text style={[styles.modeText, mode === 'remote' && styles.modeTextActive]}>Remote URL</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- LOCAL IP FORM --- */}
                    {mode === 'local' && (
                        <View>
                            <View style={styles.rowStart}>
                                <TouchableOpacity
                                    style={[styles.protocolBtn, protocol === 'https' && styles.httpsActive]}
                                    onPress={toggleProtocol}
                                >
                                    <Text style={styles.protocolText}>{protocol.toUpperCase()} ://</Text>
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.portInput}
                                    value={port}
                                    onChangeText={setPort}
                                    placeholder="Port"
                                    placeholderTextColor={THEME.textDim}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TextInput
                                style={styles.mainInput}
                                value={ip}
                                onChangeText={setIp}
                                placeholder="192.168.1.X"
                                placeholderTextColor={THEME.textDim}
                                keyboardType="numeric"
                            />
                        </View>
                    )}

                    {/* --- REMOTE URL FORM --- */}
                    {mode === 'remote' && (
                        <View>
                            <TextInput
                                style={styles.mainInput}
                                value={remoteUrl}
                                onChangeText={setRemoteUrl}
                                placeholder="myserver.com"
                                placeholderTextColor={THEME.textDim}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Text style={styles.hint}>https:// will be added automatically</Text>
                        </View>
                    )}

                    {/* Save Button (Shared) */}
                    <TouchableOpacity
                        style={[styles.saveBtn, saved && styles.successBtn]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : saved ? (
                            <View style={styles.row}>
                                <Ionicons name="checkmark" size={16} color="#FFF" />
                                <Text style={styles.saveText}>Saved</Text>
                            </View>
                        ) : (
                            <Text style={styles.saveText}>Update Connection</Text>
                        )}
                    </TouchableOpacity>

                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { marginBottom: 5 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    menuText: { marginLeft: 15, fontSize: 16, color: THEME.text, fontWeight: '500' },

    // Form Container
    formContainer: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 5,
        marginTop: 5,
    },

    // Mode Switcher
    modeSwitch: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        padding: 2,
        marginBottom: 12,
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 4,
    },
    modeActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modeText: {
        fontSize: 12,
        color: THEME.textDim,
        fontWeight: '600',
    },
    modeTextActive: {
        color: THEME.text,
    },

    // Inputs
    rowStart: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    protocolBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    httpsActive: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    protocolText: { color: THEME.text, fontWeight: 'bold', fontSize: 12 },

    portInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        borderRadius: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        fontSize: 13,
        textAlign: 'center',
    },
    mainInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        marginBottom: 10,
    },
    hint: {
        fontSize: 10,
        color: THEME.textDim,
        marginTop: -6,
        marginBottom: 10,
        fontStyle: 'italic',
        marginLeft: 2,
    },

    // Save Button
    saveBtn: {
        backgroundColor: THEME.accent || '#4A90E2',
        borderRadius: 6,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    successBtn: { backgroundColor: '#4CAF50' },
    saveText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 6,
    },
});

export default SidebarIpInput;