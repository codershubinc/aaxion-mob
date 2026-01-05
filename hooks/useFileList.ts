import { useState, useCallback } from 'react';
import { fetchFileList } from '@/utils/file-fetcher';

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: string;
}

export function useFileList(initialPath: string = '/') {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPath, setCurrentPath] = useState(initialPath);

  const fetchFiles = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFileList(path);
      setFiles(data);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch files'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    await fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  return {
    files,
    isLoading,
    error,
    currentPath,
    fetchFiles,
    refreshFiles,
  };
}
