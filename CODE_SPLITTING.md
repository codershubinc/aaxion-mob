# Code Splitting Strategy

## Overview

This document outlines the code splitting strategy used in the Aaxion Mobile application. Code splitting is a technique to organize code into smaller, focused modules that handle specific concerns, making the codebase more maintainable, testable, and reusable.

## React Hooks Code Splitting Pattern

### Principle: Separation of Concerns

Instead of creating large, monolithic hooks that handle multiple responsibilities, we split functionality into smaller, focused hooks. Each hook has a single, well-defined purpose.

### Example: File Management Hooks

The file management functionality is split into three separate hooks:

#### 1. `useFileList` - Data Fetching and State Management

**Purpose:** Manages the state of file lists and handles fetching operations.

**Responsibilities:**
- Maintains file list state
- Handles loading states
- Manages error states
- Provides methods to fetch and refresh file lists

**Usage:**
```typescript
import { useFileList } from '@/hooks/useFileList';

function FileExplorer() {
  const { files, isLoading, error, currentPath, fetchFiles, refreshFiles } = useFileList('/');
  
  useEffect(() => {
    fetchFiles('/home/user/documents');
  }, []);
  
  return (
    <View>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {files.map(file => <FileItem key={file.path} file={file} />)}
    </View>
  );
}
```

#### 2. `useFileOperations` - File Manipulation

**Purpose:** Provides methods for performing operations on files and folders.

**Responsibilities:**
- Creating folders
- Deleting files/folders
- Uploading files

**Usage:**
```typescript
import { useFileOperations } from '@/hooks/useFileOperations';

function FileActions() {
  const { createFolder, deleteFile, uploadFile } = useFileOperations();
  
  const handleCreateFolder = async () => {
    try {
      await createFolder('/home/user/documents', 'New Folder');
      // Refresh file list
    } catch (error) {
      // Handle error
    }
  };
  
  return <Button onPress={handleCreateFolder}>Create Folder</Button>;
}
```

#### 3. `useFileNavigation` - Navigation Logic

**Purpose:** Manages navigation history and path tracking.

**Responsibilities:**
- Maintaining navigation history
- Providing back/forward navigation
- Managing current path state
- Parent directory navigation

**Usage:**
```typescript
import { useFileNavigation } from '@/hooks/useFileNavigation';

function NavigationBar() {
  const { currentPath, canGoBack, canGoForward, goBack, goForward, goToParent } = useFileNavigation('/');
  
  return (
    <View>
      <Button disabled={!canGoBack} onPress={goBack}>Back</Button>
      <Text>{currentPath}</Text>
      <Button disabled={!canGoForward} onPress={goForward}>Forward</Button>
      <Button onPress={goToParent}>Up</Button>
    </View>
  );
}
```

### Combining Hooks

These hooks can be used together in a component to provide complete file management functionality:

```typescript
import { useFileList } from '@/hooks/useFileList';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useFileNavigation } from '@/hooks/useFileNavigation';

function FileManager() {
  const { files, isLoading, error, fetchFiles, refreshFiles } = useFileList('/');
  const { createFolder, deleteFile, uploadFile } = useFileOperations();
  const { currentPath, navigateTo, goBack, canGoBack } = useFileNavigation('/');
  
  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);
  
  const handleFolderClick = (path: string) => {
    navigateTo(path);
  };
  
  const handleDelete = async (path: string) => {
    await deleteFile(path);
    await refreshFiles();
  };
  
  // Component rendering logic...
}
```

## Benefits of This Approach

### 1. **Maintainability**
- Each hook has a single responsibility
- Easier to locate and fix bugs
- Changes to one concern don't affect others

### 2. **Reusability**
- Hooks can be used independently in different components
- No need to import unused functionality
- Promotes DRY (Don't Repeat Yourself) principle

### 3. **Testability**
- Each hook can be tested in isolation
- Simpler test cases focused on specific functionality
- Easier to mock dependencies

### 4. **Type Safety**
- Clear interfaces for each hook
- Better TypeScript inference
- Reduced complexity in type definitions

### 5. **Performance**
- Only re-render when specific state changes
- Better optimization opportunities
- Easier to identify performance bottlenecks

## Best Practices

1. **Single Responsibility:** Each hook should handle one aspect of functionality
2. **Clear Naming:** Use descriptive names that indicate the hook's purpose (e.g., `useFileList`, not `useFiles`)
3. **Consistent Interface:** Return objects with clear, predictable properties
4. **Error Handling:** Each hook should handle its own errors appropriately
5. **Dependencies:** Keep dependencies minimal and explicit in useCallback/useEffect
6. **Documentation:** Include JSDoc comments explaining the hook's purpose and usage

## When to Split Code

Consider splitting a hook when:
- It handles multiple unrelated concerns
- It has more than 100 lines of code
- Different parts of the hook are used independently
- Testing becomes complex due to multiple responsibilities
- The hook has many dependencies or parameters

## Related Patterns

- **Custom Hooks:** All split hooks follow React's custom hooks pattern
- **Composition:** Hooks are designed to be composed together
- **Single Responsibility Principle:** From SOLID design principles
- **Facade Pattern:** Higher-level components can provide simpler interfaces combining multiple hooks

## References

- [React Hooks Documentation](https://react.dev/reference/react)
- [Building Your Own Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [TypeScript with React Hooks](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks)
