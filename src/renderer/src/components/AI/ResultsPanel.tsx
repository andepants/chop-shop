/**
 * Results Panel
 *
 * Displays generated content results with streaming support, copy controls,
 * and character counting. Shows real-time updates as AI generates content
 * for each platform (YouTube, Twitter, LinkedIn).
 */

import { useEffect, useState, useRef } from 'react'
import { useAIStore, type Platform } from '../../store/aiStore'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import { Copy, Check, Loader2, Youtube, Twitter, Linkedin, AlertCircle, Trash2 } from 'lucide-react'

/**
 * Character limits for each platform
 */
const PLATFORM_LIMITS: Record<Platform, number | null> = {
  twitter: 280,
  linkedin: 3000,
  youtube: null // No hard limit
}

/**
 * Platform configuration for rendering cards
 */
const PLATFORM_CONFIG: Array<{
  id: Platform
  label: string
  icon: React.ReactNode
  color: string
}> = [
  { id: 'youtube', label: 'YouTube Description', icon: <Youtube className="w-5 h-5" />, color: 'text-red-500' },
  { id: 'twitter', label: 'Twitter Post', icon: <Twitter className="w-5 h-5" />, color: 'text-blue-400' },
  { id: 'linkedin', label: 'LinkedIn Post', icon: <Linkedin className="w-5 h-5" />, color: 'text-blue-600' }
]

/**
 * Platform Result Card Component
 * Displays individual platform's generated content with streaming, character count, and copy button
 */
function PlatformResultCard({ platform }: { platform: Platform }) {
  const [copied, setCopied] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef<number>(0)

  // State from aiStore
  const content = useAIStore((state) => state.generatedPosts[platform])
  const streamingStatus = useAIStore((state) => state.streamingStatus[platform])

  // Get platform config
  const config = PLATFORM_CONFIG.find((p) => p.id === platform)!
  const limit = PLATFORM_LIMITS[platform]

  // Calculate character count
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

    // If user scrolled up, disable auto-scroll
    if (scrollTop < lastScrollTop.current && !isAtBottom) {
      setShouldAutoScroll(false)
    }

    // If user scrolled back to bottom, re-enable auto-scroll
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
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback using document.execCommand (deprecated but works)
      try {
        const textArea = document.createElement('textarea')
        textArea.value = content
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
      }
    }
  }

  // Loading state
  const isLoading = streamingStatus === 'streaming'
  const isIdle = streamingStatus === 'idle'
  const isError = streamingStatus === 'error'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <h3 className="text-base font-medium text-zinc-300">{config.label}</h3>
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-3 mb-3 overflow-y-auto min-h-[150px] max-h-[250px] relative"
        style={{
          scrollBehavior: 'smooth'
        }}
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
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              <p className="text-sm text-zinc-500">Generating...</p>
            </div>
          </div>
        )}

        {/* Content Display */}
        {content && (
          <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words transition-all duration-150 ease-out">
            {content}
          </div>
        )}

        {/* Streaming Indicator */}
        {isLoading && content && (
          <div className="inline-flex items-center gap-1 mt-2">
            <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm">Generation failed for {platform}</p>
            </div>
          </div>
        )}
      </div>

      {/* Character Count and Warning */}
      <div className="mb-3">
        {content && (
          <div className="flex items-center gap-2">
            <p className={`text-xs ${exceedsLimit ? 'text-red-500 font-medium' : 'text-zinc-500'}`}>
              {charCount}
              {limit !== null && ` / ${limit}`} characters
            </p>
            {exceedsLimit && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">Exceeds {config.label} character limit</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Copy Button */}
      <Button
        onClick={handleCopy}
        disabled={!content || isLoading}
        variant="outline"
        size="sm"
        className="w-full"
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
  )
}

/**
 * Results Panel Component
 * Main container for displaying generated content across all platforms
 */
export function ResultsPanel() {
  const generationStatus = useAIStore((state) => state.generationStatus)
  const selectedPlatforms = useAIStore((state) => state.selectedPlatforms)
  const clearGeneratedPosts = useAIStore((state) => state.clearGeneratedPosts)
  const appendStreamChunk = useAIStore((state) => state.appendStreamChunk)
  const setStreamingStatus = useAIStore((state) => state.setStreamingStatus)

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

    // Subscribe to stream events
    window.electron.ipcRenderer.on('ai-stream-chunk', handleStreamChunk)

    // Cleanup listener on unmount
    return () => {
      window.electron.ipcRenderer.removeListener('ai-stream-chunk', handleStreamChunk)
    }
  }, [appendStreamChunk, setStreamingStatus])

  // Handle clear action
  function handleClear(): void {
    if (confirm('Clear all generated content? This action cannot be undone.')) {
      clearGeneratedPosts()
    }
  }

  // Show empty state if no generation has started
  const hasContent = selectedPlatforms.some((platform) => {
    const content = useAIStore.getState().generatedPosts[platform]
    return content.trim().length > 0
  })

  const isGenerating = generationStatus === 'generating'

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-300 mb-1">Results</h2>
            <p className="text-sm text-zinc-500">
              Your generated social media posts appear here in real-time
            </p>
          </div>

          {/* Clear Button */}
          {hasContent && !isGenerating && (
            <Button onClick={handleClear} variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Results
            </Button>
          )}
        </div>

        {/* Empty State */}
        {!hasContent && !isGenerating && (
          <div className="flex items-center justify-center min-h-[400px]">
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
        )}

        {/* Platform Cards Grid */}
        {(hasContent || isGenerating) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {PLATFORM_CONFIG.filter((p) => selectedPlatforms.includes(p.id)).map((platformConfig) => (
              <PlatformResultCard key={platformConfig.id} platform={platformConfig.id} />
            ))}
          </div>
        )}

        {/* Help Text */}
        {isGenerating && (
          <Alert className="bg-cyan-500/10 border-cyan-500/20">
            <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
            <AlertDescription className="text-cyan-500">
              Generating content... This may take a few moments.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
