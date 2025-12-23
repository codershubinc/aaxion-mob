import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getApiBaseUrl } from './config';

const AUTH_TOKEN = "my_secret_token";

export const fetchFileList = async (dir: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/list?dir=${encodeURIComponent(dir)}`, {
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
    } catch (err) {
        throw err;
    }
};

// Upload URL computed per-request from config when needed

export const uploadFile = async (
    dir: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (info: { progress: number; bytesSent: number; totalBytes: number; timestamp: number }) => void,
    onCancelRegister?: (cancelFn: () => void) => void
) => {
    try {
        // We pass the original name in the query string. 
        // The server should be configured to use this 'name' parameter as the filename.
        const base = getApiBaseUrl();
        const uploadUrl = `${base}api/files/upload?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}`;

        // Detect web vs native runtime
        const isWeb = Platform && Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');

        if (isWeb) {
            // Web upload via XHR so we can report progress and support cancellation via abort()
            // Accept either a Blob/File (from input) or a uri that can be fetched into a blob
            let blob: Blob | null = null;
            try {
                if ((file as any).file instanceof Blob) {
                    blob = (file as any).file as Blob;
                } else if (typeof File !== 'undefined' && (file as any) instanceof (File as any)) {
                    blob = (file as any) as unknown as Blob;
                } else if (file.uri) {
                    // e.g., blob: or data: URIs or publicly accessible URLs
                    const fetched = await fetch(file.uri);
                    blob = await fetched.blob();
                }
            } catch {
                // ignore and let validation fail below
            }

            if (!blob) throw new Error('No file data available to upload on web');

            const form = new FormData();
            // third argument hints the filename
            form.append('file', blob as any, file.name);

            return await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', uploadUrl);
                // set auth and original filename header (server may use X-Original-Filename)
                xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`);
                xhr.setRequestHeader('X-Original-Filename', file.name);

                xhr.onload = () => {
                    const status = xhr.status;
                    const body = xhr.responseText;
                    if (status >= 200 && status < 300) {
                        try { resolve(JSON.parse(body)); } catch { resolve(body); }
                    } else {
                        reject(new Error(`Upload failed with status ${status}: ${body}`));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.onabort = () => reject(new Error('Upload aborted'));

                if (xhr.upload && onProgress) {
                    xhr.upload.onprogress = (e: ProgressEvent) => {
                        if (e.lengthComputable) {
                            const progress = e.loaded / e.total;
                            onProgress({ progress, bytesSent: e.loaded, totalBytes: e.total, timestamp: Date.now() });
                        } else {
                            onProgress({ progress: 0, bytesSent: e.loaded, totalBytes: 0, timestamp: Date.now() });
                        }
                    };
                }

                if (onCancelRegister) onCancelRegister(() => { try { xhr.abort(); } catch { } });

                try {
                    xhr.send(form);
                } catch (e) {
                    reject(e);
                }
            });
        }

        // Native path (Expo FileSystem multipart upload)
        let fileUri = file.uri;

        // We'll try to upload using the provided URI directly (avoids expensive copy of large files).
        // If the attempt fails (common with Android content:// URIs), we fall back to copying to a temporary file and retrying.
        const doUpload = async (uriToUpload: string) => {
            const uploadTask = FileSystem.createUploadTask(
                uploadUrl,
                uriToUpload,
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

            // Allow cancellation for the created task via onCancelRegister (closure captures uploadTask and will work if uploadTask is replaced)
            if (onCancelRegister) {
                onCancelRegister(() => {
                    try {
                        if (typeof (uploadTask as any).cancel === 'function') (uploadTask as any).cancel();
                        else if (typeof (uploadTask as any).cancelAsync === 'function') (uploadTask as any).cancelAsync();
                        else if (typeof (uploadTask as any).pause === 'function') (uploadTask as any).pause();
                    } catch {
                        // ignore
                    }
                });
            }

            return await uploadTask.uploadAsync();
        };

        // First try with the original URI (fast path - avoids copy). If it fails and it's a content:// URI, try copying and retrying.
        let response;
        try {
            response = await doUpload(fileUri);
        } catch (err) {
            // If it's a content URI on Android we may need to copy to a file first
            if (fileUri && fileUri.startsWith && fileUri.startsWith('content://')) {
                const tempDir = FileSystem.cacheDirectory + 'uploads/';
                await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
                const tempFileUri = tempDir + file.name;

                // Try a straight copy first (fast). If that fails, try reading as base64 and writing to a temp file.
                let copied = false;
                try {
                    await FileSystem.copyAsync({ from: fileUri, to: tempFileUri });
                    copied = true;
                } catch (copyErr) {
                    try {
                        // Some content URIs cannot be copied directly; try reading as base64 and writing out.
                        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                        await FileSystem.writeAsStringAsync(tempFileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                        copied = true;
                    } catch (readErr) {
                        // If this is an Android-specific owner/permission issue, surface a helpful message
                        const msg = (readErr && (readErr as any).message) || (copyErr && (copyErr as any).message) || String(err);
                        if (/Only owner is able to interact/i.test(msg) || /permission/i.test(msg) || /EACCES|EPERM/i.test(msg)) {
                            throw new Error(`Failed to access the selected file. On Android this can happen if the file is in a pending/trashed state or owned by another app. Try selecting the file with "Copy to cache directory" enabled, move it to a different folder, or grant the app storage permission. Original error: ${msg}`);
                        }
                        throw readErr;
                    }
                }

                if (copied) {
                    fileUri = tempFileUri;
                    // retry upload from temp file
                    response = await doUpload(fileUri);
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        }

        // Validate response from the successful upload attempt
        if (!response || response.status < 200 || response.status >= 300) {
            throw new Error(`Upload failed with status ${response?.status}: ${response?.body}`);
        }

        try {
            return JSON.parse(response.body);
        } catch {
            return response.body;
        }
    } catch (err) {
        throw err;
    }
};

export const deleteFile = async (path: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/delete`, {
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
    } catch (err) {
        throw err;
    }
};

export const createFolder = async (path: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/create-folder`, {
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
    } catch (err) {
        throw err;
    }
};

export const createFile = async (path: string, content: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/create-file`, {
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
    } catch (err) {
        throw err;
    }
};

export const getDownloadUrl = (path: string) => {
    const base = getApiBaseUrl();
    return `${base}api/files/download?path=${encodeURIComponent(path)}&token=${AUTH_TOKEN}`;
};

export const getSystemStorage = async (mount: string = '/') => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/storage/system`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch system storage for mount "${mount}": ${res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        throw err;
    }
};
