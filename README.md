# Chop Shop

An AI-first desktop video editor built with Electron, React, and FFmpeg.

## Overview

**Chop Shop** is a modern, modular video editing application designed for performance and AI-assisted development. It features a professional 3-panel interface (media library, preview, timeline) with real-time video compositing, multi-track editing, and FFmpeg-powered export capabilities.

### Key Features

- **Multi-track timeline editor** with drag-and-drop clip management
- **Real-time video preview** with frame-accurate playback
- **FFmpeg integration** for video processing, transcoding, and export
- **H.264 Intra intermediate codec** for smooth editing performance
- **Modern UI** with dark mode and accessible components (shadcn/ui)
- **Type-safe IPC** communication between processes
- **Comprehensive test coverage** with Vitest + Testing Library

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Framework** | Electron 38 |
| **UI Framework** | React 19 + TypeScript |
| **State Management** | Zustand |
| **Video Playback** | Video.js |
| **Video Processing** | FFmpeg (static binaries) |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui (Radix UI + Tailwind) |
| **Build Tool** | Vite + electron-vite |
| **Testing** | Vitest + Testing Library |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
├─────────────────┬───────────────────┬───────────────────┤
│   Main Process  │  Preload Script   │ Renderer Process  │
│   (Node.js)     │   (Bridge)        │   (React UI)      │
├─────────────────┼───────────────────┼───────────────────┤
│ • IPC Handlers  │ • window.api      │ • Components      │
│ • FFmpeg Ops    │ • Type Safety     │ • Zustand Stores  │
│ • File System   │ • Security Layer  │ • Video Player    │
│ • Services      │                   │ • Timeline Editor │
└─────────────────┴───────────────────┴───────────────────┘
```

**Process Communication:**
```
Renderer → window.api → IPC Channel → Main Handler → Service → FFmpeg
```

### Project Structure

```
src/
├── main/               # Electron main process (Node.js backend)
│   ├── ipc/           # IPC handlers for renderer communication
│   ├── services/      # Business logic (FFmpeg, file ops, transcoding)
│   └── utils/         # Main process utilities
│
├── renderer/          # React application (UI frontend)
│   └── src/
│       ├── components/   # React components by feature
│       │   ├── Layout/      # App structure (TopBar, Sidebar)
│       │   ├── MediaLibrary/# Media import and management
│       │   ├── Preview/     # Video player and playback
│       │   ├── Timeline/    # Timeline editor with clips
│       │   ├── Export/      # Export modal and progress
│       │   └── ui/          # shadcn/ui components
│       ├── store/        # Zustand state stores
│       ├── utils/        # Utilities (compositor, audio mixer)
│       └── types/        # TypeScript type definitions
│
├── preload/           # Preload scripts (secure IPC bridge)
└── shared/            # Shared code across all processes
    ├── types.ts       # Shared type definitions
    └── constants.ts   # Shared constants
```

### AI-First Design Principles

This codebase is optimized for AI-assisted development:

- **Modular architecture** - Files organized by feature and responsibility
- **Descriptive naming** - Clear, self-documenting file and function names
- **<500 line limit** - All files kept under 500 lines for comprehension
- **Extensive documentation** - JSDoc/TSDoc on all functions
- **README files** - Each major directory includes architecture docs
- **Co-located tests** - Tests live next to source in `__tests__/` directories

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **macOS**, **Windows**, or **Linux**

### Installation

```bash
npm install
```

This will install dependencies and set up Electron app dependencies via the `postinstall` script.

### Development

Start the app in development mode with hot reload:

```bash
npm run dev
```

This runs `electron-vite dev` which:
- Starts the Vite dev server for the renderer process
- Compiles the main and preload processes
- Launches Electron with hot module replacement (HMR)
- Opens DevTools automatically

### Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with UI:

```bash
npm run test:ui
```

Run specific test suites:

```bash
npm run test:renderer  # Renderer process tests only
npm run test:main      # Main process tests only
```

### Code Quality

Type checking:

```bash
npm run typecheck        # Check all TypeScript files
npm run typecheck:node   # Check main/preload processes
npm run typecheck:web    # Check renderer process
```

Linting:

```bash
npm run lint
```

Formatting:

```bash
npm run format
```

---

## Building

### Development Build (Unpacked)

Build without packaging (faster, for testing):

```bash
npm run build:unpack
```

Outputs to `dist/` directory as unpacked application.

### Production Builds

**macOS:**

```bash
npm run build:mac
```

Creates a `.dmg` installer in `dist/`. Requires macOS to build.

**Windows:**

```bash
npm run build:win
```

Creates a `.exe` installer in `dist/`. Can build on Windows or macOS/Linux with Wine.

**Linux:**

```bash
npm run build:linux
```

Creates AppImage, Snap, and Deb packages in `dist/`.

### Build Configuration

Build settings are configured in `electron-builder.yml`:

- **App ID:** `com.chopshop.app`
- **Product Name:** Chop Shop
- **FFmpeg binaries** are automatically included via `asarUnpack`
- **Auto-update** support configured (requires setup)

### Build Output

Production builds are located in `dist/`:
- macOS: `chop-shop-{version}.dmg`
- Windows: `chop-shop-{version}-setup.exe`
- Linux: `chop-shop-{version}.AppImage`, `.deb`, `.snap`

---

## Development Workflow

### Adding Features

1. **Plan the architecture** - Identify which layer (main/renderer/shared)
2. **Update types** - Add types to `src/shared/types.ts` if cross-process
3. **Implement services** - Add business logic to `src/main/services/`
4. **Create IPC handlers** - Expose functionality via `src/main/ipc/`
5. **Update preload** - Add API methods to `src/preload/index.ts`
6. **Build UI components** - Create React components in `src/renderer/src/components/`
7. **Add state management** - Update Zustand stores in `src/renderer/src/store/`
8. **Write tests** - Add tests in `__tests__/` directories

### FFmpeg Integration

FFmpeg operations are handled in `src/main/services/`:
- `ffmpeg.service.ts` - Core FFmpeg operations
- `transcode.service.ts` - Video transcoding to editing formats
- `thumbnail.service.ts` - Thumbnail generation

FFmpeg binaries are provided by `ffmpeg-static` and `ffprobe-static` packages.

### Video Editing Pipeline

1. **Import** - User selects video file via file dialog
2. **Transcode** - FFmpeg creates H.264 Intra intermediate file for smooth editing
3. **Thumbnail** - FFmpeg generates preview thumbnail
4. **Edit** - User manipulates clips on timeline
5. **Preview** - Real-time compositing via `VideoCompositor` and `AudioMixer`
6. **Export** - FFmpeg renders final output from timeline composition

---

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### VSCode Settings

The project includes `.vscode/` configuration for optimal TypeScript and ESLint support.

---

## Contributing

### Code Style

- Use **functional programming** patterns (avoid classes)
- Prefer **iteration and modularization** over duplication
- Write **descriptive variable names** with auxiliary verbs (`isLoading`, `hasError`)
- Use the **`function` keyword** for pure functions
- Throw errors instead of fallback values
- Add **JSDoc comments** to all functions

### Commit Guidelines

- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

---

## Documentation

- **Component docs:** See `src/renderer/src/components/ui/README.md` for UI component usage
- **Layout docs:** See `src/renderer/src/components/Layout/README.md` for layout structure
- **IPC docs:** See `src/main/ipc/README.md` for IPC patterns
- **Services docs:** See `src/main/services/README.md` for service layer patterns

---

## License

[License information to be added]

---

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
