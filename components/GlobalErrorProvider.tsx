import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setErrorHandler } from '@/utils/error-handler';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

export default function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('Error');
    const [message, setMessage] = useState('An error occurred');
    const [retry, setRetry] = useState<(() => void) | undefined>(undefined);

    useEffect(() => {
        setErrorHandler((err, context, opts) => {
            const detail = err instanceof Error ? err.message : typeof err === 'string' ? err : (() => { try { return JSON.stringify(err, Object.getOwnPropertyNames(err)); } catch { return String(err); } })();
            const msg = context ? `${context}: ${detail}` : detail || 'An error occurred';
            setTitle('Error');
            setMessage(msg);
            setRetry(opts?.retry);
            setVisible(true);
        });
        return () => setErrorHandler(null);
    }, []);

    const close = () => {
        setVisible(false);
        setRetry(undefined);
    };

    const onCopy = async () => {
        try {
            if (typeof navigator !== 'undefined' && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
                await (navigator as any).clipboard.writeText(message);
                Alert.alert('Copied', 'Error details copied to clipboard');
                return;
            }
        } catch {
            // fallthrough
        }
        Alert.alert('Notice', 'Copy to clipboard is not available on this platform');
    };

    const onRetry = () => {
        if (retry) {
            close();
            try { retry(); } catch { /* ignore - provider will reopen on error */ }
        }
    };

    return (
        <>
            {children}
            <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
                <View style={[styles.backdrop, { backgroundColor: theme.surface + 'CC' }]}>
                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <ThemedText type="defaultSemiBold">{title}</ThemedText>
                        <ThemedText style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>{message}</ThemedText>

                        <View style={{ flexDirection: 'row', marginTop: 18, justifyContent: 'flex-end' }}>
                            <TouchableOpacity onPress={onCopy} style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}>
                                <ThemedText>Copy</ThemedText>
                            </TouchableOpacity>
                            {retry && (
                                <TouchableOpacity onPress={onRetry} style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}>
                                    <ThemedText>Retry</ThemedText>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity onPress={close} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                                <ThemedText style={{ color: theme.tint }}>Close</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 760, borderRadius: 12, padding: 18, borderWidth: 1 },
});
