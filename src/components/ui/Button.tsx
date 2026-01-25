import { Colors } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    style?: ViewStyle;
}

export const Button = ({
    title,
    variant = 'primary',
    loading = false,
    style,
    disabled,
    ...props
}: ButtonProps) => {
    const isDark = true; // defaulting to dark theme as per AuthScreen usage
    const theme = isDark ? Colors.dark : Colors.light;

    const getBackgroundColor = () => {
        if (disabled) return theme.surface;
        switch (variant) {
            case 'primary': return theme.tint;
            case 'secondary': return theme.surface;
            case 'outline': return 'transparent';
            default: return theme.tint;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.icon;
        switch (variant) {
            case 'primary': return isDark ? '#FFFFFF' : '#FFFFFF';
            case 'secondary': return theme.text;
            case 'outline': return theme.tint;
            default: return '#FFFFFF';
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') return theme.tint;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                style,
            ]}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
