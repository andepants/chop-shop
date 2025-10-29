/**
 * AI Settings Component
 *
 * Provides UI for managing OpenAI API key configuration.
 * Includes secure key input, connection testing, and key management.
 */

import { useState, useEffect } from 'react'
import { useAIStore } from '../../store/aiStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Key, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react'

/**
 * AI Settings Panel Component
 *
 * Allows users to:
 * - Store OpenAI API key securely
 * - Test API connection
 * - Clear stored API key
 */
export function AISettings() {
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const {
    hasApiKey,
    isTestingConnection,
    lastTestResult,
    checkApiKey,
    testConnection,
    storeApiKey,
    clearApiKey,
    clearTestResult
  } = useAIStore()

  // Check for existing API key on mount
  useEffect(() => {
    checkApiKey()
  }, [checkApiKey])

  /**
   * Handle API key save
   */
  const handleSave = async () => {
    if (!apiKey.trim()) {
      return
    }

    setIsSaving(true)

    try {
      const success = await storeApiKey(apiKey)

      if (success) {
        // Clear input after successful save
        setApiKey('')
      }
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle connection test
   */
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      return
    }

    await testConnection(apiKey)
  }

  /**
   * Handle clear API key
   */
  const handleClear = async () => {
    const success = await clearApiKey()

    if (success) {
      setApiKey('')
      setShowClearConfirm(false)
      clearTestResult()
    }
  }

  /**
   * Handle API key input change
   */
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    // Clear test result when user changes the key
    if (lastTestResult) {
      clearTestResult()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">AI Integration</h3>
        <p className="text-sm text-muted-foreground">
          Configure your OpenAI API key to enable AI features like transcription and content
          generation.
        </p>
      </div>

      {/* API Key Status */}
      {hasApiKey && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            API key is configured and stored securely
          </AlertDescription>
        </Alert>
      )}

      {/* API Key Input */}
      <div className="space-y-2">
        <Label htmlFor="api-key">OpenAI API Key</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={handleApiKeyChange}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleTestConnection}
            disabled={!apiKey.trim() || isTestingConnection}
            variant="outline"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your API key is encrypted and stored securely on your device using OS-level encryption.
        </p>
      </div>

      {/* Connection Test Result */}
      {lastTestResult && (
        <Alert
          className={
            lastTestResult.valid
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }
        >
          {lastTestResult.valid ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <AlertDescription
            className={
              lastTestResult.valid
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }
          >
            {lastTestResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!apiKey.trim() || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save API Key'
          )}
        </Button>

        {hasApiKey && !showClearConfirm && (
          <Button
            onClick={() => setShowClearConfirm(true)}
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Key
          </Button>
        )}

        {showClearConfirm && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Are you sure?</span>
            <Button onClick={handleClear} variant="destructive" size="sm">
              Confirm Clear
            </Button>
            <Button onClick={() => setShowClearConfirm(false)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">About API Keys</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Get your API key from OpenAI's platform at platform.openai.com</li>
          <li>Keys are encrypted using your operating system's secure storage</li>
          <li>Keys are stored locally and never sent to any third party except OpenAI</li>
          <li>You'll need credits in your OpenAI account to use AI features</li>
        </ul>
      </div>
    </div>
  )
}
