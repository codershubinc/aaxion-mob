import { API_ENDPOINTS, API_URLS } from '@/constants/apiConstants';
import { fetcher } from '@/utils/requestUtil';
import { useCallback, useEffect, useState } from 'react';

interface FileItem {
    is_dir: boolean;
    name: string;
    path: string;
    raw_path: string;
    size: number;
}

interface UseFileExplorerProps {
    currentPath: string;
    onNavigate: (path: string) => void;
    onRootDetected?: (rootPath: string) => void;
}

export const useFileExplorer = ({ currentPath, onNavigate, onRootDetected }: UseFileExplorerProps) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [rootPath, setRootPath] = useState<string | null>(null);
    const [currentDirName, setCurrentDirName] = useState<string>("");
    const [baseUri, setBaseUri] = useState<string>("");
    const [token, setToken] = useState<string>("");

    const loadFiles = useCallback(async () => {
        setLoading(true);
        try {
            let queryPath = currentPath;
            if (baseUri === "" || token === "") {
                const storedBaseUri = await API_URLS.getApiBaseUrl();
                const storedToken = await API_URLS.getApiToken();
                if (storedBaseUri) setBaseUri(storedBaseUri);
                if (storedToken) setToken(storedToken);

            }

            // 1. Root Path Logic
            // If we don't know the root yet, or if we are at generic "/", fetch system root first.
            if (currentPath === "/" || !rootPath) {
                // Only fetch root config if we haven't stored it yet
                if (!rootPath) {
                    const rootRes = await fetcher(API_ENDPOINTS.SYSTEM.GET_ROOT_PATH, "GET");
                    const serverRoot = rootRes.root_path;

                    setRootPath(serverRoot);
                    if (onRootDetected) onRootDetected(serverRoot);

                    // If user is at generic "/", redirect to actual server root
                    if (currentPath === "/") {
                        queryPath = serverRoot;
                        onNavigate(serverRoot);
                        return; // Stop here, the prop change will trigger re-fetch
                    }
                }
            }
            setCurrentDirName(queryPath === rootPath ? "Home" : queryPath.split('/').filter(Boolean).pop() || "");

            // 2. Fetch Directory Content
            const res = await fetcher(`${API_ENDPOINTS.FILES.VIEW_CONTENT}?dir=${queryPath}`, "GET");

            // 3. Sort: Folders First
            const sorted = Array.isArray(res) ? res.sort((a: FileItem, b: FileItem) => {
                if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
                return a.is_dir ? -1 : 1;
            }) : [];

            setFiles(sorted);

        } catch (error) {
            console.error("File fetch error:", error);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [currentPath, rootPath, onNavigate, onRootDetected]);

    // Trigger load when path changes
    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    return {
        files,
        loading,
        rootPath,
        refresh: loadFiles,
        currentDirName,
        baseUri,
        token
    };
};