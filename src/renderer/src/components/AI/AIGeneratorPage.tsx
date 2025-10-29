/**
 * AI Generator Page
 *
 * Main container for AI-powered content generation features.
 * Provides tabbed navigation between History, Transcription, Generation, and Results.
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Sparkles } from 'lucide-react'
import { HistoryPanel } from './HistoryPanel'
import { TranscriptionPanel } from './TranscriptionPanel'
import { GenerationPanel } from './GenerationPanel'
import { ResultsPanel } from './ResultsPanel'

/**
 * AI Generator Page Component
 *
 * Full-screen page for AI content generation with tab navigation.
 * Part of the 3-step workflow (Edit → Export → Generate Posts).
 */
export function AIGeneratorPage() {
  const [activeTab, setActiveTab] = useState('transcribe')

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      {/* Top Bar */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-500" />
          <h1 className="text-lg font-semibold text-zinc-100">Generate Posts</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tab List */}
          <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-zinc-900 p-0 h-12">
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-zinc-800 px-6 h-full"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              value="transcribe"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-zinc-800 px-6 h-full"
            >
              Transcribe
            </TabsTrigger>
            <TabsTrigger
              value="generate"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-zinc-800 px-6 h-full"
            >
              Generate
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-zinc-800 px-6 h-full"
            >
              Results
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="history" className="m-0 h-full">
              <HistoryPanel />
            </TabsContent>

            <TabsContent value="transcribe" className="m-0 h-full">
              <TranscriptionPanel />
            </TabsContent>

            <TabsContent value="generate" className="m-0 h-full">
              <GenerationPanel onGenerationStart={() => setActiveTab('results')} />
            </TabsContent>

            <TabsContent value="results" className="m-0 h-full">
              <ResultsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
