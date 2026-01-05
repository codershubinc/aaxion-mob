import { useState, useCallback } from 'react';

export function useFileNavigation(initialPath: string = '/') {
  const [state, setState] = useState({
    pathHistory: [initialPath],
    currentIndex: 0,
  });

  const navigateTo = useCallback((path: string) => {
    setState(prev => ({
      pathHistory: [...prev.pathHistory.slice(0, prev.currentIndex + 1), path],
      currentIndex: prev.currentIndex + 1,
    }));
  }, []);

  const goBack = useCallback(() => {
    let result: string | null = null;
    setState(prev => {
      if (prev.currentIndex > 0) {
        const newIndex = prev.currentIndex - 1;
        result = prev.pathHistory[newIndex];
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
    return result;
  }, []);

  const goForward = useCallback(() => {
    let result: string | null = null;
    setState(prev => {
      if (prev.currentIndex < prev.pathHistory.length - 1) {
        const newIndex = prev.currentIndex + 1;
        result = prev.pathHistory[newIndex];
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
    return result;
  }, []);

  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.pathHistory.length - 1;
  const currentPath = state.pathHistory[state.currentIndex] || initialPath;

  const goToParent = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
      navigateTo(parentPath);
      return parentPath;
    }
    return null;
  }, [currentPath, navigateTo]);

  return {
    pathHistory: state.pathHistory,
    currentPath,
    currentIndex: state.currentIndex,
    navigateTo,
    goBack,
    goForward,
    goToParent,
    canGoBack,
    canGoForward,
  };
}
