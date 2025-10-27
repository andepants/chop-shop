# Story 2.6: UI Component Library Setup

Status: ready-for-dev

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

- [ ] Task 1: Initialize shadcn/ui configuration (AC: #1)
  - [ ] Run `npx shadcn@latest init` to bootstrap shadcn/ui
  - [ ] Configure components.json for React + Tailwind setup
  - [ ] Verify Radix UI primitives installed (@radix-ui/react-*)
  - [ ] Test installation by running `npx shadcn@latest add button`
  - [ ] Verify components/ui folder created with proper structure

- [ ] Task 2: Install core UI components (AC: #2)
  - [ ] Install Button: `npx shadcn@latest add button`
  - [ ] Install Dialog: `npx shadcn@latest add dialog`
  - [ ] Install Progress: `npx shadcn@latest add progress`
  - [ ] Install Slider: `npx shadcn@latest add slider`
  - [ ] Install Select: `npx shadcn@latest add select`
  - [ ] Install Tabs: `npx shadcn@latest add tabs`
  - [ ] Verify all components render correctly in isolation

- [ ] Task 3: Configure dark mode theming (AC: #4)
  - [ ] Update tailwind.config.js with shadcn color tokens
  - [ ] Configure CSS variables in globals.css for dark theme
  - [ ] Set darkMode: 'class' in Tailwind config
  - [ ] Test component rendering in dark mode
  - [ ] Ensure consistency with existing dark theme (#18181b background)

- [ ] Task 4: Migrate existing Button component (AC: #3, #7)
  - [ ] Identify all usages of existing Button in codebase
  - [ ] Replace shared/Button.tsx with shadcn Button import
  - [ ] Update import paths: `from '@/components/ui/button'`
  - [ ] Preserve existing className and onClick behavior
  - [ ] Test PlaybackControls play/pause button still works
  - [ ] Test any other buttons in Layout/TopBar
  - [ ] Run all existing tests to verify no regressions

- [ ] Task 5: Add TypeScript types and documentation (AC: #5, #6)
  - [ ] Verify all ui components export proper TypeScript types
  - [ ] Create components/ui/README.md with usage examples
  - [ ] Document Button variants: default, destructive, outline, ghost
  - [ ] Document Dialog usage pattern for modals
  - [ ] Document Progress for export progress indicators
  - [ ] Document Slider for timeline zoom controls
  - [ ] Add JSDoc comments to each ui component

- [ ] Task 6: Create example storybook/demo page (AC: #6)
  - [ ] Create components/ui/demo.tsx (dev-only component)
  - [ ] Show all installed components with variants
  - [ ] Include dark mode toggle for testing
  - [ ] Document accessibility features (keyboard nav, ARIA)

- [ ] Task 7: Write unit tests for ui components (AC: #7)
  - [ ] Test Button renders with all variants
  - [ ] Test Dialog opens/closes correctly
  - [ ] Test Progress updates value prop
  - [ ] Test Slider onChange callback
  - [ ] Test Select options rendering
  - [ ] Test Tabs switching between panels
  - [ ] Verify all tests pass with existing test suite

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

### File List

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-10-27 | v1.0 | Bob (Scrum Master) | Initial story creation from epics.md |
