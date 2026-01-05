import { useState, useCallback } from 'react';

export function useFileNavigation(initialPath: string = '/') {
  const [pathHistory, setPathHistory] = useState<string[]>([initialPath]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const navigateTo = useCallback((path: string) => {
    setPathHistory(prev => {
      // Remove any forward history when navigating to a new path
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, path];
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return pathHistory[currentIndex - 1];
    }
    return null;
  }, [currentIndex, pathHistory]);

  const goForward = useCallback(() => {
    if (currentIndex < pathHistory.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return pathHistory[currentIndex + 1];
    }
    return null;
  }, [currentIndex, pathHistory]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pathHistory.length - 1;
  const currentPath = pathHistory[currentIndex] || initialPath;

  const goToParent = useCallback((currentPath: string) => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      const parentPath = '/' + parts.join('/');
      navigateTo(parentPath || '/');
      return parentPath || '/';
    }
    return null;
  }, [navigateTo]);

  return {
    pathHistory,
    currentPath,
    currentIndex,
    navigateTo,
    goBack,
    goForward,
    goToParent,
    canGoBack,
    canGoForward,
  };
}
