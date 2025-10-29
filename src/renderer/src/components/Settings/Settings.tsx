/**
 * Settings Component
 *
 * Main settings dialog for the application.
 * Provides access to various configuration panels including AI settings.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AISettings } from './AISettings'
import { Settings as SettingsIcon } from 'lucide-react'

interface SettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Settings Dialog Component
 *
 * Tabbed interface for application settings
 */
export function Settings({ open, onOpenChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('ai')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your application preferences and integrations
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="ai">AI Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-6">
            <AISettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
