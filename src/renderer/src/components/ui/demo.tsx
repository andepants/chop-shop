/**
 * UI Components Demo Page
 * Development-only page showcasing all shadcn/ui components with variants
 * Shows dark mode theming, accessibility features, and usage examples
 *
 * This component is for development reference only - not used in production
 */
import { useState } from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './dialog'
import { Progress } from './progress'
import { Slider } from './slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

/**
 * Demo page component showing all installed shadcn/ui components
 * Includes examples of all variants, sizes, and interactive states
 */
export function UIDemo(): React.JSX.Element {
  const [progress, setProgress] = useState(45)
  const [sliderValue, setSliderValue] = useState([50])
  const [selectValue, setSelectValue] = useState('1080p')

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-50">shadcn/ui Components Demo</h1>
          <p className="text-zinc-400">
            Development reference showing all installed components with dark mode theming
          </p>
        </div>

        {/* Button Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Button</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-300">Variants</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-300">Sizes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-300">States</h3>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button variant="secondary" disabled>
                  Disabled Secondary
                </Button>
                <Button className="w-48">Full Width</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Dialog Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Dialog</h2>
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Accessible modal dialog with keyboard navigation (Esc to close)
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Settings</DialogTitle>
                  <DialogDescription>
                    Configure your video export settings. Choose resolution and output location.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Resolution</label>
                    <Select defaultValue="1080p">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button className="flex-1">Export</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Progress Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Progress</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Export Progress: {progress}%</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    -10%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    +10%
                  </Button>
                </div>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Static Examples</p>
              <Progress value={25} className="w-full" />
              <Progress value={50} className="w-full" />
              <Progress value={75} className="w-full" />
              <Progress value={100} className="w-full" />
            </div>
          </div>
        </section>

        {/* Slider Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Slider</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Timeline Zoom: {sliderValue[0]}%</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSliderValue([50])}
                >
                  Reset
                </Button>
              </div>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Keyboard Navigation: Arrow keys, Home, End</p>
              <Slider defaultValue={[33]} min={0} max={100} step={1} className="w-full" />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Disabled State</p>
              <Slider defaultValue={[66]} disabled className="w-full" />
            </div>
          </div>
        </section>

        {/* Select Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Select</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">
                Current Selection: <span className="text-zinc-100 font-medium">{selectValue}</span>
              </p>
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                  <SelectItem value="1440p">1440p (2560x1440)</SelectItem>
                  <SelectItem value="4k">4K (3840x2160)</SelectItem>
                  <SelectItem value="source">Source Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Format Selection</p>
              <Select defaultValue="mp4">
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                  <SelectItem value="mov">MOV (ProRes)</SelectItem>
                  <SelectItem value="webm">WebM (VP9)</SelectItem>
                  <SelectItem value="avi">AVI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Tabs Component */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-50">Tabs</h2>
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Accessible tabs with keyboard navigation (Arrow keys, Home, End)
            </p>
            <Tabs defaultValue="video" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>
              <TabsContent value="video" className="space-y-4">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-50 mb-2">Video Settings</h3>
                  <p className="text-sm text-zinc-400">
                    Configure video codec, bitrate, and quality settings.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      Advanced Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="audio" className="space-y-4">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-50 mb-2">Audio Settings</h3>
                  <p className="text-sm text-zinc-400">
                    Configure audio codec, sample rate, and channels.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      Advanced Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="export" className="space-y-4">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-50 mb-2">Export Settings</h3>
                  <p className="text-sm text-zinc-400">
                    Configure output location, filename, and metadata.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button size="sm" className="w-full">
                      Export Now
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Accessibility Notes */}
        <section className="space-y-4 border-t border-zinc-700 pt-8">
          <h2 className="text-2xl font-semibold text-zinc-50">Accessibility Features</h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-zinc-300">Keyboard Navigation:</strong> All components fully
                keyboard accessible
              </li>
              <li>
                <strong className="text-zinc-300">Screen Readers:</strong> Proper ARIA labels and
                roles
              </li>
              <li>
                <strong className="text-zinc-300">Focus Indicators:</strong> Visible focus rings for
                keyboard users
              </li>
              <li>
                <strong className="text-zinc-300">Color Contrast:</strong> Dark theme meets WCAG AA
                standards
              </li>
              <li>
                <strong className="text-zinc-300">Semantic HTML:</strong> Proper use of HTML5
                elements
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
