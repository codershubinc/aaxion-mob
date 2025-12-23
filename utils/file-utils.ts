import MovieFolder from '@/components/icons/MovieFolder';
import TempFolder from '@/components/icons/TempFolder';
import { Colors } from '@/constants/theme';

export const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const getDirName = (path: string) => {
    if (path === "/home/swap/aaxion/") return "Home";
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || "Root";
};

export const getFileIcon = (item: any, colorScheme: 'light' | 'dark') => {
    const fileName = item.name.toLowerCase();

    if (item.is_dir) {
        if (fileName.includes('download')) return { name: "folder-download", color: "#3B82F6", type: 'mc' };
        // For music folders, return a composite spec so the renderer can show a folder + music overlay
        if (fileName.includes('music') || fileName.includes('audio')) return { base: "folder", overlay: "music", color: "#10B981", type: 'mc-composite' };
        // Nature / park / forest folders use a tree/leaf overlay
        if (fileName.includes('nature') || fileName.includes('forest') || fileName.includes('park') || fileName.includes('tree') || fileName.includes('landscape')) return { base: "folder", overlay: "pine-tree", color: "#34D399", type: 'mc-composite' };
        // Temp / tmp folders show a special react component icon
        if (fileName.includes('temp') || fileName.includes('tmp')) return { type: 'component', Component: TempFolder };
        // Video / movie folders use a component icon with an optional check overlay
        if (fileName.includes('movie') || fileName.includes('video')) return { type: 'component', Component: MovieFolder, overlayImage: require('../assets/images/check.svg') };
        if (fileName.includes('picture') || fileName.includes('photo') || fileName.includes('image')) return { name: "folder-image", color: "#8B5CF6", type: 'mc' };
        if (fileName.includes('doc')) return { name: "folder-text", color: "#64748B", type: 'mc' };
        if (fileName.includes('code') || fileName.includes('dev')) return { name: "folder-zip", color: "#F59E0B", type: 'mc' };
        return { name: "folder", color: "#FFD700", type: 'mc' };
    }

    const ext = item.name.split('.').pop()?.toLowerCase();

    // Specific File Names
    if (fileName === 'dockerfile') return { name: "docker", color: "#2496ED", type: 'mc' };
    if (fileName.startsWith('.git')) return { name: "git", color: "#F05032", type: 'mc' };
    if (fileName === 'package.json') return { name: "nodejs", color: "#339933", type: 'mc' };

    switch (ext) {
        // Audio
        case 'mp3': case 'wav': case 'flac': case 'm4a': case 'ogg': case 'aac':
            return { name: "file-music", color: "#1DB954", type: 'mc' };

        // Video
        case 'mp4': case 'mkv': case 'avi': case 'mov': case 'wmv': case 'flv': case 'webm':
            // 'file-video' may not be available in all icon sets; use a safe 'movie' icon instead
            return { name: "movie", color: "#FF4500", type: 'mc' };

        // Images
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': case 'bmp': case 'ico':
            return { name: "file-image", color: "#00BFFF", type: 'mc' };

        // Documents
        case 'pdf':
            return { name: "file-pdf-box", color: "#FF0000", type: 'mc' };
        case 'doc': case 'docx':
            return { name: "file-word", color: "#2B579A", type: 'mc' };
        case 'xls': case 'xlsx': case 'csv':
            return { name: "file-excel", color: "#217346", type: 'mc' };
        case 'ppt': case 'pptx':
            return { name: "file-powerpoint", color: "#D24726", type: 'mc' };
        case 'txt': case 'md': case 'rtf':
            return { name: "file-document", color: "#9BA1A6", type: 'mc' };

        // Archives
        case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2':
            return { name: "zip-box", color: "#9370DB", type: 'mc' };

        // Code / Development
        case 'js': return { name: "language-javascript", color: "#F7DF1E", type: 'mc' };
        case 'ts': case 'tsx': return { name: "language-typescript", color: "#3178C6", type: 'mc' };
        case 'py': return { name: "language-python", color: "#3776AB", type: 'mc' };
        case 'html': return { name: "language-html5", color: "#E34F26", type: 'mc' };
        case 'css': case 'scss': return { name: "language-css3", color: "#1572B6", type: 'mc' };
        case 'php': return { name: "language-php", color: "#777BB4", type: 'mc' };
        case 'java': return { name: "language-java", color: "#007396", type: 'mc' };
        case 'go': return { name: "language-go", color: "#00ADD8", type: 'mc' };
        case 'rs': return { name: "language-rust", color: "#000000", type: 'mc' };
        case 'rb': return { name: "language-ruby", color: "#CC342D", type: 'mc' };
        case 'sh': case 'bat': return { name: "bash", color: "#4EAA25", type: 'mc' };
        case 'sql': return { name: "database-search", color: "#4479A1", type: 'mc' };
        case 'json': return { name: "code-json", color: "#000000", type: 'mc' };

        // Config / System
        case 'xml': case 'yaml': case 'yml': case 'ini': case 'env': case 'lock': case 'config':
            return { name: "cog", color: "#607D8B", type: 'mc' };

        // Database
        case 'db': case 'sqlite': case 'sqlite3':
            return { name: "database", color: "#47A248", type: 'mc' };

        // Disk Images / Executables
        case 'iso': case 'dmg': case 'exe': case 'msi': case 'apk':
            return { name: "disc", color: "#E91E63", type: 'mc' };

        default:
            return { name: "file-outline", color: Colors[colorScheme].icon, type: 'mc' };
    }
};

export const sortFiles = (data: any[]) => {
    return [...data].sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
    });
};
