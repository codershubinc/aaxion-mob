import { API_ENDPOINTS } from '@/constants/apiConstants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface ThumbProps {
    path: string;
    baseUri: string;
    token: string;
    style?: any;
}

const Thumb = ({ path, baseUri, token, style }: ThumbProps) => {
    const [hasError, setHasError] = useState(false);

    // Construct URI
    const uri = `${baseUri}${API_ENDPOINTS.FILES.THUMBNAIL}?path=${encodeURIComponent(path)}&tkn=${token}`;

    if (hasError) {
        // Fallback icon if image fails
        return (
            <View style={[styles.fallbackContainer, style]}>
                <Ionicons name="image" size={32} color="#555" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: uri }}
            style={[styles.image, style]}
            resizeMode="cover"
            onError={() => setHasError(true)}
        />
    );
};

const styles = StyleSheet.create({
    image: {
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)', // Placeholder color while loading
    },
    fallbackContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
    }
});

export default Thumb;