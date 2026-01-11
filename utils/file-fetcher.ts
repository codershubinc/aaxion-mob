
import { Platform } from 'react-native';
import { getApiBaseUrl } from './config';


// --- CORE FUNCTIONS ---

export const fetchFileList = async (dir: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}api/files/view?dir=${encodeURIComponent(dir)}`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        console.log("Res status", res.status);

        if (!res.ok) throw new Error(`Failed to fetch files: ${res.statusText}`);
        const data = await res.json();
        // AOI server returns `null` when a directory is empty. Treat that as an empty list.
        if (data === null) return [];
        if (!Array.isArray(data)) throw new Error("Invalid response: expected an array or null for empty directory");
        return data;
    } catch (err) {
        throw err;
    }
};

const AUTH_TOKEN = "my_secret_token";

export interface FileToUpload {
    uri: string;
    name: string;
    type: string;
    file?: File | Blob;
}

const createThrottledProgress = (onProgress?: (info: any) => void) => {
    if (!onProgress) return () => { };
    let lastUpdate = 0;
    return (loaded: number, total: number) => {
        const now = Date.now();
        if (now - lastUpdate > 250 || loaded === total) {
            const progress = total > 0 ? loaded / total : 0;
            onProgress({ progress, bytesSent: loaded, totalBytes: total, timestamp: now });
            lastUpdate = now;
        }
    };
};

export const uploadFile = async (
    dir: string,
    file: FileToUpload,
    onProgress?: (info: { progress: number; bytesSent: number; totalBytes: number; timestamp: number }) => void,
    onCancelRegister?: (cancelFn: () => void) => void
) => {
    try {
        const base = getApiBaseUrl();
        const uploadUrl = `${base}files/upload?dir=${encodeURIComponent(dir)}`;
        const handleProgress = createThrottledProgress(onProgress);

        console.log(`[UploadDebug] Starting upload: ${file.name}, Platform: ${Platform.OS}`);

        // ============================================================
        //  WEB: STRICT MEMORY-SAFE IMPLEMENTATION
        // ============================================================
        if (Platform.OS === 'web') {
            if (!file.file) {
                console.error("[UploadDebug] Critical: Missing native File object on Web.");
                throw new Error("Web upload requires the raw 'File' object.");
            }

            const nativeSlice = window.Blob.prototype.slice;
            const blob = file.file as File | Blob;
            const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
            const total = (blob as any).size || 0;

            console.log(`[UploadDebug] File size: ${(total / 1024 / 1024).toFixed(2)} MB`);

            // --- Case 1: Small File (Single Request) ---
            if (total <= CHUNK_SIZE) {
                console.log("[UploadDebug] Mode: Single Request (Small File)");
                return await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', uploadUrl);
                    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`);
                    xhr.setRequestHeader('X-Original-Filename', file.name);
                    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) handleProgress(e.loaded, e.total);
                    };

                    xhr.onload = () => {
                        console.log(`[UploadDebug] Single upload completed. Status: ${xhr.status}`);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(xhr.responseText); }
                        } else {
                            reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
                        }
                    };
                    xhr.onerror = () => {
                        console.error("[UploadDebug] Network error during single upload");
                        reject(new Error('Network error'));
                    };

                    if (onCancelRegister) onCancelRegister(() => {
                        console.log("[UploadDebug] Aborting single upload");
                        xhr.abort();
                    });

                    xhr.send(blob as any);
                });
            }

            // --- Case 2: Large File (Chunked) ---
            const totalChunks = Math.ceil(total / CHUNK_SIZE);
            console.log(`[UploadDebug] Mode: Chunked Upload. Total Chunks: ${totalChunks}`);

            let uploaded = 0;
            let aborted = false;

            // Start Session
            try {
                console.log("[UploadDebug] Initializing chunk session...");
                const startUrl = `${getApiBaseUrl()}files/upload/chunk/start?filename=${encodeURIComponent(file.name)}`;
                await fetch(startUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } });
            } catch (e) {
                console.warn("[UploadDebug] Failed to call start endpoint (non-fatal)", e);
            }

            for (let idx = 0; idx < totalChunks; idx++) {
                if (aborted) throw new Error('Upload aborted');

                const start = idx * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, total);

                console.log(`[UploadDebug] Processing Chunk ${idx + 1}/${totalChunks} (Bytes: ${start}-${end})`);

                // MEMORY FIX: Use native slice explicitly
                let chunk: Blob | null = nativeSlice.call(blob, start, end);
                console.log(`[UploadDebug] Chunk ${idx + 1} slice created.`);

                await new Promise<void>((resolve, reject) => {
                    let xhr: XMLHttpRequest | null = new XMLHttpRequest();
                    const url = uploadUrl + `&filename=${encodeURIComponent(file.name)}&chunk_index=${idx}`;

                    xhr.open('POST', url);
                    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`);
                    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${total}`);

                    xhr.upload.onprogress = (e) => {
                        const loaded = (e.lengthComputable ? e.loaded : 0);
                        handleProgress(uploaded + loaded, total);
                    };

                    xhr.onload = () => {
                        if (xhr && xhr.status >= 200 && xhr.status < 300) {
                            console.log(`[UploadDebug] Chunk ${idx + 1} uploaded successfully.`);
                            uploaded += (end - start);
                            handleProgress(uploaded, total);
                            resolve();
                        } else {
                            console.error(`[UploadDebug] Chunk ${idx + 1} failed: ${xhr?.status}`);
                            reject(new Error(`Chunk error: ${xhr?.status} ${xhr?.responseText}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.onabort = () => { aborted = true; reject(new Error('Aborted')); };

                    if (onCancelRegister) onCancelRegister(() => { if (xhr) xhr.abort(); });

                    xhr.send(chunk);
                });

                // MEMORY FIX: Explicitly dereference variables
                console.log(`[UploadDebug] Cleaning up memory for Chunk ${idx + 1}...`);
                chunk = null;
            }

            console.log("[UploadDebug] All chunks sent. Finalizing...");
            const finalizeUrl = (getApiBaseUrl() + `files/upload/chunk/complete?filename=${encodeURIComponent(file.name)}&dir=${encodeURIComponent(dir)}`);
            const finalizeRes = await fetch(finalizeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
                body: JSON.stringify({ dir: dir || '/', name: file.name }),
            });

            if (!finalizeRes.ok) {
                console.error(`[UploadDebug] Finalization failed: ${finalizeRes.status}`);
                throw new Error(`Finalizing failed: ${finalizeRes.statusText}`);
            }

            console.log("[UploadDebug] Upload sequence complete.");
            try { return await finalizeRes.json(); } catch { return await finalizeRes.text(); }
        }

        // ============================================================
        //  NATIVE IMPLEMENTATION (Logs added)
        // ============================================================
        console.log("[UploadDebug] Native upload path selected.");
        let FileSystem;
        try {
            try {
                const mod = await import('expo-file-system/legacy');
                FileSystem = (mod && (mod as any).default) ? (mod as any).default : mod;
            } catch {
                const mod = await import('expo-file-system');
                FileSystem = (mod && (mod as any).default) ? (mod as any).default : mod;
            }
        } catch { throw new Error("Native FileSystem not found"); }

        console.log("[UploadDebug] Creating native upload task...");
        const uploadTask = FileSystem.createUploadTask(
            uploadUrl,
            file.uri,
            {
                fieldName: 'file',
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                mimeType: file.type,
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}`, 'X-Original-Filename': file.name }
            },
            (data: any) => handleProgress(data.totalBytesSent, data.totalBytesExpectedToSend)
        );

        if (onCancelRegister) onCancelRegister(() => {
            console.log("[UploadDebug] Cancelling native task");
            if (uploadTask.cancel) uploadTask.cancel();
        });

        const response = await uploadTask.uploadAsync();
        console.log(`[UploadDebug] Native upload finished. Status: ${response.status}`);

        if (response.status >= 200 && response.status < 300) {
            try { return JSON.parse(response.body); } catch { return response.body; }
        }
        throw new Error(`Upload failed: ${response.status}`);

    } catch (err) {
        console.error("[UploadDebug] Upload Exception:", err);
        throw err;
    }
};
export const createFolder = async (path: string) => {
    try {
        const base = getApiBaseUrl();
        // AOI: create directory via query param as /files/create-directory?path={path}
        const res = await fetch(`${base}files/create-directory?path=${encodeURIComponent(path)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            }
        });
        if (!res.ok) throw new Error(`Failed to create folder: ${res.statusText}`);
        return await res.json();
    } catch (err) { throw err; }
};

export const createFile = async (path: string, content: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}files/create-file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path, content })
        });
        if (!res.ok) throw new Error(`Failed to create file: ${res.statusText}`);
        return await res.json();
    } catch (err) { throw err; }
};

export const getDownloadUrl = (path: string) => {
    const base = getApiBaseUrl();
    return `${base}files/download?path=${encodeURIComponent(path)}&token=${AUTH_TOKEN}`;
};

// Request a one-time temporary link for a file. Server responds with a token path (e.g. "/files/d/t/<token>") or similar.
export const requestTemporaryLink = async (filePath: string) => {
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}files/d/r?file_path=${encodeURIComponent(filePath)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        });
        if (!res.ok) throw new Error(`Failed to request temporary link: ${res.statusText}`);
        const text = await res.text();
        return text; // caller can pass this to getDownloadUrlFromToken
    } catch (err) { throw err; }
};

// Build a full download URL from a token or returned path
export const getDownloadUrlFromToken = (tokenOrPath: string) => {
    const base = getApiBaseUrl();
    const token = tokenOrPath.includes('/files/d/t/') ? tokenOrPath.split('/files/d/t/').pop() : tokenOrPath;
    return `${base}files/d/t/${encodeURIComponent(token || "")}`;
};

// --- SYSTEM STORAGE LOGIC ---
let _storageInFlight: Promise<any> | null = null;
let _lastStorageAttemptTs = 0;
let _suppressedAfterFailure = false;
const STORAGE_SUPPRESSION_MS = 30_000;

export const getSystemStorage = async (mount: string = '/', opts?: { userInitiated?: boolean; force?: boolean }) => {
    const now = Date.now();

    if (_storageInFlight) return _storageInFlight;

    if (_suppressedAfterFailure && !(opts?.userInitiated && opts?.force)) {
        return Promise.reject(new Error('Suppressed automatic storage request after failure'));
    }

    if (!opts?.userInitiated && !opts?.force && (now - _lastStorageAttemptTs) < STORAGE_SUPPRESSION_MS) {
        return Promise.reject(new Error('Suppressed automatic storage request to avoid retry storm'));
    }

    _lastStorageAttemptTs = now;

    _storageInFlight = (async () => {
        try {
            const base = getApiBaseUrl();
            const res = await fetch(`${base}api/system/get-root-path`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
            });
            if (!res.ok) throw new Error(`Failed to fetch storage: ${res.statusText}`);
            _suppressedAfterFailure = false;
            return await res.json();
        } catch (err) {
            _suppressedAfterFailure = true;
            throw err;
        } finally {
            _storageInFlight = null;
        }
    })();

    return _storageInFlight;
};