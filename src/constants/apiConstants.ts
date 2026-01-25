import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_ENDPOINTS = {
    AUTH: {
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
    },
    FILES: {
        VIEW_CONTENT: '/api/files/view',
        CREATE_DIRECTORY: '/files/create-directory',
        UPLOAD: '/files/upload',
        UPLOAD_CHUNK_START: '/files/upload/chunk/start',
        UPLOAD_CHUNK_COMPLETE: '/files/upload/chunk/complete',
        UPLOAD_CHUNK: '/files/upload/chunk',
        DOWNLOAD: '/files/download',
        THUMBNAIL: '/files/thumbnail',
        VIEW_IMAGE: '/files/view-image',
        TEMP_SHARE_REQUEST: '/files/d/r',
        // Helper function for dynamic route
        TEMP_SHARE: (token: string) => `/files/d/t/${token}`,
    },
    SYSTEM: {
        GET_ROOT_PATH: '/api/system/get-root-path',
        STORAGE: '/api/system/storage',
    }
};

// Helper: Fetch with timeout (e.g., 2 seconds)
const fetchWithTimeout = async (url: string, timeout = 2000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(url, {
            signal: controller.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export const API_URLS = {
    getApiBaseUrl: async (): Promise<string | null> => {
        // 1. Get both URLs from storage
        const localUrl = await AsyncStorage.getItem('server.local_url');
        const remoteUrl = await AsyncStorage.getItem('server.remote_url');

        // 2. Try Local First (if it exists)
        if (localUrl) {
            try {
                console.log(`Pinging Local: ${localUrl}...`);
                // Ping the root or a lightweight endpoint
                const response = await fetchWithTimeout(`${localUrl}${API_ENDPOINTS.SYSTEM.GET_ROOT_PATH}`);
                console.log("res by ping", response);


                if (response.ok) {
                    console.log("=====Connected to Local=====");
                    return localUrl;
                }
            } catch (e) {
                console.warn("Local connection failed/timed out. Switching to Remote.");
            }
        }

        // 3. Fallback to Remote (if Local failed or didn't exist)
        if (remoteUrl) {
            console.log(`Using Remote: ${remoteUrl}`);
            return remoteUrl;
        }

        return null;
    },

    getApiToken: async (): Promise<string | null> => {
        return await AsyncStorage.getItem('userToken');
    },
    getAuthHeader: async () => {
        const token = await AsyncStorage.getItem('userToken');
        return { Authorization: `Bearer ${token}` };
    },
};