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
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Key, CheckCircle2, XCircle, Loader2, Trash2, AlertCircle } from 'lucide-react'
import { API_KEY_ERRORS } from '../../../../shared/constants/error-messages'
import { showErrorToast, showSuccessToast, logError } from '../../utils/error-handler'

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
  const [validationError, setValidationError] = useState<string | null>(null)

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
   * Validate API key format
   */
  const validateApiKey = (key: string): boolean => {
    // Clear previous validation error
    setValidationError(null)

    if (!key || key.trim().length === 0) {
      setValidationError(API_KEY_ERRORS.MISSING)
      return false
    }

    // OpenAI API keys start with 'sk-' and are at least 20 chars
    if (!key.startsWith('sk-') || key.length < 20) {
      setValidationError(API_KEY_ERRORS.INVALID)
      return false
    }

    return true
  }

  /**
   * Handle API key save
   */
  const handleSave = async () => {
    if (!validateApiKey(apiKey)) {
      return
    }

    setIsSaving(true)

    try {
      const success = await storeApiKey(apiKey)

      if (success) {
        showSuccessToast('API key saved successfully')
        // Clear input after successful save
        setApiKey('')
        setValidationError(null)
      } else {
        const errorMsg = 'Failed to store API key. Please try again.'
        setValidationError(errorMsg)
        showErrorToast(errorMsg)
        logError('AISettings', 'Failed to store API key')
      }
    } catch (error) {
      const errorMsg = 'An error occurred while saving the API key.'
      setValidationError(errorMsg)
      showErrorToast(errorMsg)
      logError('AISettings', error)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle connection test
   */
  const handleTestConnection = async () => {
    if (!validateApiKey(apiKey)) {
      return
    }

    try {
      const result = await testConnection(apiKey)

      if (!result.valid) {
        // Show specific error based on test result
        let errorMsg = API_KEY_ERRORS.TEST_FAILED
        if (result.message.toLowerCase().includes('invalid') || result.message.toLowerCase().includes('incorrect')) {
          errorMsg = API_KEY_ERRORS.INVALID
        } else if (result.message.toLowerCase().includes('unauthorized')) {
          errorMsg = API_KEY_ERRORS.UNAUTHORIZED
        }

        setValidationError(errorMsg)
        logError('AISettings', 'API connection test failed', { message: result.message })
      } else {
        setValidationError(null)
      }
    } catch (error) {
      const errorMsg = 'Connection test failed. Please check your internet connection.'
      setValidationError(errorMsg)
      showErrorToast(errorMsg)
      logError('AISettings', error)
    }
  }

  /**
   * Handle clear API key
   */
  const handleClear = async () => {
    try {
      const success = await clearApiKey()

      if (success) {
        showSuccessToast('API key removed successfully')
        setApiKey('')
        setShowClearConfirm(false)
        setValidationError(null)
        clearTestResult()
      } else {
        showErrorToast('Failed to clear API key. Please try again.')
        logError('AISettings', 'Failed to clear API key')
      }
    } catch (error) {
      showErrorToast('An error occurred while clearing the API key.')
      logError('AISettings', error)
    }
  }

  /**
   * Handle API key input change
   */
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    // Clear validation error and test result when user changes the key
    setValidationError(null)
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

      {/* Validation Error Alert */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
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
