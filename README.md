# 📂 Aaxion (Mobile)

🚧 **PROJECT STATUS: UNDER ACTIVE DEVELOPMENT** 🚧

**Current Phase:** Modularization & Performance Optimization  
**Live Preview:** 🔴 Not Available yet

## ⚠️ Important Note for Developers

The main branch may be unstable or outdated. All active development is currently happening on the `feat/modularization` branch.

Please refer to that branch for the latest features, including the new file structure and chunked upload logic.

```bash
git checkout feat/modularization
```

## 📖 About The Project

Aaxion is a high-performance mobile file explorer and storage management client. It allows users to browse, upload, and manage files on their self-hosted servers with native-like performance.

The project is currently undergoing a major refactor to improve code modularity and upload speeds using native filesystem bindings.

## ✨ Key Features (Implemented)

- **📂 File Explorer:** Browse directories with nested navigation.
- **🎨 UI Modes:** Toggle between List View and Grid View (with thumbnails).
- **🚀 Smart Uploads:**
  - **Native Multipart:** Blazing fast uploads (30MB/s+) for local/small files.
  - **Chunked Uploads:** Reliable uploads for large files (>90MB) to bypass Tunnel/Proxy limits.
- **📊 Real-time Progress:** Floating toast notification with transfer speed (MB/s) and percentage.
- **🌑 Dark Mode:** Fully themed dark interface.

## 🔜 Roadmap (Coming Soon)

- [ ] Delete & Rename functionality.
- [ ] Download files to local storage.
- [ ] Video Streaming.
- [ ] Image Viewer.

## 🛠️ Tech Stack

- **Framework:** React Native / Expo (Managed Workflow)
- **Language:** TypeScript
- **Networking:** Native fetch & FileSystem.uploadAsync
- **Navigation:** Expo Router / React Navigation
- **Icons:** Ionicons (@expo/vector-icons)

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

- Node.js (LTS)
- npm or yarn
- Expo Go app on your physical device (recommended for testing uploads).

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/aaxion-mobile.git
   cd aaxion-mobile
   ```

2. ⚠️ **Switch to the Development Branch**

   ```bash
   git checkout feat/modularization
   ```

3. Install dependencies

   ```bash
   npm install
   # or
   yarn install
   ```

4. Start the development server

   ```bash
   npx expo start
   ```

5. Scan the QR code with the Expo Go app (Android/iOS).

## 📂 Project Structure (Modularized)

We are moving towards a feature-based architecture:

```text
src/
├── components/
│   ├── explorer/       # File Explorer, Thumbnails, Floating Menu, Upload Toast
│   ├── sidebar/        # Navigation Sidebar
│   └── ...
├── constants/
│   ├── apiConstants.ts # Endpoints config
│   └── theme.ts        # Colors and styles
├── hooks/
│   ├── useExplorer.ts  # Logic for fetching files & sorting
│   └── useFileExplorer.ts # File list state management
├── utils/
│   ├── requestUtil.ts  # Generic fetch wrapper
│   └── uploadUtil.ts   # Smart Hybrid Upload Logic (Chunked + Multipart)
└── screens/
    └── HomeScreen.tsx  # Main Entry
```

## 🤝 Contributing

Contributions are welcome, but please open an issue first to discuss what you would like to change, as the codebase is currently in flux.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request to `feat/modularization`

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
