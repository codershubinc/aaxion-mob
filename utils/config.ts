const DEFAULT_API_BASE = "http://192.168.1.102:18875/";
const STORAGE_KEY = 'aaxion:api_base';
let cachedApiBase: string = DEFAULT_API_BASE;

const loadFromStorage = async () => {
    // Try web localStorage first
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const v = window.localStorage.getItem(STORAGE_KEY);
            if (v) cachedApiBase = v;
            return;
        }
    } catch {
        // ignore
    }

    // Native persistence is optional. If you want persistent storage on native platforms,
    // install '@react-native-async-storage/async-storage' and uncomment the dynamic import below.
    // For now, if localStorage isn't available, we fall back to in-memory only.
    // try {
    //   const mod = await import('@react-native-async-storage/async-storage');
    //   const AsyncStorage = (mod && (mod as any).default) ? (mod as any).default : (mod as any);
    //   if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
    //     const v = await AsyncStorage.getItem(STORAGE_KEY);
    //     if (v) cachedApiBase = v;
    //     return;
    //   }
    // } catch {
    //   // persist not available
    // }
};

// Kick off load in background (best-effort)
loadFromStorage().catch(() => { });

export const getApiBaseUrl = () => cachedApiBase || DEFAULT_API_BASE;

export const setApiBaseUrl = async (url: string) => {
    cachedApiBase = url;
    // Save to storage if possible
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, url);
            return;
        }
    } catch {
        // ignore
    }
    // Native persistence optional - uncomment dynamic import if AsyncStorage is installed
    // try {
    //   const mod = await import('@react-native-async-storage/async-storage');
    //   const AsyncStorage = (mod && (mod as any).default) ? (mod as any).default : (mod as any);
    //   if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
    //     await AsyncStorage.setItem(STORAGE_KEY, url);
    //     return;
    //   }
    // } catch {
    //   // Not available — best-effort, will survive for session only
    // }
};

export const testApiBaseUrl = async (url: string, timeoutMs = 5000) => {
    try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const id = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        const testUrl = url.endsWith('/') ? `${url}api/files/storage/system` : `${url}/api/files/storage/system`;
        const res = await fetch(testUrl, { method: 'GET', signal: controller ? (controller.signal as any) : undefined });
        if (id) clearTimeout(id);
        return res.ok;
    } catch {
        return false;
    }
};

export const resetApiBaseUrlToDefault = async () => {
    await setApiBaseUrl(DEFAULT_API_BASE);
};

export default { getApiBaseUrl, setApiBaseUrl, testApiBaseUrl, resetApiBaseUrlToDefault, DEFAULT_API_BASE };