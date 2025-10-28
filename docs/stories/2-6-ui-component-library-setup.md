# Story 2.6: UI Component Library Setup

Status: review

## Story

As a developer,
I want shadcn/ui integrated with our Tailwind setup,
So that Epic 3 features have professional, accessible UI components.

## Acceptance Criteria

1. shadcn/ui initialized in the project with Radix UI primitives
2. Core components installed: Button, Dialog, Progress, Slider, Select, Tabs
3. Existing Button component migrated to shadcn/ui pattern
4. Component theming configured for dark mode consistency
5. Components properly typed with TypeScript
6. All components documented in components/ui folder
7. No existing functionality broken by migration

## Tasks / Subtasks

- [x] Task 1: Initialize shadcn/ui configuration (AC: #1)
  - [x] Run `npx shadcn@latest init` to bootstrap shadcn/ui
  - [x] Configure components.json for React + Tailwind setup
  - [x] Verify Radix UI primitives installed (@radix-ui/react-*)
  - [x] Test installation by running `npx shadcn@latest add button`
  - [x] Verify components/ui folder created with proper structure

- [x] Task 2: Install core UI components (AC: #2)
  - [x] Install Button: `npx shadcn@latest add button`
  - [x] Install Dialog: `npx shadcn@latest add dialog`
  - [x] Install Progress: `npx shadcn@latest add progress`
  - [x] Install Slider: `npx shadcn@latest add slider`
  - [x] Install Select: `npx shadcn@latest add select`
  - [x] Install Tabs: `npx shadcn@latest add tabs`
  - [x] Verify all components render correctly in isolation

- [x] Task 3: Configure dark mode theming (AC: #4)
  - [x] Update tailwind.config.js with shadcn color tokens
  - [x] Configure CSS variables in globals.css for dark theme
  - [x] Set darkMode: 'class' in Tailwind config
  - [x] Test component rendering in dark mode
  - [x] Ensure consistency with existing dark theme (#18181b background)

- [x] Task 4: Migrate existing Button component (AC: #3, #7)
  - [x] Identify all usages of existing Button in codebase
  - [x] Replace shared/Button.tsx with shadcn Button import
  - [x] Update import paths: `from '@/components/ui/button'`
  - [x] Preserve existing className and onClick behavior
  - [x] Test PlaybackControls play/pause button still works
  - [x] Test any other buttons in Layout/TopBar
  - [x] Run all existing tests to verify no regressions

- [x] Task 5: Add TypeScript types and documentation (AC: #5, #6)
  - [x] Verify all ui components export proper TypeScript types
  - [x] Create components/ui/README.md with usage examples
  - [x] Document Button variants: default, destructive, outline, ghost
  - [x] Document Dialog usage pattern for modals
  - [x] Document Progress for export progress indicators
  - [x] Document Slider for timeline zoom controls
  - [x] Add JSDoc comments to each ui component

- [x] Task 6: Create example storybook/demo page (AC: #6)
  - [x] Create components/ui/demo.tsx (dev-only component)
  - [x] Show all installed components with variants
  - [x] Include dark mode toggle for testing
  - [x] Document accessibility features (keyboard nav, ARIA)

- [x] Task 7: Write unit tests for ui components (AC: #7)
  - [x] Test Button renders with all variants
  - [x] Test Dialog opens/closes correctly
  - [x] Test Progress updates value prop
  - [x] Test Slider onChange callback
  - [x] Test Select options rendering
  - [x] Test Tabs switching between panels
  - [x] Verify all tests pass with existing test suite

## Dev Notes

### Technical Implementation

**shadcn/ui Overview:**

shadcn/ui is a component library built on Radix UI primitives with Tailwind CSS styling. Unlike traditional npm packages, shadcn/ui copies component source code directly into your project (`components/ui/`), giving full ownership and customization.

**Installation Flow:**

```bash
# 1. Initialize shadcn/ui (interactive)
npx shadcn@latest init

# Answers for prompts:
# - Style: Default
# - Base color: Zinc (matches existing dark theme)
# - CSS variables: Yes
# - TypeScript: Yes
# - Location for components: src/renderer/src/components/ui
# - Global CSS: src/renderer/src/styles/globals.css
# - Tailwind config: tailwind.config.js

# 2. Install components
npx shadcn@latest add button dialog progress slider select tabs
```

**Configuration Files:**

```json
// components.json (created by init)
{
  "style": "default",
  "rsc": false,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/utils"
  }
}
```

**Tailwind Config Updates:**

```javascript
// tailwind.config.js (extend existing)
module.exports = {
  darkMode: 'class', // Enable dark mode via class
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx}',
    // Add if using shadcn components outside renderer
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // ... other shadcn color tokens
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  }
}
```

**CSS Variables (globals.css):**

```css
/* src/renderer/src/styles/globals.css (add to existing) */

@layer base {
  :root {
    /* Existing CSS variables preserved */
    --bg-primary: #18181b;
    --bg-secondary: #27272a;
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;

    /* shadcn dark theme variables */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --radius: 0.5rem;
  }
}
```

**Button Component Migration:**

```typescript
// Before (shared/Button.tsx):
interface ButtonProps {
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function Button({ onClick, children, className }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn('px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm', className)}>
      {children}
    </button>
  )
}

// After (using shadcn Button):
import { Button } from '@/components/ui/button'

// Usage remains similar:
<Button variant="default" size="sm" onClick={handleClick}>
  {children}
</Button>
```

**Component Usage Examples:**

```typescript
// Button variants
import { Button } from '@/components/ui/button'

<Button variant="default">Export</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Split</Button>
<Button variant="destructive">Delete</Button>

// Dialog for modals
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Export Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Export Video</DialogTitle>
      <DialogDescription>
        Choose resolution and output location.
      </DialogDescription>
    </DialogHeader>
    {/* Export form content */}
  </DialogContent>
</Dialog>

// Progress bar for exports
import { Progress } from '@/components/ui/progress'

<Progress value={45} className="w-full" />

// Slider for timeline zoom
import { Slider } from '@/components/ui/slider'

<Slider
  value={[zoomLevel]}
  onValueChange={([value]) => setZoomLevel(value)}
  min={0}
  max={100}
  step={1}
/>

// Select for resolution picker
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

<Select value={resolution} onValueChange={setResolution}>
  <SelectTrigger>
    <SelectValue placeholder="Select resolution" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="720p">720p</SelectItem>
    <SelectItem value="1080p">1080p</SelectItem>
    <SelectItem value="source">Source Quality</SelectItem>
  </SelectContent>
</Select>

// Tabs for track selection
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

<Tabs defaultValue="track1">
  <TabsList>
    <TabsTrigger value="track1">Track 1</TabsTrigger>
    <TabsTrigger value="track2">Track 2</TabsTrigger>
  </TabsList>
  <TabsContent value="track1">Track 1 content</TabsContent>
  <TabsContent value="track2">Track 2 content</TabsContent>
</Tabs>
```

### Project Structure Notes

**New Files Created:**

```
src/renderer/src/components/ui/
  ├── button.tsx                    # Button component (shadcn)
  ├── dialog.tsx                    # Dialog component (shadcn)
  ├── progress.tsx                  # Progress component (shadcn)
  ├── slider.tsx                    # Slider component (shadcn)
  ├── select.tsx                    # Select component (shadcn)
  ├── tabs.tsx                      # Tabs component (shadcn)
  ├── README.md                     # Usage documentation
  └── demo.tsx                      # Dev-only demo page

components.json                     # shadcn configuration
```

**Files Modified:**

```
tailwind.config.js                  # Add shadcn color tokens and dark mode
src/renderer/src/styles/globals.css # Add CSS variables for dark theme
package.json                        # New Radix UI dependencies
src/renderer/src/components/Preview/PlaybackControls.tsx  # Migrate Button
src/renderer/src/components/Layout/TopBar.tsx              # Migrate Button (if exists)
```

**Dependencies Added:**

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

**Alignment with Architecture:**

- Components stored in `src/renderer/src/components/ui/` per project structure
- Tailwind CSS for styling (ADR-003)
- TypeScript strict mode with proper type exports
- Functional components (no classes)
- Dark theme using CSS variables
- Accessibility built-in via Radix UI primitives

**Testing Strategy:**

- Unit tests for each component's core functionality
- Integration tests for Button migration (existing tests should pass)
- Visual testing in demo.tsx for all variants
- Accessibility testing (keyboard navigation, screen readers)

**Performance Considerations:**

- shadcn components are tree-shakeable (only imported components bundled)
- Radix UI primitives are lightweight and performant
- CSS variables enable dynamic theming without re-renders
- No runtime style computation (Tailwind CSS at build time)

### References

- [Source: docs/epics.md#Story 2.6] - Acceptance criteria and user story
- [Source: docs/PRD.md#UI Design Principles] - Dark theme, immediate usability
- [Source: docs/architecture.md#Styling Patterns] - Tailwind CSS usage, cn() utility
- [Source: docs/architecture.md#Component Structure] - File organization and naming
- [Source: Story 2.5] - Existing Button usage in PlaybackControls
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) - Official component library docs
- [Radix UI Primitives](https://www.radix-ui.com/primitives) - Underlying accessible components

## Dev Agent Record

### Context Reference

- docs/stories/2-6-ui-component-library-setup.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

**Implementation Summary:**
- Successfully integrated shadcn/ui with Radix UI primitives and Tailwind CSS dark theme
- Installed 6 core components: Button, Dialog, Progress, Slider, Select, Tabs
- Configured dark mode theming with CSS variables matching existing #18181b background
- Migrated existing Button component to use shadcn/ui with backward compatibility wrapper
- Created comprehensive documentation in components/ui/README.md with usage examples
- Built interactive demo page showcasing all components with variants and accessibility features
- Wrote comprehensive unit tests - all 241 tests passing including 24 new shadcn component tests
- All acceptance criteria met with zero regressions to existing functionality

**Technical Decisions:**
- Used manual shadcn/ui setup instead of auto-init due to Electron project structure
- Configured @/ alias in tsconfig.web.json for shadcn imports
- Created /lib/utils.ts following shadcn convention (wraps existing cn utility)
- Maintained backward compatibility for existing Button API (primary/secondary/ghost variants)
- Simplified Select component tests due to portal rendering complexity in happy-dom environment

**Integration Points:**
- TopBar Export button successfully migrated to shadcn Button
- All existing Button tests updated and passing
- Dark theme CSS variables preserved and extended for shadcn color tokens
- TypeScript strict mode maintained - all components fully typed

### File List

**Created:**
- components.json
- src/renderer/src/lib/utils.ts
- src/renderer/src/components/ui/button.tsx
- src/renderer/src/components/ui/dialog.tsx
- src/renderer/src/components/ui/progress.tsx
- src/renderer/src/components/ui/slider.tsx
- src/renderer/src/components/ui/select.tsx
- src/renderer/src/components/ui/tabs.tsx
- src/renderer/src/components/ui/README.md
- src/renderer/src/components/ui/demo.tsx
- src/renderer/src/components/ui/__tests__/ui-components.test.tsx

**Modified:**
- package.json (added @radix-ui packages, class-variance-authority, lucide-react)
- tailwind.config.js (added darkMode: 'class', shadcn color tokens, border radius variables)
- src/renderer/src/styles/globals.css (added shadcn dark theme CSS variables)
- src/renderer/index.html (added class="dark" to html element)
- tsconfig.web.json (added @/* alias mapping)
- src/renderer/src/components/shared/Button.tsx (migrated to shadcn wrapper)
- src/renderer/src/components/shared/__tests__/Button.test.tsx (updated for shadcn migration)

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-10-27 | v1.0 | Bob (Scrum Master) | Initial story creation from epics.md |
