import { useState } from 'react'
import electronLogo from './assets/electron.svg'

/**
 * Main application component
 * Displays "Hello Chop Shop" test page and IPC communication test
 */
function App(): React.JSX.Element {
  const [ipcMessage, setIpcMessage] = useState<string>('')
  const [ipcError, setIpcError] = useState<string>('')

  /**
   * Test IPC communication by sending a ping to the main process
   */
  const handleIPCTest = async (): Promise<void> => {
    try {
      setIpcError('')
      const response = await window.api.ping()

      if (response.success) {
        setIpcMessage(`IPC Success: Received "${response.data}"`)
      } else {
        setIpcError(response.error || 'Unknown error')
      }
    } catch (error) {
      setIpcError(error instanceof Error ? error.message : 'IPC communication failed')
    }
  }

  return (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <img
        alt="Electron logo"
        src={electronLogo}
        style={{ width: '120px', marginBottom: '20px' }}
      />

      <h1
        style={{
          fontSize: '48px',
          margin: '20px 0',
          color: '#333',
          fontWeight: 'bold'
        }}
      >
        Hello Chop Shop
      </h1>

      <p
        style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '30px'
        }}
      >
        Electron video editor project initialized successfully
      </p>

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          maxWidth: '500px',
          margin: '30px auto'
        }}
      >
        <h3 style={{ marginTop: 0 }}>IPC Communication Test</h3>

        <button
          onClick={handleIPCTest}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          Test IPC (Ping)
        </button>

        {ipcMessage && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              marginTop: '10px'
            }}
          >
            {ipcMessage}
          </div>
        )}

        {ipcError && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginTop: '10px'
            }}
          >
            Error: {ipcError}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: '14px',
          color: '#999',
          marginTop: '40px'
        }}
      >
        Press{' '}
        <code
          style={{
            backgroundColor: '#e9ecef',
            padding: '2px 6px',
            borderRadius: '3px'
          }}
        >
          F12
        </code>{' '}
        to open DevTools
      </p>
    </div>
  )
}

export default App
