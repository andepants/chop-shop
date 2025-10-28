# shadcn/ui Components Documentation

This directory contains UI components from [shadcn/ui](https://ui.shadcn.com) - a collection of re-usable components built with Radix UI primitives and styled with Tailwind CSS.

## Overview

shadcn/ui components are **not installed as npm packages**. Instead, the source code is copied directly into your project, giving you full ownership and customization ability. All components use:

- **Radix UI** primitives for accessibility and behavior
- **Tailwind CSS** for styling with CSS variables for theming
- **class-variance-authority** (cva) for variant management
- **TypeScript** for full type safety

## Installation

Components were installed using the shadcn CLI:

\`\`\`bash
npx shadcn@latest add [component-name]
\`\`\`

Configuration is managed in `components.json` at the project root.

## Dark Mode

All components are configured for dark mode by default. The app uses:

- `darkMode: 'class'` in `tailwind.config.js`
- `dark` class on `<html>` element in `index.html`
- CSS variables in `globals.css` for shadcn color tokens

## Available Components

### Button

A versatile button component with multiple variants and sizes.

**Variants:**
- `default` - Primary button with solid background
- `destructive` - Destructive actions (delete, remove)
- `outline` - Outlined button with transparent background
- `secondary` - Secondary actions
- `ghost` - Minimal button with no background
- `link` - Text link styled as button

**Sizes:**
- `default` - Standard size (h-10 px-4 py-2)
- `sm` - Small size (h-9 px-3)
- `lg` - Large size (h-11 px-8)
- `icon` - Square icon button (h-10 w-10)

**Usage:**

\`\`\`tsx
import { Button } from '@/components/ui/button'

// Default button
<Button>Click me</Button>

// Variants
<Button variant="default">Export</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// With icon
<Button size="icon">
  <PlusIcon />
</Button>

// Disabled state
<Button disabled>Disabled</Button>

// Custom className
<Button className="w-full">Full Width</Button>
\`\`\`

**TypeScript:**

\`\`\`tsx
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
\`\`\`

---

### Dialog

A modal dialog component for overlays and confirmations.

**Usage:**

\`\`\`tsx
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
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Export Settings</DialogTitle>
      <DialogDescription>
        Choose your export resolution and format.
      </DialogDescription>
    </DialogHeader>
    {/* Form content goes here */}
  </DialogContent>
</Dialog>
\`\`\`

**Features:**
- Accessible with ARIA attributes
- Focus trap and keyboard navigation (Esc to close)
- Click outside to dismiss
- Animated entrance/exit
- Portal rendering (renders at document root)

**Keyboard Navigation:**
- `Escape` - Close dialog
- `Tab` - Cycle through focusable elements

---

### Progress

A progress bar component for showing completion status.

**Usage:**

\`\`\`tsx
import { Progress } from '@/components/ui/progress'

// Basic progress
<Progress value={45} className="w-full" />

// With state
const [progress, setProgress] = useState(0)

useEffect(() => {
  const timer = setTimeout(() => setProgress(66), 500)
  return () => clearTimeout(timer)
}, [])

<Progress value={progress} />
\`\`\`

**Props:**
- `value: number` - Progress value (0-100)
- `className?: string` - Additional CSS classes
- `max?: number` - Maximum value (default: 100)

**Use Cases:**
- Export progress indicators
- File upload progress
- Video rendering progress
- Loading states

---

### Slider

A range slider component for numeric input.

**Usage:**

\`\`\`tsx
import { Slider } from '@/components/ui/slider'

const [zoomLevel, setZoomLevel] = useState([50])

<Slider
  value={zoomLevel}
  onValueChange={setZoomLevel}
  min={0}
  max={100}
  step={1}
  className="w-full"
/>
\`\`\`

**Props:**
- `value: number[]` - Current value (array for multiple thumbs)
- `onValueChange: (value: number[]) => void` - Change callback
- `min: number` - Minimum value
- `max: number` - Maximum value
- `step: number` - Step increment
- `disabled?: boolean` - Disabled state

**Use Cases:**
- Timeline zoom controls
- Volume controls
- Playback speed adjustment
- Opacity/transparency settings

**Keyboard Navigation:**
- Arrow keys - Increment/decrement by step
- Home/End - Jump to min/max
- PageUp/PageDown - Larger increments

---

### Select

A dropdown select component for choosing from options.

**Usage:**

\`\`\`tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const [resolution, setResolution] = useState('1080p')

<Select value={resolution} onValueChange={setResolution}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Select resolution" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="720p">720p (1280x720)</SelectItem>
    <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
    <SelectItem value="4k">4K (3840x2160)</SelectItem>
    <SelectItem value="source">Source Quality</SelectItem>
  </SelectContent>
</Select>
\`\`\`

**Features:**
- Accessible with ARIA attributes
- Keyboard navigation
- Search/type to filter
- Customizable styling
- Portal rendering for dropdown

**Keyboard Navigation:**
- Arrow keys - Navigate options
- Enter/Space - Select option
- Escape - Close dropdown
- Type to search - Filter options

**Use Cases:**
- Resolution picker
- Format selector (MP4, MOV, WebM)
- Codec selection
- Quality presets

---

### Tabs

A tabs component for organizing content into switchable panels.

**Usage:**

\`\`\`tsx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

<Tabs defaultValue="track1" className="w-full">
  <TabsList>
    <TabsTrigger value="track1">Video Track 1</TabsTrigger>
    <TabsTrigger value="track2">Video Track 2</TabsTrigger>
    <TabsTrigger value="audio">Audio</TabsTrigger>
  </TabsList>
  <TabsContent value="track1">
    {/* Track 1 timeline clips */}
  </TabsContent>
  <TabsContent value="track2">
    {/* Track 2 timeline clips */}
  </TabsContent>
  <TabsContent value="audio">
    {/* Audio waveform */}
  </TabsContent>
</Tabs>
\`\`\`

**Props:**
- `defaultValue: string` - Initially active tab
- `value: string` - Controlled active tab
- `onValueChange: (value: string) => void` - Change callback

**Features:**
- Accessible with ARIA attributes
- Keyboard navigation
- Smooth transitions
- Roving tab index for focus management

**Keyboard Navigation:**
- Arrow keys - Navigate between tabs
- Home/End - Jump to first/last tab
- Tab - Move focus to active panel

**Use Cases:**
- Multi-track timeline selection
- Settings panels (General, Video, Audio, Export)
- Inspector panels (Properties, Effects, Adjustments)

---

## Accessibility

All shadcn components are built with accessibility in mind:

- **Keyboard Navigation** - Full keyboard support for all interactions
- **Screen Readers** - Proper ARIA labels and roles
- **Focus Management** - Visible focus indicators and logical tab order
- **Color Contrast** - Dark theme meets WCAG AA standards
- **Semantic HTML** - Proper use of HTML5 elements

## Customization

Components can be customized in several ways:

1. **CSS Variables** - Modify theme colors in `globals.css`
2. **Tailwind Classes** - Add `className` prop for custom styling
3. **Component Variants** - Edit variant definitions in component files
4. **Source Code** - Full ownership means you can modify anything

## Testing

All components have unit tests in `__tests__/` directories. See test files for usage examples and component API documentation.

Run tests:

\`\`\`bash
npm run test
\`\`\`

## References

- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com)
- [class-variance-authority](https://cva.style/docs)
