import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mocks for components if you don't have them, replace with your actual imports
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ConfirmModal from '@/components/ConfirmModal';
import config, { getApiBaseUrl, setApiBaseUrl, testApiBaseUrl } from '@/utils/config';
import { reportError } from '@/utils/error-handler';
import { createFile, createFolder, deleteFile, fetchFileList, getDownloadUrl, getSystemStorage, uploadFile } from '@/utils/file-fetcher';
import { formatSize, getDirName, getFileIcon, sortFiles } from '@/utils/file-utils';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Breakpoints
  const IS_TABLET = SCREEN_WIDTH >= 768;
  const IS_DESKTOP = SCREEN_WIDTH >= 1024;

  // Dynamic Drawer/Sidebar logic
  const SIDEBAR_WIDTH = 280;
  const SHOW_SIDEBAR_PERMANENTLY = SCREEN_WIDTH >= 1100;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // App icon (use removebg variant everywhere)
  const APP_ICON = require('@/assets/images/icons/Gemini_Generated_Image_hpml0shpml0shpml-removebg-preview.png');


  // --- State ---
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // System storage state
  const [storageInfo, setStorageInfo] = useState<any | null>(null);
  const [storageLoading, setStorageLoading] = useState<boolean>(false);
  const [storageError, setStorageError] = useState<any>(null);

  // Upload State
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null); // bytes/sec
  const [uploadETA, setUploadETA] = useState<number | null>(null); // seconds
  const [uploadBytesSent, setUploadBytesSent] = useState<number | null>(null);
  const [uploadTotalBytes, setUploadTotalBytes] = useState<number | null>(null);
  const [multiUploadTotal, setMultiUploadTotal] = useState<number | null>(null);
  const [multiUploadIndex, setMultiUploadIndex] = useState<number | null>(null);

  // Selection State for multi-select delete (files only)
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string | undefined>(undefined);
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(undefined);
  const confirmResolveRef = useRef<(confirmed: boolean) => void | null>(null);

  const showConfirm = (opts: { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; }) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = (confirmed: boolean) => { resolve(confirmed); };
      setConfirmTitle(opts.title);
      setConfirmMessage(opts.message);
      setConfirmVisible(true);
    });
  };

  const handleConfirm = (val: boolean) => {
    setConfirmVisible(false);
    try { confirmResolveRef.current?.(val); } catch { /* ignore */ }
    confirmResolveRef.current = null;
  };
  // View State
  const [gridView, setGridView] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'photos' | 'folders'>('files');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDir, setCurrentDir] = useState("/home/swap/aaxion/");
  const [history, setHistory] = useState<string[]>([]);

  // Navigation / Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTranslateX = useSharedValue(-SIDEBAR_WIDTH);

  // Action Sheet
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const actionSheetTranslateY = useSharedValue(400);

  // Modals & Prompts
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptValue, setPromptValue] = useState("");
  const [promptPlaceholder, setPromptPlaceholder] = useState("");
  const [promptType, setPromptType] = useState<'folder' | 'file' | 'content'>('folder');

  // Settings modal
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [apiEndpointInput, setApiEndpointInput] = useState('');
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [savingEndpoint, setSavingEndpoint] = useState(false);

  // Preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const baseScaleRef = useRef<number>(1);



  // Refs
  const uploadCancelRef = useRef<(() => void) | null>(null);

  // --- Calculations ---

  // Calculate columns dynamically
  const flatListNumColumns = useMemo(() => {
    if (!gridView) return 1;
    if (IS_DESKTOP) return 6;
    if (IS_TABLET) return 4;
    return 2;
  }, [gridView, IS_DESKTOP, IS_TABLET]);

  // Filter Files
  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];

    if (activeTab === 'photos') {
      return result.filter(f => !f.is_dir && imageExts.includes((f.name.split('.').pop() || '').toLowerCase()));
    }
    if (activeTab === 'folders') {
      return result.filter(f => f.is_dir);
    }
    return result;
  }, [files, searchQuery, activeTab]);

  // --- Animations ---

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(drawerOpen ? 1 : 0, { duration: 250 }),
    pointerEvents: drawerOpen ? 'auto' : 'none',
  }));

  const actionSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: actionSheetTranslateY.value }],
  }));

  const actionSheetBackdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(actionSheetVisible ? 1 : 0, { duration: 200 }),
    pointerEvents: actionSheetVisible ? 'auto' : 'none',
  }));

  const progressScale = useSharedValue(0);
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressScale.value * 100}%`,
  }));

  // --- Actions ---

  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => {
      const nextState = !prev;
      drawerTranslateX.value = withTiming(nextState ? 0 : -SIDEBAR_WIDTH, { duration: 250 });
      if (nextState) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return nextState;
    });
  }, [drawerTranslateX]);

  const toggleActionSheet = (item?: any) => {
    if (item) setSelectedItem(item);
    const nextState = !actionSheetVisible;
    setActionSheetVisible(nextState);
    actionSheetTranslateY.value = withTiming(nextState ? 0 : 400, { duration: 250 });
    if (nextState) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const enterSelectionMode = (path: string) => {
    setSelectionMode(true);
    setSelectedPaths([path]);
    Haptics.selectionAsync();
  };

  const toggleSelectPath = (path: string) => {
    setSelectedPaths(prev => {
      if (prev.includes(path)) {
        const next = prev.filter(p => p !== path);
        if (next.length === 0) setSelectionMode(false);
        return next;
      }
      return [...prev, path];
    });
    Haptics.selectionAsync();
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedPaths([]);
  };

  const handleLongPress = (item: any) => {
    // Only start selection mode for files (not folders)
    if (item.is_dir) {
      toggleActionSheet(item);
      return;
    }
    if (!selectionMode) enterSelectionMode(item.raw_path);
    else toggleSelectPath(item.raw_path);
  };

  const deleteSelected = async () => {
    if (selectedPaths.length === 0) return;
const confirmed = await showConfirm({ title: `Delete ${selectedPaths.length} file(s)?`, message: `This will permanently delete ${selectedPaths.length} file(s).`, confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true });
      if (!confirmed) return;
      try {
        setDeleting(true);
        // Delete sequentially to avoid overwhelming server, but could use Promise.all
        for (const p of selectedPaths) {
          await deleteFile(p);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearSelection();
        fetchFiles(currentDir);
      } catch (err) {
        console.error('Batch delete failed', err);
        Alert.alert('Error', 'Failed to delete selected files');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setDeleting(false);
      }
    };

  const fetchFiles = useCallback(async (dir: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await fetchFileList(dir);
      setFiles(sortFiles(data));
    } catch (error) {
      console.error(error);
      // Show global error with retry
      try {
        reportError(error, `Failed to fetch files for "${dir}"`, { retry: () => fetchFiles(dir, isRefresh) });
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentDir);
  }, [currentDir, fetchFiles]);

  // Handle Android hardware back button: go to parent or previous folder when possible

  const goBack = useCallback(() => {
    if (history.length > 0) {
      Haptics.selectionAsync();
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrentDir(prev);
    } else if (currentDir !== "/home/swap/aaxion/") {
      Haptics.selectionAsync();
      const parts = currentDir.split('/').filter(Boolean);
      parts.pop();
      const parent = '/' + parts.join('/') + '/';
      setCurrentDir(parent);
    }
    setSearchQuery("");
  }, [history, currentDir]);

  useEffect(() => {
    const onBackPress = () => {
      // If drawer is open, close it first
      if (drawerOpen) { toggleDrawer(); return true; }
      // If selection mode active, clear it
      if (selectionMode) { clearSelection(); return true; }
      // If any modal/prompt open, close it
      if (promptVisible) { setPromptVisible(false); return true; }
      // If history exists, go back
      if (history.length > 0) { goBack(); return true; }
      // Not handled, let OS handle (exit app)
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [drawerOpen, selectionMode, promptVisible, history, currentDir, goBack, toggleDrawer]);

  // Fetch system storage info
  // Adds a simple rate-limit to avoid repeated automatic retries. Pass force=true to bypass the limiter.
  const lastStorageFetchRef = useRef<number | null>(null);
  const fetchStorage = useCallback(async (mount: string = '/', force = false) => {
    const now = Date.now();
    const MIN_INTERVAL = 10_000; // 10 seconds minimum between automatic attempts
    if (!force && lastStorageFetchRef.current && (now - lastStorageFetchRef.current) < MIN_INTERVAL) {
      // Skip frequent retry attempt
      return;
    }
    lastStorageFetchRef.current = now;

    try {
      setStorageLoading(true);
      setStorageError(null);
      const info = await getSystemStorage(mount);
      // Normalize: some APIs return { data: { ... } }, others return the object directly
      const normalized = info && typeof info === 'object' && 'data' in info ? (info as any).data : info;
      setStorageInfo(normalized ?? null);
    } catch (err) {
      console.error('Failed to fetch storage info:', err);
      setStorageError(err);
      setStorageInfo(null);
      try {
        reportError(err, `Failed to fetch system storage for mount "${mount}"`, { retry: () => fetchStorage(mount, true) });
      } catch {
        // ignore
      }
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load once on mount (force bypass rate limiter)
    fetchStorage('/', true);
  }, [fetchStorage]);

  // Safe derived storage numbers for rendering
  const storageTotal = storageInfo ? Number(storageInfo.total_bytes ?? storageInfo.total ?? 0) : 0;
  const storageUsed = storageInfo ? Number(storageInfo.used_bytes ?? storageInfo.used ?? 0) : 0;
  const storageFree = storageInfo ? Number(storageInfo.free_bytes ?? storageInfo.free ?? (storageTotal - storageUsed)) : 0;
  const storagePercent = storageInfo ? Number(storageInfo.used_percent ?? (storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0)) : 0;
  const storagePercentRounded = Number.isFinite(storagePercent) ? Math.round(storagePercent) : 0;

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Ensure spinner shows immediately
    setRefreshing(true);
    try {
      await fetchFiles(currentDir, true);
    } catch {
      // fetchFiles will report any errors via global handler; swallow here to avoid double alerts
    } finally {
      setRefreshing(false);
    }
  }, [currentDir, fetchFiles]);

  const navigateToDir = (path: string) => {
    Haptics.selectionAsync();
    const newPath = path.endsWith('/') ? path : path + "/";
    setHistory(prev => [...prev, currentDir]);
    setCurrentDir(newPath);
    setSearchQuery("");
  };



  const goHome = () => {
    if (currentDir === "/home/swap/aaxion/") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHistory(prev => [...prev, currentDir]);
    setCurrentDir("/home/swap/aaxion/");
    setSearchQuery("");
  };

  // --- Upload Logic (Condensed for brevity, same logic as before) ---
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      const assets = (result as any).assets ?? ((result as any).uri ? [result] : []);

      setMultiUploadTotal(assets.length);

      let uploadErrored = false;
      for (let i = 0; i < assets.length; i++) {
        const file = assets[i];
        setMultiUploadIndex(i + 1);
        setUploadFileName(file.name);
        setUploadStatus('uploading');

        // Reset per-file metrics
        setUploadProgress(0);
        setUploadSpeed(null);
        setUploadETA(null);
        setUploadBytesSent(null);
        setUploadTotalBytes(null);
        const start = Date.now();
        progressScale.value = 0;

        // register cancel handler for this upload
        uploadCancelRef.current = null;

        try {
          await uploadFile(currentDir, {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          }, (info) => {
            // info: { progress, bytesSent, totalBytes, timestamp }
            setUploadProgress(info.progress);
            setUploadBytesSent(info.bytesSent);
            setUploadTotalBytes(info.totalBytes ?? null);

            const elapsedSec = Math.max(0.001, (Date.now() - start) / 1000);
            const speed = info.bytesSent / elapsedSec; // bytes/sec
            setUploadSpeed(speed);

            if (info.totalBytes && speed > 0) {
              const etaSec = Math.max(0, (info.totalBytes - info.bytesSent) / speed);
              setUploadETA(etaSec);
            } else {
              setUploadETA(null);
            }

            progressScale.value = withTiming(info.progress, { duration: 100 });
          }, (cancelFn) => {
            uploadCancelRef.current = cancelFn;
          });

          // Completed this file successfully - mark success briefly
          setUploadStatus('success');
          setTimeout(() => setUploadStatus('idle'), 1500);
        } catch (err: any) {
          // Stop further uploads and surface error
          console.error('Upload error:', err);
          uploadErrored = true;
          const message = err?.message || String(err) || 'Upload failed';
          setUploadStatus('error');
          setUploadProgress(0);
          progressScale.value = withTiming(0);
          setUploadFileName(null);
          setMultiUploadTotal(null);
          setMultiUploadIndex(null);
          // show an alert with the exact error
          Alert.alert('Upload error', message);
          // break the loop to terminate remaining uploads
          break;
        }
      }

      if (!uploadErrored) {
        // Completed all uploads
        setMultiUploadTotal(null);
        setMultiUploadIndex(null);
        fetchFiles(currentDir); // Refresh the file list after uploads
      } else {
        // Ensure we reset selection and indicators after an error
        setMultiUploadTotal(null);
        setMultiUploadIndex(null);
      }

      setMultiUploadTotal(null);
      setMultiUploadIndex(null);
      fetchFiles(currentDir); // Refresh the file list after uploads
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadProgress(0);
      progressScale.value = withTiming(0);
      setUploadFileName(null);
      setMultiUploadTotal(null);
      setMultiUploadIndex(null);
      Alert.alert('Upload error', (error as any)?.message || String(error));
      setTimeout(() => setUploadStatus('idle'), 2000);
    }
  };

  const handleCreateFolder = () => {
    setPromptTitle("New Folder");
    setPromptPlaceholder("Folder Name");
    setPromptValue("");
    setPromptType('folder');
    setPromptVisible(true);
  };

  const handleCreateFile = () => {
    setPromptTitle("New File");
    setPromptPlaceholder("File Name");
    setPromptValue("");
    setPromptType('file');
    setPromptVisible(true);
  };

  const onPromptSubmit = async () => {
    if (!promptValue.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    try {
      if (promptType === 'folder') {
        await createFolder(currentDir + promptValue.trim());
      } else if (promptType === 'file') {
        await createFile(currentDir + promptValue.trim(), "");
      }
      fetchFiles(currentDir);
      setPromptVisible(false);
      setPromptValue("");
    } catch (error) {
      console.error('Create error:', error);
      Alert.alert("Error", "Failed to create item");
    }
  };

  const handleDelete = (item: any) => {
    (async () => {
      const confirmed = await showConfirm({ title: 'Delete', message: `Delete ${item.name}?`, confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true });
      if (!confirmed) return;
      try {
        await deleteFile(item.raw_path);
        fetchFiles(currentDir);
      } catch (err) {
        console.error('Delete failed', err);
        Alert.alert('Error', 'Failed to delete item');
      }
    })();
  };

  const handleDownload = async (item: any) => {
    const url = getDownloadUrl(item.raw_path);
    Linking.openURL(url);
  };

  // --- Zoom Handlers ---
  const onPinchEvent = (e: any) => {
    if (e.nativeEvent.scale) {
      setZoomScale(Math.max(1, Math.min(4, baseScaleRef.current * e.nativeEvent.scale)));
    }
  };
  const onPinchStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      baseScaleRef.current = zoomScale;
    }
  };

  // --- Render Components ---

  const renderSidebar = () => {
    return (
      <View style={[styles.sidebar, { width: SIDEBAR_WIDTH, backgroundColor: theme.surface, borderRightColor: theme.border }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.drawerHeader}>
            <View style={[styles.drawerLogo, { backgroundColor: 'transparent', borderRadius: 12, overflow: 'hidden' }]}>
              <Image source={APP_ICON} style={{ width: 44, height: 44, resizeMode: 'contain', backgroundColor: 'transparent', borderRadius: 10 }} />
            </View>

            <View style={{ marginLeft: 12 }}>
              <ThemedText type="subtitle" style={styles.drawerTitle}>Aaxion Cloud</ThemedText>
              <ThemedText style={styles.drawerSubtitle}>Swapnil Ingle</ThemedText>
            </View>
          </View>

          <ScrollView style={styles.drawerContent} contentContainerStyle={{ padding: 12 }}>
            <ThemedText style={styles.sectionHeader}>LOCATIONS</ThemedText>
            <TouchableOpacity style={[styles.drawerItem, currentDir.includes('/aaxion/') && !currentDir.includes('Downloads') && !currentDir.includes('Documents') && styles.drawerItemActive, { backgroundColor: currentDir === '/home/swap/aaxion/' ? theme.tint + '15' : 'transparent' }]} onPress={() => { goHome(); if (!SHOW_SIDEBAR_PERMANENTLY) toggleDrawer(); }}>
              <MaterialCommunityIcons name="home-variant-outline" size={22} color={currentDir === '/home/swap/aaxion/' ? theme.tint : theme.icon} />
              <ThemedText style={[styles.drawerItemText, currentDir === '/home/swap/aaxion/' && { color: theme.tint, fontWeight: '700' }]}>Home</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => { navigateToDir("/home/swap/aaxion/Downloads/"); if (!SHOW_SIDEBAR_PERMANENTLY) toggleDrawer(); }}>
              <MaterialCommunityIcons name="download-outline" size={22} color={theme.icon} />
              <ThemedText style={styles.drawerItemText}>Downloads</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => { navigateToDir("/home/swap/aaxion/Documents/"); if (!SHOW_SIDEBAR_PERMANENTLY) toggleDrawer(); }}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={theme.icon} />
              <ThemedText style={styles.drawerItemText}>Documents</ThemedText>
            </TouchableOpacity>

            <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />

            <ThemedText style={styles.sectionHeader}>APP</ThemedText>
            <TouchableOpacity style={styles.drawerItem} onPress={() => {
              // Open settings modal
              setApiEndpointInput(getApiBaseUrl());
              setSettingsVisible(true);
            }}>

              <MaterialCommunityIcons name="cog-outline" size={22} color={theme.icon} />
              <ThemedText style={styles.drawerItemText}>Settings</ThemedText>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.drawerFooter}>
            {storageLoading ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : storageError ? (
              <View style={{ alignItems: 'center' }}>
                <ThemedText style={[styles.storageText, { marginBottom: 8, textAlign: 'center' }]}>Failed to load storage</ThemedText>
                <TouchableOpacity
                  onPress={() => fetchStorage('/', true)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}
                  accessibilityLabel="Retry loading storage info"
                  disabled={storageLoading}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color={theme.icon} />
                  <ThemedText style={{ marginLeft: 8, fontSize: 13 }}>Retry</ThemedText>
                </TouchableOpacity>
              </View>
            ) : storageInfo ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemedText style={styles.storageText}>{storagePercentRounded}% Used of {formatSize(storageTotal)}</ThemedText>
                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => fetchStorage('/', true)}
                    accessibilityLabel="Refresh storage info"
                    disabled={storageLoading}
                  >
                    {storageLoading ? (
                      <ActivityIndicator size="small" color={theme.tint} />
                    ) : (
                      <MaterialCommunityIcons name="refresh" size={18} color={theme.icon} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={[styles.storageBarBg, { backgroundColor: theme.border, marginTop: 8 }]}>
                  <View style={[styles.storageBarFill, { backgroundColor: theme.tint, width: `${storagePercentRounded}%` }]} />
                </View>
                <ThemedText style={[styles.storageText, { fontSize: 11, marginTop: 8 }]}>{formatSize(storageUsed)} used • {formatSize(storageFree)} free</ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.storageText}>No storage info</ThemedText>
                {storageError && (
                  <ThemedText style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{(storageError as any)?.message ?? String(storageError)}</ThemedText>
                )}
              </>
            )}


          </View>
        </SafeAreaView>
      </View>
    );
  };

  const renderFileItem = ({ item, index }: { item: any, index: number }) => {
    const icon = getFileIcon(item, colorScheme);
    const isImage = !item.is_dir && ['jpg', 'png', 'jpeg', 'webp'].includes(item.name.split('.').pop()?.toLowerCase() || '');

    // Grid View
    if (gridView) {
      // Build icon element to avoid nested ternaries in JSX (fix parsing edge-cases)
      let iconElement: any = null;
      const iconBg = (icon && (icon.type === 'image' || icon.type === 'component')) ? 'transparent' : theme.background;
      if (isImage) {
        iconElement = <Image source={{ uri: getDownloadUrl(item.raw_path) }} style={[styles.gridThumbnail, { backgroundColor: 'transparent' }]} resizeMode="contain" />;
      } else if (icon && icon.type === 'image') {
        iconElement = (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Image source={(icon as any).uri as any} style={[styles.gridThumbnail, { backgroundColor: 'transparent' }]} resizeMode="contain" />
            {(icon as any).overlayImage && (
              <Image source={(icon as any).overlayImage as any} style={{ position: 'absolute', right: 6, bottom: 6, width: 18, height: 18, backgroundColor: 'transparent' }} />
            )}
          </View>
        );
      } else if (icon && icon.type === 'component') {
        const Comp = icon.Component as any;
        iconElement = (
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
            <Comp size={44} />
            {(icon as any).overlayImage && (
              <Image source={(icon as any).overlayImage as any} style={{ position: 'absolute', right: 6, bottom: 6, width: 18, height: 18, backgroundColor: 'transparent' }} />
            )}
          </View>
        );
      } else if (icon && icon.type === 'mc-composite') {
        iconElement = (
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name={icon.base as any} size={32} color={icon.color} />
            <MaterialCommunityIcons name={icon.overlay as any} size={12} color={icon.color} style={{ position: 'absolute', right: 8, bottom: 8 }} />
          </View>
        );
      } else {
        iconElement = <MaterialCommunityIcons name={icon?.name as any} size={32} color={icon?.color} />;
      }

      return (
        <AnimatedTouchableOpacity
          entering={FadeInRight.delay(index * 15).springify()}
          style={[styles.gridItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => selectionMode ? toggleSelectPath(item.raw_path) : (item.is_dir ? navigateToDir(item.raw_path) : toggleActionSheet(item))}
          onLongPress={() => handleLongPress(item)}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: iconBg }]}>
            {iconElement}
          </View>

          {selectionMode && !item.is_dir && selectedPaths.includes(item.raw_path) && (
            <View style={{ position: 'absolute', right: 12, top: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.tint, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="check" size={14} color="#FFF" />
            </View>
          )}

          <ThemedText numberOfLines={1} style={styles.gridName}>{item.name}</ThemedText>
          <ThemedText style={styles.metaText}>{item.is_dir ? 'Folder' : formatSize(item.size)}</ThemedText>
        </AnimatedTouchableOpacity>
      );
    }

    // List View
    return (
      <AnimatedTouchableOpacity
        entering={FadeInRight.delay(index * 20).duration(200)}
        style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => selectionMode ? (item.is_dir ? null : toggleSelectPath(item.raw_path)) : (item.is_dir ? navigateToDir(item.raw_path) : toggleActionSheet(item))}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={[styles.listIconContainer, { backgroundColor: (icon && (icon.type === 'image' || icon.type === 'component')) ? 'transparent' : theme.background }]}>
          {isImage ? (
            <Image source={{ uri: getDownloadUrl(item.raw_path) }} style={styles.listThumbnail} />
          ) : (icon && icon.type === 'image') ? (
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image source={(icon as any).uri as any} style={[styles.listThumbnail, { backgroundColor: 'transparent' }]} resizeMode="contain" />
              {icon.overlayImage && (
                <Image source={icon.overlayImage as any} style={{ position: 'absolute', right: 2, bottom: 2, width: 14, height: 14 }} />
              )}
            </View>
          ) : (() => {
            if (icon && icon.type === 'component') {
              const Comp = icon.Component as any;
              return (
                <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <Comp size={20} />
                  {icon.overlayImage && (
                    <Image source={icon.overlayImage as any} style={{ position: 'absolute', right: 2, bottom: 2, width: 14, height: 14 }} />
                  )}
                </View>
              );
            }
            if (icon && icon.type === 'mc-composite') {
              return (
                <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={icon.base as any} size={20} color={icon.color} />
                  <MaterialCommunityIcons name={icon.overlay as any} size={10} color={icon.color} style={{ position: 'absolute', right: 6, bottom: 6 }} />
                </View>
              );
            }
            return <MaterialCommunityIcons name={icon?.name as any} size={24} color={icon?.color} />;
          })()}
        </View>

        {/* Selection overlay for list items */}
        {selectionMode && !item.is_dir && selectedPaths.includes(item.raw_path) && (
          <View style={{ position: 'absolute', right: 6, top: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.tint, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check" size={14} color="#FFF" />
          </View>
        )}

        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.name}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <ThemedText style={styles.metaText}>{item.is_dir ? 'Folder' : formatSize(item.size)}</ThemedText>
            {!item.is_dir && <ThemedText style={styles.metaText}> • {new Date().toLocaleDateString()}</ThemedText>}
          </View>
        </View>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => toggleActionSheet(item)}>
          <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.icon} />
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
    );
  };

  const formatSpeed = (bytesPerSec: number | null) => {
    if (!bytesPerSec || !Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '—';
    const mbps = bytesPerSec / (1024 * 1024);
    if (mbps >= 1) return `${mbps.toFixed(2)} MB/s`;
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  };

  const formatETA = (seconds: number | null) => {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>

        {/* --- Layout Wrapper --- */}
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* 1. Sidebar (Permanent on Desktop/Wide Tablet) */}
          {SHOW_SIDEBAR_PERMANENTLY && renderSidebar()}

          {/* 1b. Drawer (Overlay on Mobile) */}
          {!SHOW_SIDEBAR_PERMANENTLY && (
            <>
              <Animated.View style={[styles.drawerBackdrop, backdropStyle]}>
                <Pressable style={{ flex: 1 }} onPress={toggleDrawer} />
              </Animated.View>
              <Animated.View style={[styles.drawerOverlay, { width: SIDEBAR_WIDTH }, drawerStyle]}>
                {renderSidebar()}
              </Animated.View>
            </>
          )}

          {/* 2. Main Content Area */}
          <PanGestureHandler
            // Only activate for notable horizontal movement so vertical pull-to-refresh isn't intercepted
            activeOffsetX={[-20, 20]}
            onHandlerStateChange={(e: any) => {
              if (e.nativeEvent.state === State.END) {
                const tx = e.nativeEvent.translationX;
                const ty = e.nativeEvent.translationY;
                // Detect right-swipe with sufficient horizontal movement and low vertical drift
                if (tx > 80 && Math.abs(ty) < 80) {
                  if (history.length > 0) goBack();
                }
              }
            }}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerTop}>
                  {!SHOW_SIDEBAR_PERMANENTLY && (
                    <TouchableOpacity onPress={toggleDrawer} style={[styles.iconButton, { backgroundColor: theme.surface, marginRight: 8 }]}>
                      <MaterialCommunityIcons name="menu" size={22} color={theme.text} />
                    </TouchableOpacity>
                  )}

                  {/* Search Bar */}
                  <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={theme.icon} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.text }]}
                      placeholder="Search files..."
                      placeholderTextColor={theme.icon}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={theme.icon} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Grid/List Toggle */}
                  <TouchableOpacity
                    onPress={() => setGridView(!gridView)}
                    style={[styles.iconButton, { backgroundColor: theme.surface, marginLeft: 8 }]}
                  >
                    <MaterialCommunityIcons name={gridView ? "view-list" : "view-grid"} size={22} color={theme.text} />
                  </TouchableOpacity>

                  {/* Pull-to-refresh indicator */}
                  {refreshing && (
                    <View style={{ marginLeft: 8 }}>
                      <ActivityIndicator size="small" color={theme.tint} />
                    </View>
                  )}
                </View>

                {/* Breadcrumb / Path & Controls */}
                <View style={styles.headerBottom}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    {currentDir !== "/home/swap/aaxion/" && (
                      <TouchableOpacity onPress={goBack} style={{ marginRight: 8 }}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
                      </TouchableOpacity>
                    )}
                    <ThemedText type="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                      {getDirName(currentDir) || 'Home'}
                    </ThemedText>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
                    {['files', 'photos', 'folders'].map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab as any)}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: activeTab === tab ? theme.tint : theme.surface,
                            borderColor: activeTab === tab ? theme.tint : theme.border
                          }
                        ]}
                      >
                        <ThemedText style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#FFF' : theme.text }}>
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* File List */}
              {loading && !refreshing ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="large" color={theme.tint} />
                  <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Loading files...</ThemedText>
                </View>
              ) : (
                <FlatList
                  key={gridView ? `grid-${flatListNumColumns}` : 'list'}
                  data={filteredFiles}
                  renderItem={renderFileItem}
                  keyExtractor={item => item.raw_path}
                  numColumns={flatListNumColumns}
                  columnWrapperStyle={gridView ? { gap: 12 } : undefined}
                  contentContainerStyle={{
                    padding: 16,
                    gap: 12,
                    paddingBottom: 100, // Space for floating bar
                    flexGrow: 1
                  }}
                  alwaysBounceVertical={true}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} colors={[theme.tint]} progressBackgroundColor={theme.surface} />
                  }
                  ListEmptyComponent={
                    <View style={styles.centerState}>
                      <MaterialCommunityIcons name="folder-open-outline" size={64} color={theme.icon} style={{ opacity: 0.3 }} />
                      <ThemedText style={{ marginTop: 12, opacity: 0.5 }}>No files found</ThemedText>
                    </View>
                  }
                />
              )}

              {/* Floating Upload Status Toast */}
              {uploadStatus !== 'idle' && (
                <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={[styles.statusToast, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={[styles.statusIcon, { backgroundColor: uploadStatus === 'success' ? theme.success : uploadStatus === 'error' ? theme.error : theme.tint }]}>
                      <MaterialCommunityIcons name={uploadStatus === 'success' ? "check" : uploadStatus === 'error' ? "alert-circle" : "cloud-upload"} size={16} color="#FFF" />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                        {uploadStatus === 'success' ? 'Upload Complete' : uploadStatus === 'error' ? 'Upload Failed' : multiUploadTotal && multiUploadTotal > 1 ? `Uploading (${multiUploadIndex} of ${multiUploadTotal})` : 'Uploading...'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, opacity: 0.6 }} numberOfLines={1}>{uploadFileName}</ThemedText>
                      {uploadStatus === 'uploading' && (
                        <>
                          <ThemedText style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>{(uploadProgress * 100).toFixed(1)}% • {formatSpeed(uploadSpeed)} • {formatETA(uploadETA)}</ThemedText>
                          <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>{formatSize(uploadBytesSent ?? 0)} / {uploadTotalBytes ? formatSize(uploadTotalBytes) : '—'}</ThemedText>
                        </>
                      )}
                    </View>

                    {/* Cancel Upload Button */}
                    {uploadStatus === 'uploading' && (
                      <TouchableOpacity onPress={() => {
                        if (uploadCancelRef.current) {
                          uploadCancelRef.current();
                          Alert.alert('Upload cancelled', 'You cancelled the upload');
                        }
                      }} style={{ padding: 6 }}>
                        <MaterialCommunityIcons name="close" size={18} color={theme.icon} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {uploadStatus === 'uploading' && (
                    <View style={{ height: 8, backgroundColor: theme.background, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                      <Animated.View style={[{ height: '100%', backgroundColor: theme.tint }, progressAnimatedStyle]} />
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Floating Bottom Action Bar */}
              <View style={[styles.bottomBarContainer]}>
                {selectionMode ? (
                  <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.bottomBtn} onPress={clearSelection} disabled={deleting}>
                      <MaterialCommunityIcons name="close" size={20} color={theme.text} />
                      <ThemedText style={{ marginLeft: 6 }}>Cancel</ThemedText>
                    </TouchableOpacity>

                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{selectedPaths.length} selected</ThemedText>
                    </View>

                    <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: deleting ? theme.border : theme.error + '20' }]} onPress={deleteSelected} disabled={deleting || selectedPaths.length === 0}>
                      {deleting ? <ActivityIndicator color={theme.error} /> : <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.error} />}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.bottomBtn} onPress={handleCreateFolder}>
                      <MaterialCommunityIcons name="folder-plus-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View style={{ width: 1, height: 24, backgroundColor: theme.border }} />
                    <TouchableOpacity style={styles.bottomBtn} onPress={handleCreateFile}>
                      <MaterialCommunityIcons name="file-plus-outline" size={24} color={theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.fab} onPress={handleUpload}>
                      <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </SafeAreaView>
          </PanGestureHandler>
        </View>

        {/* --- Modals & Overlays --- */}

        {/* Action Sheet */}
        <Animated.View style={[styles.actionSheetBackdrop, actionSheetBackdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={() => toggleActionSheet()} />
        </Animated.View>
        <Animated.View style={[styles.actionSheet, { backgroundColor: theme.surface }, actionSheetStyle]}>
          <View style={{ alignItems: 'center', padding: 10 }}>
            <View style={{ width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2 }} />
          </View>
          <View style={{ padding: 20 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 20, textAlign: 'center' }}>
              {selectedItem?.name}
            </ThemedText>

            {!selectedItem?.is_dir && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background }]} onPress={() => { toggleActionSheet(); setPreviewVisible(true); setPreviewUri(getDownloadUrl(selectedItem.raw_path)); }}>
                <MaterialCommunityIcons name="eye-outline" size={22} color={theme.text} />
                <ThemedText style={styles.actionBtnText}>Preview</ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background }]} onPress={() => { toggleActionSheet(); handleDownload(selectedItem); }}>
              <MaterialCommunityIcons name="download-outline" size={22} color={theme.text} />
              <ThemedText style={styles.actionBtnText}>Download</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.error + '20' }]} onPress={() => { toggleActionSheet(); handleDelete(selectedItem); }}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.error} />
              <ThemedText style={[styles.actionBtnText, { color: theme.error }]}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Confirm Modal */}
        <ConfirmModal visible={confirmVisible} title={confirmTitle} message={confirmMessage} onConfirm={() => handleConfirm(true)} onCancel={() => handleConfirm(false)} destructive={true} confirmLabel="Delete" cancelLabel="Cancel" />

        {/* Input Modal */}
        <Modal visible={promptVisible} transparent animationType="fade" onRequestClose={() => setPromptVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
              <ThemedText type="subtitle" style={{ marginBottom: 16 }}>{promptTitle}</ThemedText>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder={promptPlaceholder}
                placeholderTextColor={theme.icon}
                value={promptValue}
                onChangeText={setPromptValue}
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                <TouchableOpacity onPress={() => setPromptVisible(false)} style={{ padding: 10 }}>
                  <ThemedText style={{ color: theme.error }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={onPromptSubmit} style={{ padding: 10, paddingHorizontal: 20, backgroundColor: theme.tint, borderRadius: 8, marginLeft: 8 }}>
                  <ThemedText style={{ color: '#FFF', fontWeight: '600' }}>Create</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Settings Modal */}
        <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Settings</ThemedText>

              <ThemedText style={{ opacity: 0.8 }}>API Endpoint</ThemedText>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder={config.DEFAULT_API_BASE}
                value={apiEndpointInput}
                onChangeText={setApiEndpointInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                <TouchableOpacity onPress={() => setSettingsVisible(false)} style={{ padding: 10 }}>
                  <ThemedText style={{ color: theme.error }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  setTestingEndpoint(true);
                  const ok = await testApiBaseUrl(apiEndpointInput);
                  setTestingEndpoint(false);
                  Alert.alert(ok ? 'Success' : 'Failed', ok ? 'Endpoint reachable' : 'Failed to reach endpoint');
                }} style={{ padding: 10, paddingHorizontal: 18, marginLeft: 8 }}>
                  <ThemedText>{testingEndpoint ? 'Testing...' : 'Test'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  setSavingEndpoint(true);
                  try {
                    await setApiBaseUrl(apiEndpointInput);
                    Alert.alert('Saved', 'API endpoint updated. Pull-to-refresh or tap refresh to load data from the new endpoint.');
                    // Do not automatically refetch here to avoid retry loops; user can refresh manually.
                    setSettingsVisible(false);
                  } catch {
                    Alert.alert('Error', 'Failed to save endpoint');
                  } finally {
                    setSavingEndpoint(false);
                  }
                }} style={{ padding: 10, paddingHorizontal: 18, marginLeft: 8, backgroundColor: theme.tint, borderRadius: 8 }}>
                  <ThemedText style={{ color: '#FFF', fontWeight: '600' }}>{savingEndpoint ? 'Saving...' : 'Save'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Image Preview Modal */}
        <Modal visible={previewVisible} transparent={false} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <TapGestureHandler numberOfTaps={2} onActivated={() => setZoomScale(zoomScale > 1 ? 1 : 2)}>
                <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={{ uri: previewUri || '' }}
                      style={[{ width: '100%', height: '100%', resizeMode: 'contain' }, { transform: [{ scale: zoomScale }] }]}
                    />
                  </View>
                </PinchGestureHandler>
              </TapGestureHandler>
            </GestureHandlerRootView>
          </SafeAreaView>
        </Modal>

      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Sidebar
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 10,
  },
  drawerOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    borderRightWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 10 }
    })
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 99,
  },
  drawerHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerTitle: { fontSize: 18, fontWeight: '700' },
  drawerSubtitle: { fontSize: 12, opacity: 0.6 },
  drawerContent: { flex: 1 },
  sectionHeader: { fontSize: 11, fontWeight: '700', opacity: 0.4, marginBottom: 8, paddingHorizontal: 12, marginTop: 16 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemActive: {},
  drawerItemText: { marginLeft: 16, fontSize: 15, fontWeight: '500' },
  drawerDivider: { height: 1, marginVertical: 8, opacity: 0.5 },
  drawerFooter: { padding: 20 },
  storageText: { fontSize: 12, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  storageBarBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  storageBarFill: { height: '100%' },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  headerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },

  // Lists & Grids
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 }
    })
  },
  listIconContainer: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  gridItem: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 120,
  },
  gridIconWrap: { width: 64, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  gridThumbnail: { width: '100%', height: '100%', backgroundColor: "transparent" },
  gridName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  metaText: { fontSize: 11, opacity: 0.5 },
  listThumbnail: { width: '100%', height: '100%', backgroundColor: "transparent" },

  // Floating Elements
  statusToast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    zIndex: 90,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 5 }
    })
  },
  statusIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  // Small helpers formatting


  bottomBarContainer: {
    position: 'absolute',
    bottom: 24,
    width: '100%',
    alignItems: 'center',
    zIndex: 50,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 32,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 10 }
    })
  },
  bottomBtn: { padding: 12, marginHorizontal: 4 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4', // Using a hardcoded color if theme.tint fails, but should use theme
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 4,
    ...Platform.select({
      ios: { shadowColor: "#0a7ea4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },

  // Action Sheet
  actionSheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 101 },
  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    zIndex: 102,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  actionBtnText: { fontSize: 16, fontWeight: '600', marginLeft: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24 },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  closePreviewBtn: { position: 'absolute', top: 50, right: 20, zIndex: 999, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
});