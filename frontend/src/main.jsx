import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// NOTE: StrictMode intentionally removed — it double-mounts components in dev,
// which causes LiveKit's RoomAudioRenderer to create two <audio> elements for
// the same track, making Maya's voice play twice. ErrorBoundary still protects.
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
