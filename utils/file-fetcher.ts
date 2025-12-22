import * as FileSystem from 'expo-file-system/legacy';

const API_BASE_URL = "http://192.168.1.104:18875/";
const AUTH_TOKEN = "my_secret_token";

const LIST_FILES_URL = API_BASE_URL + "api/files/list";
export const fetchFileList = async (dir: string) => {
    const res = await fetch(`${LIST_FILES_URL}?dir=${encodeURIComponent(dir)}`, {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch files: ${res.statusText}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected an array");
    }
    return data;
};

const UPLOAD_URL = API_BASE_URL + "api/files/upload";

export const uploadFile = async (
    dir: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (info: { progress: number; bytesSent: number; totalBytes: number; timestamp: number }) => void
) => {
    // We pass the original name in the query string. 
    // The server should be configured to use this 'name' parameter as the filename.
    const uploadUrl = `${UPLOAD_URL}?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}`;

    // For large files (5GB-10GB), we MUST avoid unnecessary file operations like move/copy.
    // We use the URI provided by DocumentPicker directly.
    const uploadTask = FileSystem.createUploadTask(
        uploadUrl,
        file.uri,
        {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                // Hint server to use the original filename when storing the upload
                'X-Original-Filename': file.name,
            }
        },
        (data) => {
            if (onProgress && data.totalBytesExpectedToSend > 0) {
                const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
                onProgress({ progress, bytesSent: data.totalBytesSent, totalBytes: data.totalBytesExpectedToSend, timestamp: Date.now() });
            }
        }
    );

    const response = await uploadTask.uploadAsync();

    if (!response || response.status < 200 || response.status >= 300) {
        throw new Error(`Upload failed with status ${response?.status}: ${response?.body}`);
    }

    try {
        return JSON.parse(response.body);
    } catch {
        return response.body;
    }
};

export const deleteFile = async (path: string) => {
    const res = await fetch(`${API_BASE_URL}api/files/delete`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
    });
    if (!res.ok) {
        throw new Error(`Failed to delete file: ${res.statusText}`);
    }
    return await res.json();
};

export const createFolder = async (path: string) => {
    const res = await fetch(`${API_BASE_URL}api/files/create-folder`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
    });
    if (!res.ok) {
        throw new Error(`Failed to create folder: ${res.statusText}`);
    }
    return await res.json();
};

export const createFile = async (path: string, content: string) => {
    const res = await fetch(`${API_BASE_URL}api/files/create-file`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, content })
    });
    if (!res.ok) {
        throw new Error(`Failed to create file: ${res.statusText}`);
    }
    return await res.json();
};

export const getDownloadUrl = (path: string) => {
    return `${API_BASE_URL}api/files/download?path=${encodeURIComponent(path)}&token=${AUTH_TOKEN}`;
};
