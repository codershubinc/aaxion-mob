import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image
} from "react-native";
import Animated, {
  FadeInRight,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createFile, createFolder, deleteFile, fetchFileList, getDownloadUrl, uploadFile } from '@/utils/file-fetcher';
import { formatSize, getDirName, getFileIcon, sortFiles } from '@/utils/file-utils';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH > 768;
const DRAWER_WIDTH = IS_TABLET ? 320 : SCREEN_WIDTH * 0.75;

export default function HomeScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const IS_TABLET = SCREEN_WIDTH > 768;
  const IS_LANDSCAPE = SCREEN_WIDTH > SCREEN_HEIGHT;
  const DRAWER_WIDTH = IS_TABLET ? 320 : SCREEN_WIDTH * 0.75;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null); // bytes/sec
  const [uploadETA, setUploadETA] = useState<number | null>(null); // seconds remaining
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [uploadElapsed, setUploadElapsed] = useState<number>(0); // seconds elapsed
  const [multiUploadTotal, setMultiUploadTotal] = useState<number | null>(null);
  const [multiUploadIndex, setMultiUploadIndex] = useState<number | null>(null);
  const [gridView, setGridView] = useState(false);
  const [error, setError] = useState<any>(null);

  const prevBytesRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const [currentDir, setCurrentDir] = useState("/home/swap/aaxion/");
  const [history, setHistory] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTranslateX = useSharedValue(-DRAWER_WIDTH);

  // Action Sheet State
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const actionSheetTranslateY = useSharedValue(400);

  const toggleDrawer = () => {
    const nextState = !drawerOpen;
    setDrawerOpen(nextState);
    drawerTranslateX.value = withTiming(nextState ? 0 : -DRAWER_WIDTH, {
      duration: 250,
    });
    if (nextState) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleActionSheet = (item?: any) => {
    if (item) setSelectedItem(item);
    const nextState = !actionSheetVisible;
    setActionSheetVisible(nextState);
    actionSheetTranslateY.value = withTiming(nextState ? 0 : 400, {
      duration: 200,
    });
    if (nextState) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));

  const actionSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: actionSheetTranslateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(drawerOpen ? 1 : 0, { duration: 200 }), // Faster timing
    pointerEvents: drawerOpen ? 'auto' : 'none',
  }));

  const actionSheetBackdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(actionSheetVisible ? 1 : 0, { duration: 200 }),
    pointerEvents: actionSheetVisible ? 'auto' : 'none',
  }));

  // Status overlay animation values
  const statusTranslateY = useSharedValue(40);
  const statusOpacity = useSharedValue(0);
  const progressScale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  const statusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statusTranslateY.value }, { scale: withTiming(statusOpacity.value ? 1 : 0.98) }],
    opacity: withTiming(statusOpacity.value, { duration: 180 }),
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressScale.value }],
    // Note: scaleX anchors visually; ensure inner element aligns to left via alignSelf
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Prompt Modal State
  const [promptVisible, setPromptVisible] = useState(false);

  // Helpers for formatting speed and ETA
  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = bytesPerSec;
    let i = 0;
    while (speed >= 1024 && i < units.length - 1) {
      speed = speed / 1024;
      i++;
    }
    return `${speed.toFixed(speed >= 100 ? 0 : 1)} ${units[i]}`;
  };

  const formatETA = (seconds: number | null) => {
    if (seconds === null || !isFinite(seconds)) return '--:--';
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || !isFinite(seconds)) return '0:00';
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const [promptTitle, setPromptTitle] = useState("");
  const [promptValue, setPromptValue] = useState("");
  const [promptPlaceholder, setPromptPlaceholder] = useState("");
  const [promptType, setPromptType] = useState<'folder' | 'file' | 'content'>('folder');
  const [tempFileName, setTempFileName] = useState("");

  const fetchFiles = async (dir: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      const data = await fetchFileList(dir);
      setFiles(sortFiles(data));
    } catch (error) {
      console.error(error);
      setError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentDir);
  }, [currentDir]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchFiles(currentDir, true);
  }, [currentDir]);

  const navigateToDir = (path: string) => {
    Haptics.selectionAsync();
    const newPath = path.endsWith('/') ? path : path + "/";
    setHistory(prev => [...prev, currentDir]);
    setCurrentDir(newPath);
    setSearchQuery("");
  };

  const goBack = () => {
    if (history.length > 0) {
      Haptics.selectionAsync();
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrentDir(prev);
    } else if (currentDir !== "/home/swap/aaxion/") {
      // Fallback: if history is empty but we're not at home, go to parent
      Haptics.selectionAsync();
      const parts = currentDir.split('/').filter(Boolean);
      parts.pop();
      const parent = '/' + parts.join('/') + '/';
      setCurrentDir(parent);
    }
    setSearchQuery("");
  };

  const goHome = () => {
    if (currentDir === "/home/swap/aaxion/") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHistory(prev => [...prev, currentDir]);
    setCurrentDir("/home/swap/aaxion/");
    setSearchQuery("");
  };

  const handleUpload = async () => {
    console.log("Upload button pressed");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      // Normalize assets: some versions return { assets } while others return a single object
      const assets = (result as any).assets ?? ((result as any).uri ? [result] : []);
      if (!assets || assets.length === 0) return;

      setMultiUploadTotal(assets.length);
      setMultiUploadIndex(null);

      // animate in once for the whole batch
      statusTranslateY.value = withTiming(0, { duration: 240 });
      statusOpacity.value = withTiming(1, { duration: 220 });

      // keep a start time for total elapsed
      setUploadStartTime(Date.now());
      setUploadElapsed(0);

      for (let i = 0; i < assets.length; i++) {
        const file = assets[i];
        setMultiUploadIndex(i + 1);

        setUploadStatus('uploading');
        setUploadProgress(0);
        setUploadFileName(file.name);
        prevBytesRef.current = null;
        prevTimeRef.current = null;

        await uploadFile(currentDir, {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        }, (info) => {
          // info: { progress, bytesSent, totalBytes, timestamp }
          setUploadProgress(info.progress);

          // animate progress scale (scaleX)
          progressScale.value = withTiming(Math.max(0.0001, info.progress), { duration: 120 });

          // compute speed and ETA
          const now = info.timestamp;
          const bytes = info.bytesSent;
          const total = info.totalBytes;

          const prevBytes = prevBytesRef.current;
          const prevTime = prevTimeRef.current;

          if (prevBytes !== null && prevTime !== null && now > prevTime) {
            const deltaBytes = bytes - prevBytes;
            const deltaTime = (now - prevTime) / 1000; // seconds
            if (deltaTime > 0) {
              const speed = deltaBytes / deltaTime; // bytes/sec
              setUploadSpeed(speed);
              if (speed > 0 && total > 0) {
                const remaining = total - bytes;
                const eta = Math.max(0, Math.round(remaining / speed));
                setUploadETA(eta);
              }
            }
          }

          prevBytesRef.current = bytes;
          prevTimeRef.current = now;

          // update elapsed total
          if (uploadStartTime) {
            setUploadElapsed(Math.floor((Date.now() - uploadStartTime) / 1000));
          }
        });

        // per-file success animation
        setUploadStatus('success');
        checkScale.value = 0;
        checkScale.value = withSequence(withTiming(1.4, { duration: 140 }), withTiming(1, { duration: 140 }));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // small pause between files
        await new Promise(res => setTimeout(res, 300));
      }

      // refresh listing after all uploads
      fetchFiles(currentDir);

      // set elapsed final
      if (uploadStartTime) {
        setUploadElapsed(Math.floor((Date.now() - uploadStartTime) / 1000));
      }

      // animate out after a short delay
      setTimeout(() => {
        statusOpacity.value = withTiming(0, { duration: 200 });
        statusTranslateY.value = withTiming(40, { duration: 280 });
      }, 600);

      // Reset status after a delay
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadFileName(null);
        setUploadSpeed(null);
        setUploadETA(null);
        setUploadStartTime(null);
        setUploadElapsed(0);
        setMultiUploadTotal(null);
        setMultiUploadIndex(null);
        prevBytesRef.current = null;
        prevTimeRef.current = null;
        progressScale.value = 0;
        checkScale.value = 0;
      }, 1600);
    } catch (error: any) {
      console.error(error);
      setUploadStatus('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // set elapsed final
      if (uploadStartTime) {
        setUploadElapsed(Math.floor((Date.now() - uploadStartTime) / 1000));
      }

      // Reset status after a delay
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadFileName(null);
        setUploadSpeed(null);
        setUploadETA(null);
        setUploadStartTime(null);
        setUploadElapsed(0);
        setMultiUploadTotal(null);
        setMultiUploadIndex(null);
        prevBytesRef.current = null;
        prevTimeRef.current = null;
      }, 4000);
    }
  };

  const handleCreateFolder = () => {
    console.log("Create folder pressed");
    setPromptTitle("New Folder");
    setPromptPlaceholder("Enter folder name");
    setPromptValue("");
    setPromptType('folder');
    setPromptVisible(true);
  };

  const handleCreateFile = () => {
    console.log("Create file pressed");
    setPromptTitle("New File");
    setPromptPlaceholder("Enter file name");
    setPromptValue("");
    setPromptType('file');
    setPromptVisible(true);
  };

  const onPromptSubmit = async () => {
    const value = promptValue.trim();
    if (!value) {
      setPromptVisible(false);
      return;
    }

    try {
      setLoading(true);
      setPromptVisible(false);

      if (promptType === 'folder') {
        await createFolder(currentDir + value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (promptType === 'file') {
        setTempFileName(value);
        // After name, ask for content
        setTimeout(() => {
          setPromptTitle("File Content");
          setPromptPlaceholder("Enter content for " + value);
          setPromptValue("");
          setPromptType('content');
          setPromptVisible(true);
        }, 500);
        return; // Don't refresh yet
      } else if (promptType === 'content') {
        await createFile(currentDir + tempFileName, value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      fetchFiles(currentDir);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: any) => {
    console.log("Delete pressed for", item.name);
    Alert.alert(
      "Delete",
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteFile(item.raw_path);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchFiles(currentDir);
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to delete");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDownload = async (item: any) => {
    console.log("Download pressed for", item.name);
    try {
      const url = getDownloadUrl(item.raw_path);

      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open download link");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to start download");
    }
  };

  const showFileActions = (item: any) => {
    console.log("Show actions for", item.name);
    toggleActionSheet(item);
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  const shortenNameWithExt = (name: string, max = 20) => {
    if (!name) return name;
    const parts = name.split('.');
    if (parts.length === 1) return name.length > max ? name.slice(0, max - 3) + '...' : name;
    const ext = parts.pop();
    const base = parts.join('.');
    const allowed = max - (ext?.length ?? 0) - 3; // for ...
    if (base.length <= allowed) return name;
    const start = base.slice(0, Math.max(6, Math.floor(allowed / 2)));
    const end = base.slice(-Math.max(3, Math.floor(allowed / 2)));
    return `${start}...${end}.${ext}`;
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const icon = getFileIcon(item, colorScheme);

    // Determine columns (for layout math when not using wrap)
    const numCols = gridView ? (IS_TABLET ? (IS_LANDSCAPE ? 4 : 3) : 2) : (IS_TABLET ? (IS_LANDSCAPE ? 3 : 2) : 1);
    const itemWidth = IS_TABLET ? (Math.min(SCREEN_WIDTH, 1200) - (40 + (numCols - 1) * 15)) / numCols : '100%';

    if (gridView) {
      return (
        <AnimatedTouchableOpacity
          entering={FadeInRight.delay(index * 10).duration(180)}
          layout={Layout.duration(200)}
          style={[styles.gridItem, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, flexBasis: 160, marginRight: 12 }]}
          onPress={() => item.is_dir ? navigateToDir(item.raw_path) : showFileActions(item)}
          onLongPress={() => showFileActions(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: theme.background }]}>
            {(() => {
              const ext = item.name.split('.').pop()?.toLowerCase();
              const imageExts = ['jpg','jpeg','png','gif','svg','webp','bmp','ico'];
              const isImage = !item.is_dir && ext && imageExts.includes(ext);

              if (isImage) {
                return <Image source={{ uri: getDownloadUrl(item.raw_path) }} style={styles.gridThumbnail} />;
              }

              if (icon.type === 'mc-composite') {
                return (
                  <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={icon.base as any} size={36} color={icon.color || theme.icon} />
                    <View style={{ position: 'absolute', right: 4, bottom: 4, width: 18, height: 18, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={icon.overlay as any} size={10} color={icon.color || theme.icon} />
                    </View>
                  </View>
                );
              }

              if (icon.type === 'fa') {
                return <FontAwesome name={icon.name as any} size={28} color={icon.color} />;
              }

              return <MaterialCommunityIcons name={icon.name as any} size={30} color={icon.color} />;
            })()}
          </View>

          <ThemedText type="defaultSemiBold" numberOfLines={1} ellipsizeMode="middle" style={styles.gridName}>{shortenNameWithExt(item.name, 26)}</ThemedText>
          <ThemedText style={styles.gridMeta} numberOfLines={1}>{item.is_dir ? 'Folder' : formatSize(item.size)}</ThemedText>
        </AnimatedTouchableOpacity>
      );
    }

    // List view (existing)
    return (
      <AnimatedTouchableOpacity
        entering={FadeInRight.delay(index * 20).duration(200)}
        layout={Layout.duration(200)}
        style={[
          styles.fileItem,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            width: itemWidth,
            marginHorizontal: IS_TABLET ? 0 : 0,
          }
        ]}
        onPress={() => item.is_dir ? navigateToDir(item.raw_path) : showFileActions(item)}
        onLongPress={() => showFileActions(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.fileIconContainer, { backgroundColor: theme.background }]}>
          {(() => {
            const ext = item.name.split('.').pop()?.toLowerCase();
            const imageExts = ['jpg','jpeg','png','gif','svg','webp','bmp','ico'];
            const isImage = !item.is_dir && ext && imageExts.includes(ext);

            if (isImage) {
              return (
                <Image
                  source={{ uri: getDownloadUrl(item.raw_path) }}
                  style={styles.fileThumbnail}
                />
              );
            }

            if (icon.type === 'fa') {
              return <FontAwesome name={icon.name as any} size={22} color={icon.color} />;
            }

            if (icon.type === 'mc-composite') {
              return (
                <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={icon.base as any} size={28} color={icon.color || theme.icon} />
                  <View style={{ position: 'absolute', right: 2, bottom: 2, width: 18, height: 18, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={icon.overlay as any} size={10} color={icon.color || theme.icon} />
                  </View>
                </View>
              );
            }

            return <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />;
          })()}
        </View>
        <View style={styles.fileInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.fileName}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.fileDetails}>
            {item.is_dir ? 'Folder' : formatSize(item.size)}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => showFileActions(item)}
            style={styles.moreButton}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.icon} />
          </TouchableOpacity>
        </View>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Drawer Backdrop */}
        <Animated.View style={[styles.drawerBackdrop, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={toggleDrawer} />
        </Animated.View>

        {/* Action Sheet Backdrop */}
        <Animated.View style={[styles.actionSheetBackdrop, actionSheetBackdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={() => toggleActionSheet()} />
        </Animated.View>

        {/* Action Sheet Content */}
        <Animated.View style={[styles.actionSheet, { backgroundColor: theme.surface, borderTopColor: theme.border }, actionSheetStyle]}>
          <View style={styles.actionSheetHeader}>
            {selectedItem && !selectedItem.is_dir && (() => {
              const ext = selectedItem.name.split('.').pop()?.toLowerCase();
              const imageExts = ['jpg','jpeg','png','gif','svg','webp','bmp','ico'];
              if (ext && imageExts.includes(ext)) {
                return (
                  <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
                    <Image source={{ uri: getDownloadUrl(selectedItem.raw_path) }} style={[styles.previewImage, { backgroundColor: theme.background }]} />
                  </View>
                );
              }
              return null;
            })()}
            <View style={[styles.actionSheetIndicator, { backgroundColor: theme.border }]} />
            <ThemedText type="defaultSemiBold" style={styles.actionSheetTitle} numberOfLines={1}>{selectedItem?.name}</ThemedText>
          </View>

          <View style={styles.actionSheetContent}>
            {!selectedItem?.is_dir && (
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => { handleDownload(selectedItem); toggleActionSheet(); }}
              >
                <View style={[styles.actionSheetIcon, { backgroundColor: theme.tint + '15' }]}>
                  <MaterialCommunityIcons name="download-outline" size={22} color={theme.tint} />
                </View>
                <ThemedText style={styles.actionSheetItemText}>Download</ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => { handleDelete(selectedItem); toggleActionSheet(); }}
            >
              <View style={[styles.actionSheetIcon, { backgroundColor: theme.error + '15' }]}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.error} />
              </View>
              <ThemedText style={[styles.actionSheetItemText, { color: theme.error }]}>Delete</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => toggleActionSheet()}
            >
              <ThemedText style={styles.actionSheetCancelText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Drawer Content */}
        <Animated.View style={[styles.drawer, { backgroundColor: theme.surface, borderRightColor: theme.border }, drawerStyle]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
              <View style={[styles.drawerLogo, { backgroundColor: theme.tint }]}>
                <MaterialCommunityIcons name="folder-network" size={32} color="#FFF" />
              </View>
              <ThemedText type="subtitle" style={styles.drawerTitle}>Aaxion Cloud</ThemedText>
              <ThemedText style={styles.drawerSubtitle}>File Explorer</ThemedText>
            </View>

            <View style={styles.drawerContent}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => { goHome(); toggleDrawer(); }}>
                <MaterialCommunityIcons name="home" size={24} color={theme.tint} />
                <ThemedText style={styles.drawerItemText}>Home</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { navigateToDir("/home/swap/aaxion/Downloads/"); toggleDrawer(); }}>
                <MaterialCommunityIcons name="download" size={24} color={theme.icon} />
                <ThemedText style={styles.drawerItemText}>Downloads</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => { navigateToDir("/home/swap/aaxion/Documents/"); toggleDrawer(); }}>
                <MaterialCommunityIcons name="file-document" size={24} color={theme.icon} />
                <ThemedText style={styles.drawerItemText}>Documents</ThemedText>
              </TouchableOpacity>

              <View style={[styles.drawerDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity style={styles.drawerItem} onPress={() => Alert.alert("Settings", "Coming soon!")}>
                <MaterialCommunityIcons name="cog" size={24} color={theme.icon} />
                <ThemedText style={styles.drawerItemText}>Settings</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerFooter}>
              <ThemedText style={styles.versionText}>v1.0.0</ThemedText>
            </View>
          </SafeAreaView>
        </Animated.View>

        <View style={IS_TABLET ? { alignSelf: 'center', width: '100%', maxWidth: 1200, flex: 1 } : { flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>

            <View style={styles.headerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.iconButton, { backgroundColor: theme.surface }]}>
                  <MaterialCommunityIcons name="menu" size={24} color={theme.tint} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goBack}
                  disabled={currentDir === "/home/swap/aaxion/" && history.length === 0}
                  style={[styles.iconButton, { backgroundColor: theme.surface, marginLeft: 10 }, (currentDir === "/home/swap/aaxion/" && history.length === 0) && { opacity: 0.3 }]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.headerTitleContainer}>
                <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={2}>{getDirName(currentDir)}</ThemedText>
                <ThemedText style={styles.countText}>{filteredFiles.length} items • {filteredFiles.filter(f => f.is_dir).length} folders</ThemedText>
                <ThemedText style={styles.pathText} numberOfLines={1}>{currentDir}</ThemedText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setGridView(!gridView)} style={[styles.iconButton, { backgroundColor: theme.surface, marginLeft: 10 }]}>
                  <MaterialCommunityIcons name={gridView ? 'view-list' : 'view-grid'} size={20} color={theme.icon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.icon} style={{ marginLeft: 15 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search files..."
                placeholderTextColor={theme.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={{ marginRight: 10 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.icon} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {uploadStatus !== 'idle' && (
            <Animated.View
              style={[styles.statusOverlay, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }, statusAnimatedStyle]}
            >
              <View style={styles.statusContent}>
                      {uploadStatus === 'uploading' ? (
                  <>
                    <Animated.View style={[styles.statusIconWrap, { backgroundColor: theme.tint }]}>
                      <MaterialCommunityIcons name="cloud-upload" size={18} color="#FFF" />
                    </Animated.View>

                    <View style={styles.statusTextContainer}>
                      <ThemedText type="defaultSemiBold">Uploading{multiUploadTotal && multiUploadTotal > 1 ? ` (${multiUploadIndex}/${multiUploadTotal})` : ''}</ThemedText>
                      <ThemedText style={styles.statusSubtext} numberOfLines={1} ellipsizeMode="middle">{uploadFileName ?? ''}</ThemedText>
                      <ThemedText style={styles.statusSubtext}>{Math.round(uploadProgress * 100)}% • {formatDuration(uploadElapsed)}</ThemedText>
                      {uploadSpeed !== null && (
                        <ThemedText style={styles.statusSubtext}>{formatSpeed(uploadSpeed)} • ETA {formatETA(uploadETA)}</ThemedText>
                      )}

                      <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.tint, alignSelf: 'flex-start' }, progressAnimatedStyle]} />
                      </View>
                    </View>
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <Animated.View style={[styles.statusIconWrap, { backgroundColor: theme.success }]}>
                      <Animated.View style={checkAnimatedStyle}>
                        <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                      </Animated.View>
                    </Animated.View>

                    <View style={styles.statusTextContainer}>
                      <ThemedText type="defaultSemiBold" style={{ color: theme.success }}>Upload Complete</ThemedText>
                      <ThemedText style={styles.statusSubtext} numberOfLines={1} ellipsizeMode="middle">{uploadFileName ?? 'File saved successfully'}</ThemedText>
                      <ThemedText style={[styles.statusSubtext, { color: theme.success }]}>Time: {formatDuration(uploadElapsed)}</ThemedText>
                      {uploadSpeed !== null && (
                        <ThemedText style={[styles.statusSubtext, { color: theme.success }]}>{formatSpeed(uploadSpeed)} • ETA {formatETA(uploadETA)}</ThemedText>
                      )}

                      <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.success, alignSelf: 'flex-start' }, progressAnimatedStyle]} />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="alert-circle" size={24} color={theme.error} />
                    <View style={styles.statusTextContainer}>
                      <ThemedText type="defaultSemiBold" style={{ color: theme.error }}>Upload Failed</ThemedText>
                      <ThemedText style={styles.statusSubtext}>Something went wrong</ThemedText>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          )}

          <Modal
            visible={promptVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPromptVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <ThemedText type="subtitle" style={styles.modalTitle}>{promptTitle}</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
                  placeholder={promptPlaceholder}
                  placeholderTextColor={theme.icon}
                  value={promptValue}
                  onChangeText={setPromptValue}
                  autoFocus
                  multiline={promptType === 'content'}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setPromptVisible(false)}>
                    <ThemedText style={{ color: theme.error }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.tint }]} onPress={onPromptSubmit}>
                    <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>Submit</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {error ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.error} />
              <ThemedText style={styles.errorText}>Connection failed</ThemedText>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.tint }]} onPress={() => fetchFiles(currentDir)}>
                <ThemedText type="defaultSemiBold" style={{ color: 'white' }}>Try Again</ThemedText>
              </TouchableOpacity>
            </View>
          ) : loading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.tint} />
              <ThemedText style={{ marginTop: 15, opacity: 0.7 }}>Scanning directory...</ThemedText>
            </View>
          ) : (
            <FlatList
              key={IS_TABLET ? (IS_LANDSCAPE ? 'landscape' : 'portrait') : 'phone'}
              numColumns={IS_TABLET ? (IS_LANDSCAPE ? 3 : 2) : 1}
              data={filteredFiles}
              renderItem={renderItem}
              keyExtractor={(item) => item.raw_path}
              contentContainerStyle={[
                styles.listContent,
                IS_TABLET && { paddingHorizontal: 20, maxWidth: 1200, alignSelf: 'center' }
              ]}
              columnWrapperStyle={IS_TABLET ? { justifyContent: 'flex-start', gap: 15 } : undefined}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.tint}
                  colors={[theme.tint]}
                />
              }
              ListEmptyComponent={
                <View style={styles.center}>
                  <MaterialCommunityIcons
                    name={searchQuery ? "file-search-outline" : "folder-open-outline"}
                    size={80}
                    color={theme.icon}
                    style={{ opacity: 0.3 }}
                  />
                  <ThemedText style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "This folder is empty"}
                  </ThemedText>
                </View>
              }
            />
          )}

          {/* Bottom Action Bar (persistent) */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'ios' ? 30 : 16, zIndex: 300, alignItems: 'center' }} pointerEvents="box-none">
            <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, width: '100%', maxWidth: 1200, marginHorizontal: 16 }]}>
              <TouchableOpacity onPress={handleCreateFolder} style={styles.bottomButton}>
                <MaterialCommunityIcons name="folder-plus-outline" size={20} color={theme.tint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateFile} style={styles.bottomButton}>
                <MaterialCommunityIcons name="file-plus-outline" size={20} color={theme.tint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpload} style={[styles.bottomButton, { backgroundColor: theme.tint }]}>
                <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  actionSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  actionSheet: {
    position: 'absolute',
    left: IS_TABLET ? (SCREEN_WIDTH - 400) / 2 : 0,
    right: IS_TABLET ? (SCREEN_WIDTH - 400) / 2 : 0,
    bottom: IS_TABLET ? 40 : 0,
    zIndex: 201,
    borderRadius: IS_TABLET ? 32 : 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxWidth: IS_TABLET ? 400 : '100%',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  previewImage: {
    width: '100%',
    maxHeight: 220,
    borderRadius: 12,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  actionSheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    opacity: 0.3,
  },
  actionSheetTitle: {
    fontSize: 15,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionSheetContent: {
    paddingHorizontal: 20,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  actionSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionSheetItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionSheetCancel: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.5,
  },
  moreButton: {
    padding: 8,
    borderRadius: 10,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 101,
    borderRightWidth: 1,
    maxWidth: 320,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  drawerHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  drawerLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  drawerSubtitle: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  drawerContent: {
    flex: 1,
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  drawerDivider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.5,
  },
  drawerFooter: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    opacity: 0.3,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  pathText: {
    fontSize: 11,
    opacity: 0.4,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 180 : 160, // extra space so grid/list items don't get hidden
    flexGrow: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
  },
  fileDetails: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    opacity: 0.5,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  statusOverlay: {
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: IS_TABLET ? 'center' : 'auto',
    width: IS_TABLET ? 380 : '92%',
    maxWidth: 420,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    marginLeft: 0,
    flex: 1,
  },
  statusSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 1,
  },
  miniProgressContainer: {
    marginLeft: 10,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    transformOrigin: 'left',
  },
  fileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  gridItem: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  gridIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  gridName: {
    fontSize: 14,
    textAlign: 'center',
  },
  gridMeta: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 10,
  },
  modalButtonPrimary: {
    borderRadius: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 24,
    // subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  bottomButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



