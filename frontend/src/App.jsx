import React, { useState, useEffect, useCallback } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useDataChannel, useLocalParticipant } from '@livekit/components-react';
import LanguageSelector from './components/LanguageSelector';
import VoiceSession from './components/VoiceSession';
import Transcript from './components/Transcript';
import SessionSummary from './components/SessionSummary';

// CSS injection for animations and global styles
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

  @keyframes mic-pulse {
    0% { box-shadow: 0 0 0 0 rgba(129,140,248,0.35); }
    70% { box-shadow: 0 0 0 20px rgba(129,140,248,0); }
    100% { box-shadow: 0 0 0 0 rgba(129,140,248,0); }
  }
  @keyframes loading-bar {
    0% { width: 0%; opacity: 1; }
    80% { width: 100%; opacity: 1; }
    100% { width: 100%; opacity: 0; }
  }
  @keyframes sound-bar {
    0%, 100% { height: 4px; opacity: 0.4; }
    50% { height: 20px; opacity: 1; }
  }
  .sound-bar {
    width: 3px;
    background: linear-gradient(180deg, #818cf8, #6366f1);
    border-radius: 2px;
    animation: sound-bar 0.8s ease-in-out infinite;
  }
  @keyframes msg-appear { 
    from { opacity: 0; transform: translateY(8px); } 
    to { opacity: 1; transform: translateY(0); } 
  }
  .msg-appear {
    animation: msg-appear 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fade-in 400ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes breathe {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes gentle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  body {
    margin: 0;
    padding: 0;
    background: #0f0f14;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #e2e2ea;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  * {
    box-sizing: border-box;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }

  button { font-family: inherit; }
`;
document.head.appendChild(styleSheet);

function Header({ phase }) {
  const [timeStr, setTimeStr] = useState("00:00");
  const intervalRef = React.useRef(null);

  useEffect(() => {
    if (phase !== 'connected') {
      setTimeStr("00:00");
      return;
    }
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setTimeStr(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  return (
    <div style={{
      height: '56px',
      background: 'rgba(15,15,20,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #818cf8, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: '#fff',
          letterSpacing: '-0.02em'
        }}>
          M
        </div>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e2ea', letterSpacing: '-0.01em' }}>
          Maya
        </span>
        {phase === 'connected' && (
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#34d399',
            animation: 'breathe 2s ease-in-out infinite',
            marginLeft: '2px'
          }} />
        )}
      </div>
      <div style={{
        color: '#6b6b80', fontSize: '13px',
        fontVariantNumeric: 'tabular-nums', fontWeight: 500
      }}>
        {timeStr}
      </div>
    </div>
  );
}

function AppLayout({ sessionSummary, onSessionSummary, onNewSession }) {
  const [messages, setMessages] = useState([]);
  const [agentState, setAgentState] = useState('idle');
  
  const handleDataChannelMessage = useCallback((message) => {
    try {
      if (!message?.payload) return;
      const text = new TextDecoder().decode(message.payload);
      const payload = JSON.parse(text);
      
      console.log("[DataChannel]", payload.type, payload);

      if (!payload?.type) {
        console.warn("Data channel message missing 'type' field:", payload);
        return;
      }
      
      if (payload.type === "agent_state") {
        setAgentState(payload.state);
      }
      
      if (payload.type === "transcript") {
        console.log("Transcript Received:", payload);
        if (typeof payload.speaker !== 'string' || typeof payload.text !== 'string') {
          console.warn("Malformed transcript message:", payload);
          return;
        }
        setMessages(prev => {
          // Prevent duplicate transcripts — check last 3 messages for fuzzy match
          const recentSlice = prev.slice(-3);
          for (const recent of recentSlice) {
            if (recent.speaker === payload.speaker) {
              // Exact match
              if (recent.text === payload.text) return prev;
              // Fuzzy match for agent — if first 30 chars match and within 5s
              if (payload.speaker === 'agent' && recent.text.substring(0, 30) === payload.text.substring(0, 30)) {
                const timeDiff = Date.now() - (recent._receivedAt || 0);
                if (timeDiff < 5000) return prev;
              }
            }
          }
          return [...prev, {
            ...payload,
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            _receivedAt: Date.now(),
          }];
        });
      }
      
      if (payload.type === "session_end") {
        onSessionSummary(payload);
        // Tell token server to invalidate the current room
        // so the next session gets a fresh room with one agent
        fetch('/api/new-session', { method: 'POST' }).catch(() => {});
      }
      
      if (payload.type === "config") {
        console.log("Agent config acknowledged:", payload);
      }
      
    } catch (e) {
      console.warn("Failed to parse data channel message:", e);
    }
  }, [onSessionSummary]);

  useDataChannel("tutor-events", handleDataChannelMessage);


  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const handleUnload = () => {
      try {
        localParticipant?.publishData(
          new TextEncoder().encode(JSON.stringify({ type: "browser_closing" })),
          { topic: "tutor-events", reliable: false }
        );
      } catch (e) {
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [localParticipant]);

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
    gridTemplateColumns: '55% 45%',
    height: '100%',
    width: '100%',
  };

  const leftColStyle = isMobile ? {
    flex: 1,
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
    background: 'rgba(18, 18, 26, 0.95)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    minHeight: '180px',
    maxHeight: messages.length > 3 ? '45vh' : '180px',
    transition: 'max-height 0.3s ease'
  } : {
    height: '100%',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(18, 18, 26, 0.4)',
  };

  return (
    <>
      <div style={layoutStyle}>
        <div style={leftColStyle}>
          <LanguageSelector />
          <div style={{ flex: 1 }}>
            <VoiceSession agentStateOverride={agentState} />
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

/**
 * Stable identity across page refreshes within the same tab.
 * sessionStorage persists until the tab closes — new tab = new identity.
 */
function getOrCreateIdentity() {
  let id = sessionStorage.getItem('tutor_identity');
  if (!id) {
    id = 'learner-' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('tutor_identity', id);
  }
  return id;
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
      // Use the Vite proxy path — never call port 8000 directly from browser
      const identity = getOrCreateIdentity();
      const response = await fetch(`/api/token?identity=${encodeURIComponent(identity)}`);
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

  // Start a truly fresh session — invalidates the old room so LiveKit
  // dispatches exactly one new agent to a new room.
  const startNewSession = async () => {
    try {
      await fetch('/api/new-session', { method: 'POST' });
    } catch (e) {
      // Non-critical — the token endpoint will still create a new room
      // if the old one expired
    }
    await fetchToken();
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f14' }}>
      <Header phase={phase} />
      
      {phase === 'loading' && (
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: '#fff',
            animation: 'gentle-float 2s ease-in-out infinite',
          }}>
            M
          </div>
          <div style={{ color: '#e2e2ea', fontSize: '16px', fontWeight: 500 }}>Starting session...</div>
          <div style={{ width: '120px', height: '2px', borderRadius: '2px', background: 'rgba(129,140,248,0.15)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)', borderRadius: '2px', animation: 'loading-bar 1.5s ease infinite' }} />
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-in" style={{
            background: 'rgba(18,18,26,0.9)', backdropFilter: 'blur(16px)',
            padding: '36px', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center', maxWidth: '400px'
          }}>
            <div style={{ color: '#e2e2ea', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              Connection failed
            </div>
            <div style={{ color: '#8888a0', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
              {errorMessage}
            </div>
            <button 
              onClick={startNewSession}
              style={{
                background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                border: 'none',
                color: '#fff',
                padding: '10px 28px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                marginBottom: '16px',
                transition: 'opacity 150ms ease'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Retry
            </button>
            <div style={{ color: '#55556a', fontSize: '12px' }}>
              Check that /agent/token_server.py is running
            </div>
          </div>
        </div>
      )}

      {phase === 'connected' && (
        <LiveKitRoom
          token={liveKitToken}
          serverUrl={liveKitUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={() => {
            // If we already have a session summary, this was a clean end — don't show error
            if (!sessionSummary) {
              setPhase('error');
              setErrorMessage("Session disconnected. Click retry to reconnect.");
            }
          }}
          onError={(error) => {
            setPhase('error');
            setErrorMessage(`Connection error: ${error.message}`);
          }}
          style={{ flex: 1, position: 'relative' }}
        >
          <RoomAudioRenderer />
          <AppLayout 
            sessionSummary={sessionSummary}
            onSessionSummary={setSessionSummary}
            onNewSession={startNewSession}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}
