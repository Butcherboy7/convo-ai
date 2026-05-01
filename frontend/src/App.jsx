import React, { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useDataChannel } from '@livekit/components-react';
import LanguageSelector from './components/LanguageSelector';
import VoiceSession from './components/VoiceSession';
import Transcript from './components/Transcript';
import SessionSummary from './components/SessionSummary';

// CSS injection for animations and global styles
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.7); opacity: 0; }
  }
  .pulse-ring {
    position: absolute;
    width: 100%; height: 100%;
    border: 2px solid #f59e0b;
    border-radius: 50%;
    pointer-events: none;
    animation: pulse-ring 1.6s ease-out infinite;
  }
  @keyframes sound-bar {
    0%, 100% { height: 4px; opacity: 0.4; }
    50% { height: 22px; opacity: 1; }
  }
  .sound-bar {
    width: 3px;
    background: #f59e0b;
    border-radius: 2px;
    animation: sound-bar 0.8s ease-in-out infinite;
  }
  @keyframes msg-appear { 
    from { opacity: 0; transform: translateY(6px); } 
    to { opacity: 1; transform: translateY(0); } 
  }
  .msg-appear {
    animation: msg-appear 200ms ease-out;
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fade-in {
    animation: fade-in 300ms ease-out;
  }
  body {
    margin: 0;
    padding: 0;
    background: #0d0d0f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  * {
    box-sizing: border-box;
  }
`;
document.head.appendChild(styleSheet);

function AppLayout({ sessionSummary, onSessionSummary }) {
  const [messages, setMessages] = useState([]);
  
  const { message } = useDataChannel("tutor-events");

  useEffect(() => {
    if (!message) return;
    try {
      const payload = JSON.parse(new TextDecoder().decode(message.payload));
      if (payload.type === "session_end") {
        onSessionSummary(payload);
      } else if (payload.type === "transcript") {
        setMessages(prev => [...prev, payload]);
      }
    } catch (e) {
      console.warn("Malformed data channel message:", e);
    }
  }, [message, onSessionSummary]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layoutStyle = isMobile ? {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  } : {
    display: 'grid',
    gridTemplateColumns: '60% 40%',
    height: '100%',
    width: '100%',
  };

  const leftColStyle = isMobile ? {
    height: '55%',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '24px'
  } : {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '48px',
    height: '100%'
  };

  const rightColStyle = isMobile ? {
    height: '45%',
    borderTop: '1px solid #2a2a35'
  } : {
    height: '100%',
    borderLeft: '1px solid #2a2a35'
  };

  return (
    <>
      <div style={layoutStyle}>
        <div style={leftColStyle}>
          <LanguageSelector />
          <div style={{ flex: 1 }}>
            <VoiceSession />
          </div>
        </div>
        <div style={rightColStyle}>
          <Transcript messages={messages} />
        </div>
      </div>
      <SessionSummary 
        summary={sessionSummary} 
        onClose={() => onSessionSummary(null)} 
      />
    </>
  );
}

export default function App() {
  const [phase, setPhase] = useState('loading');
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);

  const fetchToken = async () => {
    setPhase('loading');
    setErrorMessage(null);
    try {
      const baseUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/token`);
      if (!response.ok) {
        setPhase('error');
        setErrorMessage("Token server error. Check agent terminal for details.");
        return;
      }
      const data = await response.json();
      setLiveKitToken(data.token);
      setLiveKitUrl(data.url);
      setPhase('connected');
    } catch (err) {
      setPhase('error');
      setErrorMessage("Can't reach token server. Is it running on port 8000?");
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  if (phase === 'loading') {
    return (
      <div className="fade-in" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0f' }}>
        <div style={{ color: '#888898', fontSize: '16px' }}>Connecting...</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0f' }}>
        <div style={{ background: '#1a1a1f', padding: '32px', borderRadius: '16px', border: '1px solid #2a2a35', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ color: '#e8e8e8', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Connection failed
          </div>
          <div style={{ color: '#888898', fontSize: '14px', marginBottom: '24px' }}>
            {errorMessage}
          </div>
          <button 
            onClick={fetchToken}
            style={{
              background: 'transparent',
              border: '1px solid #f59e0b',
              color: '#f59e0b',
              padding: '8px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              marginBottom: '16px'
            }}
          >
            Retry
          </button>
          <div style={{ color: '#55556a', fontSize: '12px' }}>
            Check that /agent/token_server.py is running
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'connected') {
    return (
      <LiveKitRoom
        token={liveKitToken}
        serverUrl={liveKitUrl}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={() => {
          setPhase('error');
          setErrorMessage("Session disconnected. Click retry to reconnect.");
        }}
        onError={(error) => {
          setPhase('error');
          setErrorMessage(`Connection error: ${error.message}`);
        }}
        style={{ height: '100vh', background: '#0d0d0f' }}
      >
        <RoomAudioRenderer />
        <AppLayout 
          sessionSummary={sessionSummary}
          onSessionSummary={setSessionSummary}
        />
      </LiveKitRoom>
    );
  }

  return null;
}
