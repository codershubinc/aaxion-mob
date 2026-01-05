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
    if (state.currentIndex > 0) {
      const newIndex = state.currentIndex - 1;
      setState(prev => ({
        ...prev,
        currentIndex: newIndex,
      }));
      return state.pathHistory[newIndex];
    }
    return null;
  }, [state.currentIndex, state.pathHistory]);

  const goForward = useCallback(() => {
    if (state.currentIndex < state.pathHistory.length - 1) {
      const newIndex = state.currentIndex + 1;
      setState(prev => ({
        ...prev,
        currentIndex: newIndex,
      }));
      return state.pathHistory[newIndex];
    }
    return null;
  }, [state.currentIndex, state.pathHistory]);

  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.pathHistory.length - 1;
  const currentPath = state.pathHistory[state.currentIndex] || initialPath;

  const goToParent = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      const parentPath = '/' + parts.join('/');
      navigateTo(parentPath || '/');
      return parentPath || '/';
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
