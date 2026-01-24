import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import Zeroconf from 'react-native-zeroconf';

// --- Types ---
export interface AaxionServer {
    name: string;
    fullName: string;
    ipAddresses: string[];
    port: number;
    txt: Record<string, any>;
}

// --- SAFE SINGLETON INITIALIZATION ---
let zeroconfInstance: Zeroconf | null = null;

// Check if the NATIVE module actually exists before instantiating
if (NativeModules.RNZeroconf) {
    try {
        zeroconfInstance = new Zeroconf();
    } catch (e) {
        console.warn("Zeroconf JS init failed:", e);
    }
} else {
    console.warn("⚠️ Zeroconf Native Module is missing! Scanning will not work. (Are you using Expo Go?)");
}

export const useAaxionDiscovery = () => {
    const [servers, setServers] = useState<Record<string, AaxionServer>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track if hook is mounted to prevent state updates after unmount
    const isMounted = useRef(true);

    const checkPermissions = async () => {
        if (Platform.OS !== 'android') return true;
        try {
            // Android 13+
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
                    {
                        title: "Local Permission",
                        message: "Required to find Aaxion servers.",
                        buttonNeutral: "Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            // Android 12 and below
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Location Permission",
                    message: "Required to find local servers.",
                    buttonNeutral: "Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const scan = useCallback(async () => {
        // SAFETY CHECK: If native module is missing, stop here.
        if (!zeroconfInstance) {
            if (isMounted.current) setError("Native Module Missing (Dev Client Required)");
            return;
        }

        const hasPermission = await checkPermissions();
        if (!hasPermission) {
            if (isMounted.current) setError("Permissions denied");
            return;
        }

        if (isMounted.current) {
            setError(null);
            setServers({});
        }

        // Safe stop
        try {
            zeroconfInstance.stop();
        } catch (e) { /* Ignore stop errors */ }

        setTimeout(() => {
            if (!isMounted.current || !zeroconfInstance) return;
            try {
                zeroconfInstance.scan('aaxion', 'tcp', 'local.');
            } catch (e) {
                console.error("Scan error", e);
                if (isMounted.current) setError("Scan failed to start");
            }
        }, 500);
    }, []);

    const stop = useCallback(() => {
        if (zeroconfInstance) {
            try { zeroconfInstance.stop(); } catch (e) { }
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;

        // If native module is missing, do nothing but warn
        if (!zeroconfInstance) {
            setError("Native Module Missing. Use Development Build.");
            return;
        }

        const zc = zeroconfInstance;

        const onResolved = (service: any) => {
            if (!isMounted.current) return;
            console.log("Found:", service.name);
            setServers((prev) => ({
                ...prev,
                [service.name]: {
                    name: service.name,
                    fullName: service.fullName,
                    ipAddresses: service.addresses,
                    port: service.port,
                    txt: service.txt,
                },
            }));
        };

        const onRemove = (name: string) => {
            if (!isMounted.current) return;
            setServers((prev) => {
                const newState = { ...prev };
                delete newState[name];
                return newState;
            });
        };

        const onStart = () => isMounted.current && setIsScanning(true);
        const onStop = () => isMounted.current && setIsScanning(false);
        const onError = (e: any) => isMounted.current && setError("Zeroconf Error");

        // Listeners
        zc.on('start', onStart);
        zc.on('stop', onStop);
        zc.on('resolved', onResolved);
        zc.on('remove', onRemove);
        zc.on('error', onError);

        // Initial scan
        scan();

        return () => {
            isMounted.current = false;
            try {
                zc.removeDeviceListeners();
                zc.stop();
            } catch (e) { }
        };
    }, [scan]);

    return {
        servers: Object.values(servers),
        isScanning,
        error,
        scan,
        stop
    };
};