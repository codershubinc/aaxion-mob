import { useCallback } from 'react';
import { createFolder, deleteFile, uploadFile } from '@/utils/file-fetcher';

export function useFileOperations() {
  const createNewFolder = useCallback(async (path: string, name: string) => {
    try {
      const fullPath = `${path}/${name}`.replace(/\/+/g, '/');
      const result = await createFolder(fullPath);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create folder');
    }
  }, []);

  const deleteFileOrFolder = useCallback(async (path: string) => {
    try {
      const result = await deleteFile(path);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete file');
    }
  }, []);

  const uploadNewFile = useCallback(async (
    destination: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (info: { progress: number; bytesSent: number; totalBytes: number; timestamp: number }) => void,
    onCancelRegister?: (cancelFn: () => void) => void
  ) => {
    try {
      const result = await uploadFile(destination, file, onProgress, onCancelRegister);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to upload file');
    }
  }, []);

  return {
    createFolder: createNewFolder,
    deleteFile: deleteFileOrFolder,
    uploadFile: uploadNewFile,
  };
}
