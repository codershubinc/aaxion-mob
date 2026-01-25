import { API_ENDPOINTS, API_URLS } from '@/constants/apiConstants';
import * as FileSystem from 'expo-file-system/legacy';
import { fetcher } from './requestUtil';

// Threshold: 90MB (Safe margin below Cloudflare's 100MB limit)
const MULTIPART_LIMIT = 90 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

type ProgressCallback = (progress: number, speed: string) => void;

// --- 1. The Chunked Logic (For Large Files) ---
const uploadChunked = async (
    uri: string,
    fileName: string,
    targetDir: string,
    totalSize: number,
    onProgress?: ProgressCallback
) => {
    console.log("File > 90MB. Using Chunked Upload to bypass Cloudflare limit.");
    const baseUrl = await API_URLS.getApiBaseUrl();
    const token = await API_URLS.getApiToken();

    // Get Blob Reference (Zero-Copy)
    const fileResponse = await fetch(uri);
    const fullFileBlob = await fileResponse.blob();
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

    // Start Session
    await fetcher(`${API_ENDPOINTS.FILES.UPLOAD_CHUNK_START}?filename=${encodeURIComponent(fileName)}`, "POST");

    let bytesUploaded = 0;

    for (let i = 0; i < totalChunks; i++) {
        const chunkStartTime = Date.now();
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);

        const chunkBlob = fullFileBlob.slice(start, end);
        const uploadUrl = `${baseUrl}${API_ENDPOINTS.FILES.UPLOAD_CHUNK}?filename=${encodeURIComponent(fileName)}&chunk_index=${i}`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: chunkBlob
        });

        if (!response.ok) throw new Error(`Chunk ${i} failed`);

        // Speed Calc
        const durationSec = (Date.now() - chunkStartTime) / 1000;
        const length = end - start;
        const speedMb = durationSec > 0 ? (length / durationSec) / (1024 * 1024) : 0;

        bytesUploaded += length;
        if (onProgress) onProgress(Math.round((bytesUploaded / totalSize) * 100), speedMb.toFixed(1) + " MB/s");
    }

    // Complete
    await fetcher(`${API_ENDPOINTS.FILES.UPLOAD_CHUNK_COMPLETE}?filename=${encodeURIComponent(fileName)}&dir=${encodeURIComponent(targetDir)}`, "POST");

    // Cleanup blob
    // @ts-ignore
    if (fullFileBlob.close) fullFileBlob.close();
};

// --- 2. The Native Multipart Logic (For Small Files) ---
const uploadMultipart = async (
    uri: string,
    fileName: string,
    mimeType: string,
    targetDir: string,
    onProgress?: ProgressCallback
) => {
    console.log("File < 90MB. Using Native Multipart Upload for max speed.");
    const baseUrl = await API_URLS.getApiBaseUrl();
    const token = await API_URLS.getApiToken();
    const uploadUrl = `${baseUrl}${API_ENDPOINTS.FILES.UPLOAD}?dir=${encodeURIComponent(targetDir)}`;
    const startTime = Date.now();

    const task = FileSystem.createUploadTask(
        uploadUrl,
        uri,
        {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: mimeType,
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        },
        (data) => {
            const { totalBytesSent, totalBytesExpectedToSend } = data;
            if (totalBytesExpectedToSend > 0 && onProgress) {
                const durationSec = (Date.now() - startTime) / 1000;
                const speedMb = durationSec > 0 ? (totalBytesSent / durationSec) / (1024 * 1024) : 0;
                onProgress(Math.round((totalBytesSent / totalBytesExpectedToSend) * 100), speedMb.toFixed(1) + " MB/s");
            }
        }
    );

    const result = await task.uploadAsync();
    if (!result || result.status >= 300) throw new Error(`Upload Failed: ${result?.status}`);
};
const checkIsLocalConnection = (url: string): boolean => {
    // Checks for standard private IP ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x, localhost
    const localPatterns = [
        /^http:\/\/192\.168\./,
        /^http:\/\/10\./,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^http:\/\/localhost/,
        /^http:\/\/127\.0\.0\.1/
    ];
    return localPatterns.some(pattern => pattern.test(url));
};
export const uploadFileSmart = async (
    originalUri: string,
    fileName: string,
    mimeType: string,
    targetDir: string,
    onProgress?: ProgressCallback
): Promise<void> => {
    let workingUri = originalUri;
    let cleanupNeeded = false;
    const baseUri = await API_URLS.getApiBaseUrl();
    let isLocalConnection = false;
    if (baseUri && checkIsLocalConnection(baseUri)) isLocalConnection = true;

    try {
        // Handle Content URI (Android)
        if (originalUri.startsWith('content://')) {
            const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const tempUri = `${FileSystem.cacheDirectory}${safeName}`;
            await FileSystem.copyAsync({ from: originalUri, to: tempUri });
            workingUri = tempUri;
            cleanupNeeded = true;
        }

        const fileInfo = await FileSystem.getInfoAsync(workingUri);
        if (!fileInfo.exists) throw new Error("File missing");

        // --- THE DECISION ---
        if (!isLocalConnection && fileInfo.size > MULTIPART_LIMIT) {
            // > 90MB? Use Chunking (Tunnel Safe)
            await uploadChunked(workingUri, fileName, targetDir, fileInfo.size, onProgress);
        } else {
            // < 90MB? Use Native (Fast)
            await uploadMultipart(workingUri, fileName, mimeType, targetDir, onProgress);
        }

    } catch (error) {
        throw error;
    } finally {
        if (cleanupNeeded) {
            FileSystem.deleteAsync(workingUri, { idempotent: true }).catch(() => { });
        }
    }
};