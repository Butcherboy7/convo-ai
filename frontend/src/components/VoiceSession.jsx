import React, { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant, useLocalParticipant, useRoomContext } from '@livekit/components-react';

export default function VoiceSession({ agentStateOverride }) {
  const { state: hookAgentState } = useVoiceAssistant();
  const agentState = agentStateOverride || hookAgentState;
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();
  const isMicMuted = isMicrophoneEnabled === false;
  
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showReconnect, setShowReconnect] = useState(false);

  // Track activity to show reconnect if stuck
  useEffect(() => {
    if (agentState !== 'idle' && agentState !== 'disconnected') {
      setLastActivity(Date.now());
      setShowReconnect(false);
    }
  }, [agentState]);

  useEffect(() => {
    const timer = setInterval(() => {
      const inactiveSeconds = (Date.now() - lastActivity) / 1000;
      if (inactiveSeconds > 10 && agentState === 'idle') {
        setShowReconnect(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastActivity, agentState]);

  const toggleMic = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const endSessionManual = () => {
    if (localParticipant) {
      localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "end_session_manual" })),
        { topic: "tutor-events", reliable: true }
      );
    }
  };

  const reconnect = () => {
    window.location.reload();
  };

  let statusText = "Tap to mute";
  if (isMicMuted) statusText = "Mic muted — tap to speak";
  else if (agentState === 'listening') statusText = "Listening...";
  else if (agentState === 'speaking') statusText = "Maya is speaking";
  else if (agentState === 'thinking') statusText = "Thinking...";
  else if (agentState === 'disconnected') statusText = "Session ended";
  else statusText = "Say something to begin";

  const isActive = agentState === 'listening' && !isMicMuted;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      
      {/* Mic button */}
      <div style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow ring when listening */}
        {isActive && (
          <div style={{
            position: 'absolute', width: '96px', height: '96px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)',
            animation: 'mic-pulse 2s ease-out infinite',
          }} />
        )}
        <button
          onClick={toggleMic}
          aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: isMicMuted
              ? 'rgba(30,30,42,0.8)'
              : isActive
                ? 'linear-gradient(135deg, rgba(129,140,248,0.15), rgba(99,102,241,0.1))'
                : 'rgba(30,30,42,0.6)',
            border: isActive
              ? '2px solid rgba(129,140,248,0.5)'
              : '2px solid rgba(255,255,255,0.08)',
            color: isMicMuted ? '#55556a' : '#e2e2ea',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 10,
            transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            {isMicMuted ? (
              <path d="M25 7L7 25M11 5c0-2.761 2.239-5 5-5s5 2.239 5 5v11c0 .485-.07 1.054-.199 1.5M16 21c-2.761 0-5-2.239-5-5v-1.5M6 16c0 5.523 4.477 10 10 10s10-4.477 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            ) : (
              <>
                <rect x="11" y="3" width="10" height="16" rx="5" fill="currentColor"/>
                <path d="M6 16c0 5.523 4.477 10 10 10s10-4.477 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="11" y1="30" x2="21" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Visual indicators */}
      <div style={{ height: '24px', marginTop: '20px', display: 'flex', gap: '5px', alignItems: 'flex-end', justifyContent: 'center' }}>
        {agentState === 'speaking' && (
          <>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="sound-bar" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </>
        )}
        {agentState === 'thinking' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '24px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#818cf8',
                animation: 'breathe 1.2s ease-in-out infinite',
                animationDelay: `${i * 200}ms`
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Status text */}
      <div
        role="status"
        aria-live="polite"
        style={{
          color: isMicMuted ? '#55556a' : '#8888a0',
          fontSize: '14px', fontWeight: 400,
          marginTop: '12px',
          transition: 'color 200ms ease, opacity 200ms ease',
          letterSpacing: '0.01em'
        }}
      >
        {statusText}
      </div>

      {/* Controls */}
      <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={endSessionManual}
          aria-label="End the tutoring session"
          style={{
            background: 'none', border: 'none',
            color: '#55556a', fontSize: '12px',
            letterSpacing: '0.06em', cursor: 'pointer',
            padding: '8px 20px', textDecoration: 'none',
            transition: 'color 0.2s ease', fontWeight: 500
          }}
          onMouseEnter={(e) => e.target.style.color = '#8888a0'}
          onMouseLeave={(e) => e.target.style.color = '#55556a'}
        >
          End Session
        </button>

        {(showReconnect || agentState === 'disconnected') && (
          <button
            onClick={reconnect}
            className="fade-in"
            style={{
              background: 'rgba(129,140,248,0.1)',
              border: '1px solid rgba(129,140,248,0.25)',
              color: '#818cf8', fontSize: '13px',
              padding: '8px 20px', borderRadius: '20px',
              cursor: 'pointer', fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(129,140,248,0.1)'}
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
