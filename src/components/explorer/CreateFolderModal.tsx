import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface CreateFolderModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (folderName: string) => void;
}

const CreateFolderModal = ({ visible, onClose, onCreate }: CreateFolderModalProps) => {
    const [folderName, setFolderName] = useState('');

    const handleSubmit = () => {
        if (folderName.trim()) {
            onCreate(folderName.trim());
            setFolderName(''); // Reset
            onClose();
        }
    };

    const handleCancel = () => {
        setFolderName('');
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="folder-open" size={24} color={Colors.dark.tint} />
                        </View>
                        <Text style={styles.title}>New Folder</Text>
                    </View>

                    <Text style={styles.subtitle}>
                        Enter a name for this folder
                    </Text>

                    {/* Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Folder Name"
                        placeholderTextColor="#666"
                        value={folderName}
                        onChangeText={setFolderName}
                        autoFocus={true}
                        selectionColor={Colors.dark.tint}
                    />

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={[styles.createBtn, !folderName.trim() && styles.disabledBtn]}
                            disabled={!folderName.trim()}
                        >
                            <Text style={styles.createText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)', // Dark dim background
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(74, 144, 226, 0.15)', // Tint color bg
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        marginBottom: 20,
        marginLeft: 2,
    },
    input: {
        backgroundColor: '#121212',
        color: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 25,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    cancelText: {
        color: '#AAA',
        fontWeight: '600',
        fontSize: 16,
    },
    createBtn: {
        backgroundColor: Colors.dark.tint,
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    disabledBtn: {
        backgroundColor: '#333',
        opacity: 0.7,
    },
    createText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default CreateFolderModal;