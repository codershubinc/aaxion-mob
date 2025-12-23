import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: theme.surface + 'CC' }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>          
          {title ? <ThemedText type="defaultSemiBold">{title}</ThemedText> : null}
          {message ? <ThemedText style={{ marginTop: 8, opacity: 0.85 }}>{message}</ThemedText> : null}

          <View style={{ flexDirection: 'row', marginTop: 18, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onCancel} style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}>
              <ThemedText>{cancelLabel}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <ThemedText style={{ color: destructive ? theme.error : theme.tint }}>{confirmLabel}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 560, borderRadius: 12, padding: 18, borderWidth: 1 },
});
