/**
 * History Panel
 *
 * Displays chronological list of past transcriptions and generated posts.
 * Allows users to load previous generations and clear cache.
 */

import { useEffect } from 'react'
import { useAIStore } from '../../store/aiStore'
import { Button } from '../ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog'
import { Card } from '../ui/card'
import { Trash2, FileText, Youtube, Twitter, Linkedin } from 'lucide-react'
import type { CacheEntry, Platform } from '../../types/cache.types'

/**
 * Platform icon mapping
 */
const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  twitter: <Twitter className="w-4 h-4 text-blue-400" />,
  linkedin: <Linkedin className="w-4 h-4 text-blue-600" />
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * History Entry Card Component
 * Displays a single cache entry with clickable action
 */
function HistoryEntryCard({
  entry,
  onClick
}: {
  entry: CacheEntry
  onClick: (entry: CacheEntry) => void
}) {
  const platforms = entry.generatedPosts.map((post) => post.platform)
  const snippet = truncate(entry.transcription.text, 100)

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 p-4 cursor-pointer hover:bg-zinc-800 transition-colors"
      onClick={() => onClick(entry)}
    >
      {/* Timestamp */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{formatTimestamp(entry.createdAt)}</span>
        <FileText className="w-4 h-4 text-zinc-600" />
      </div>

      {/* Transcription Snippet */}
      <p className="text-sm text-zinc-300 mb-3 leading-relaxed">{snippet}</p>

      {/* Generated Platforms */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Generated:</span>
        <div className="flex gap-1.5">
          {platforms.map((platform) => (
            <div key={platform} className="flex items-center">
              {PLATFORM_ICONS[platform]}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">No history yet</h2>
        <p className="text-sm text-zinc-500">
          Generate your first posts to see them here. Your transcription and generation history will
          be saved for easy access.
        </p>
      </div>
    </div>
  )
}

/**
 * History Panel Component
 */
export function HistoryPanel() {
  const cacheEntries = useAIStore((state) => state.cacheEntries)
  const loadCache = useAIStore((state) => state.loadCache)
  const clearCache = useAIStore((state) => state.clearCache)

  // Load cache on mount
  useEffect(() => {
    loadCache()
  }, [loadCache])

  /**
   * Handle history entry click
   * Loads transcription and posts into respective tabs
   */
  function handleEntryClick(entry: CacheEntry): void {
    const aiStore = useAIStore.getState()

    // Load transcription into Transcribe tab
    aiStore.setTranscriptionText(entry.transcription.text)
    aiStore.setTranscription(
      entry.transcription.text,
      entry.transcription.duration,
      undefined
    )

    // Load generation request settings
    aiStore.setUserGuidance(entry.request.userGuidance || '')
    aiStore.setIncludeTranscription(!!entry.request.transcription)
    aiStore.setIncludeEmojis(entry.request.includeEmojis)

    // Set personas (clear existing first)
    aiStore.clearPersonas()
    entry.request.personas.forEach((personaId) => {
      aiStore.addPersona(personaId)
    })

    // Load generated posts into Results tab
    const postsMap = {
      youtube: '',
      twitter: '',
      linkedin: ''
    }

    entry.generatedPosts.forEach((post) => {
      postsMap[post.platform] = post.content
    })

    // Clear existing posts first
    aiStore.clearGeneratedPosts()

    // Set new posts
    Object.entries(postsMap).forEach(([platform, content]) => {
      if (content) {
        aiStore.appendStreamChunk(platform as Platform, content)
        aiStore.setStreamingStatus(platform as Platform, 'complete')
      }
    })

    // Set generation status to complete
    aiStore.setGenerationStatus('complete')

    // Optional: Navigate to Results tab automatically
    // This would require passing a callback or using a navigation state
    // For now, user can manually switch tabs to see loaded content
  }

  /**
   * Handle clear cache confirmation
   */
  async function handleClearCache(): Promise<void> {
    const success = await clearCache()
    if (!success) {
      console.error('Failed to clear cache')
      // Could show toast notification here
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Clear Cache button */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-300">History</h2>

        {cacheEntries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Clear Cache
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all cache?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all cached transcriptions and generated posts. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCache}>Clear Cache</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {cacheEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {cacheEntries.map((entry) => (
              <HistoryEntryCard key={entry.id} entry={entry} onClick={handleEntryClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
