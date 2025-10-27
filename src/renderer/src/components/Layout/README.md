# Layout Components

Main application layout components that define the UI structure.

## Components

- **MainLayout** - Root layout container with 3-panel structure
- **TopBar** - Top application bar with title and actions
- **Sidebar** - Left sidebar panel for media library

## Layout Structure

```
┌────────────────────────────────────────────┐
│ TopBar (fixed, full-width)                 │
├─────────────┬──────────────────────────────┤
│             │                              │
│  Sidebar    │  Preview Area (center)       │
│  (280px)    │  (flex-1, 60% height)        │
│             │                              │
│             ├──────────────────────────────┤
│             │  Timeline Area (bottom)      │
│             │  (flex-1, 40% height)        │
└─────────────┴──────────────────────────────┘
```

## Usage

```tsx
import { MainLayout } from './components/Layout'

function App() {
  return <MainLayout />
}
```
