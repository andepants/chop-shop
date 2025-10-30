/**
 * Results Panel
 *
 * Displays generated content results with left sidebar navigation, streaming support,
 * copy controls, character counting, and individual platform regeneration.
 * Shows real-time updates as AI generates content for each platform.
 */

import { useEffect, useState, useRef } from 'react'
import { useAIStore, type Platform } from '../../store/aiStore'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import {
  Copy,
  Check,
  Loader2,
  Youtube,
  Twitter,
  Linkedin,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react'

/**
 * Character limits for each platform
 */
const PLATFORM_LIMITS: Record<Platform, number | null> = {
  twitter: 280,
  linkedin: 3000,
  youtube: null // No hard limit
}

/**
 * Platform configuration for rendering
 */
const PLATFORM_CONFIG: Array<{
  id: Platform
  label: string
  icon: React.ReactNode
  color: string
}> = [
  {
    id: 'youtube',
    label: 'YouTube Description',
    icon: <Youtube className="w-4 h-4" />,
    color: 'text-red-500'
  },
  {
    id: 'twitter',
    label: 'Twitter Post',
    icon: <Twitter className="w-4 h-4" />,
    color: 'text-blue-400'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Post',
    icon: <Linkedin className="w-4 h-4" />,
    color: 'text-blue-600'
  }
]

/**
 * Platform Navigation Item Component
 * Displays platform in sidebar with status indicators
 */
function PlatformNavItem({
  platform,
  isActive,
  onClick
}: {
  platform: Platform
  isActive: boolean
  onClick: () => void
}) {
  const content = useAIStore((state) => state.generatedPosts[platform])
  const streamingStatus = useAIStore((state) => state.streamingStatus[platform])

  const config = PLATFORM_CONFIG.find((p) => p.id === platform)!
  const limit = PLATFORM_LIMITS[platform]

  const charCount = content.length
  const exceedsLimit = limit !== null && charCount > limit

  const isLoading = streamingStatus === 'streaming'
  const isError = streamingStatus === 'error'
  const hasContent = content.length > 0

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-2 rounded-lg mb-2 text-left transition-all
        ${isActive ? 'bg-zinc-800 border border-cyan-500/30' : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-850'}
      `}
    >
      {/* Platform Icon and Label */}
      <div className="flex items-center gap-2 mb-2">
        <span className={config.color}>{config.icon}</span>
        <span className="text-xs font-medium text-zinc-300">{config.label}</span>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 text-xs">
        {isLoading && (
          <div className="flex items-center gap-1 text-cyan-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-3 h-3" />
            <span>Error</span>
          </div>
        )}

        {hasContent && !isLoading && !isError && (
          <div className="flex items-center gap-2">
            <span className={exceedsLimit ? 'text-red-500 font-medium' : 'text-zinc-500'}>
              {charCount}
              {limit !== null && ` / ${limit}`} chars
            </span>
            {exceedsLimit && <AlertCircle className="w-3 h-3 text-red-500" />}
          </div>
        )}

        {!hasContent && !isLoading && (
          <span className="text-zinc-600">Waiting...</span>
        )}
      </div>
    </button>
  )
}

/**
 * Platform Content Component
 * Displays full content for selected platform with controls
 */
function PlatformContent({ platform }: { platform: Platform }) {
  const [copied, setCopied] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef<number>(0)

  const content = useAIStore((state) => state.generatedPosts[platform])
  const streamingStatus = useAIStore((state) => state.streamingStatus[platform])
  const regeneratePlatform = useAIStore((state) => state.regeneratePlatform)

  const config = PLATFORM_CONFIG.find((p) => p.id === platform)!
  const limit = PLATFORM_LIMITS[platform]

  const charCount = content.length
  const exceedsLimit = limit !== null && charCount > limit

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (streamingStatus === 'streaming' && shouldAutoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, streamingStatus, shouldAutoScroll])

  // Detect manual scroll to disable auto-scroll
  function handleScroll(): void {
    if (!contentRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10

    if (scrollTop < lastScrollTop.current && !isAtBottom) {
      setShouldAutoScroll(false)
    }

    if (isAtBottom) {
      setShouldAutoScroll(true)
    }

    lastScrollTop.current = scrollTop
  }

  /**
   * Copy content to clipboard
   */
  async function handleCopy(): Promise<void> {
    try {
      const response = await window.api.writeClipboard(content)

      if (response.success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        console.error('Failed to copy to clipboard:', response.error)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  /**
   * Regenerate content for this platform
   */
  async function handleRegenerate(): Promise<void> {
    setIsRegenerating(true)
    try {
      await regeneratePlatform(platform)
    } catch (error) {
      console.error('Failed to regenerate:', error)
    } finally {
      // Keep showing regenerating state until streaming completes
      setTimeout(() => setIsRegenerating(false), 500)
    }
  }

  const isLoading = streamingStatus === 'streaming'
  const isIdle = streamingStatus === 'idle'
  const isError = streamingStatus === 'error'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`${config.color} scale-125`}>{config.icon}</span>
          <h2 className="text-xl font-semibold text-zinc-300">{config.label}</h2>
        </div>

        {/* Regenerate Button */}
        {content && (
          <Button
            onClick={handleRegenerate}
            disabled={isLoading || isRegenerating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-6 mb-4 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Idle State */}
        {isIdle && !content && (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <p className="text-sm">Waiting for generation...</p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && !content && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              <p className="text-sm text-zinc-500">Generating...</p>
            </div>
          </div>
        )}

        {/* Content Display */}
        {content && (
          <div className="text-base text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </div>
        )}

        {/* Streaming Indicator */}
        {isLoading && content && (
          <div className="inline-flex items-center gap-1 mt-3">
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Generation failed for {platform}</p>
              <Button onClick={handleRegenerate} variant="outline" size="sm" className="mt-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Character Count and Actions */}
      <div className="flex items-center justify-between">
        {/* Character Count */}
        <div>
          {content && (
            <div className="flex items-center gap-2">
              <p className={`text-sm ${exceedsLimit ? 'text-red-500 font-medium' : 'text-zinc-500'}`}>
                {charCount}
                {limit !== null && ` / ${limit}`} characters
              </p>
              {exceedsLimit && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Exceeds {config.label} character limit</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          disabled={!content || isLoading}
          variant="default"
          size="default"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Results Panel Component
 * Main container with sidebar navigation and platform content display
 */
export function ResultsPanel() {
  const generationStatus = useAIStore((state) => state.generationStatus)
  const selectedPlatforms = useAIStore((state) => state.selectedPlatforms)
  const clearGeneratedPosts = useAIStore((state) => state.clearGeneratedPosts)
  const appendStreamChunk = useAIStore((state) => state.appendStreamChunk)
  const setStreamingStatus = useAIStore((state) => state.setStreamingStatus)

  // Track which platform is currently displayed
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)

  // Auto-select first platform when platforms change
  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatform) {
      setSelectedPlatform(selectedPlatforms[0])
    }
    // If selected platform is no longer in the list, select first available
    if (selectedPlatform && !selectedPlatforms.includes(selectedPlatform)) {
      setSelectedPlatform(selectedPlatforms[0] || null)
    }
  }, [selectedPlatforms, selectedPlatform])

  // Listen for streaming chunks from main process
  useEffect(() => {
    function handleStreamChunk(
      _event: unknown,
      chunk: { platform: Platform; content: string; complete: boolean }
    ): void {
      if (!chunk.complete) {
        appendStreamChunk(chunk.platform, chunk.content)
        setStreamingStatus(chunk.platform, 'streaming')
      } else {
        setStreamingStatus(chunk.platform, 'complete')
      }
    }

    window.electron.ipcRenderer.on('ai-stream-chunk', handleStreamChunk)

    return () => {
      window.electron.ipcRenderer.removeListener('ai-stream-chunk', handleStreamChunk)
    }
  }, [appendStreamChunk, setStreamingStatus])

  // Handle clear action
  function handleClear(): void {
    if (confirm('Clear all generated content? This action cannot be undone.')) {
      clearGeneratedPosts()
      setSelectedPlatform(null)
    }
  }

  // Show empty state if no generation has started
  const hasContent = selectedPlatforms.some((platform) => {
    const content = useAIStore.getState().generatedPosts[platform]
    return content.trim().length > 0
  })

  const isGenerating = generationStatus === 'generating'

  // Empty state
  if (!hasContent && !isGenerating) {
    return (
      <div className="h-full p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-zinc-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-zinc-400 mb-2">No Results Yet</h3>
              <p className="text-sm text-zinc-600">
                Generate content in the <span className="text-cyan-500">Generate</span> tab to see
                results here
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main layout with sidebar
  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <div className="w-56 border-r border-zinc-800 p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Platforms</h3>
        </div>

        {/* Platform Navigation Items */}
        {PLATFORM_CONFIG.filter((p) => selectedPlatforms.includes(p.id)).map((platformConfig) => (
          <PlatformNavItem
            key={platformConfig.id}
            platform={platformConfig.id}
            isActive={selectedPlatform === platformConfig.id}
            onClick={() => setSelectedPlatform(platformConfig.id)}
          />
        ))}

        {/* Clear Button */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <Button onClick={handleClear} variant="outline" size="sm" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Results
          </Button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto h-full">
          {selectedPlatform ? (
            <PlatformContent platform={selectedPlatform} />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <p>Select a platform from the sidebar</p>
            </div>
          )}

          {/* Help Text */}
          {isGenerating && (
            <Alert className="bg-cyan-500/10 border-cyan-500/20 mt-6">
              <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
              <AlertDescription className="text-cyan-500">
                Generating content... This may take a few moments.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
