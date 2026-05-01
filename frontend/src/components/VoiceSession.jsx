import React, { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant, useLocalParticipant } from '@livekit/components-react';

export default function VoiceSession() {
  const { state: agentState } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const isMicMuted = localParticipant?.isMicrophoneEnabled === false;
  
  const [timeStr, setTimeStr] = useState("00:00");
  const intervalRef = useRef(null);

  useEffect(() => {
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setTimeStr(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const toggleMic = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    }
  };

  let statusText = "Tap to speak";
  if (agentState === 'listening') statusText = "Listening...";
  else if (agentState === 'speaking') statusText = "Maya is speaking";
  else if (agentState === 'thinking') statusText = "Thinking...";
  else if (isMicMuted) statusText = "Mic muted — tap to unmute";

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, color: '#55556a', fontSize: '13px', fontVariantNumeric: 'tabular-nums', padding: '16px' }}>
        {timeStr}
      </div>

      <div style={{ position: 'relative', width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {agentState === 'listening' && (
          <>
            <div className="pulse-ring" style={{ animationDelay: '0ms' }} />
            <div className="pulse-ring" style={{ animationDelay: '500ms' }} />
          </>
        )}
        
        <button
          onClick={toggleMic}
          style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: isMicMuted ? '#1a1a1f' : (agentState === 'listening' ? 'rgba(245,158,11,0.08)' : '#22222a'),
            border: (agentState === 'listening' && !isMicMuted) ? '2px solid #f59e0b' : '2px solid #2a2a35',
            color: '#e8e8e8',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 10,
            transition: 'all 200ms ease'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: isMicMuted ? 0.6 : 1 }}>
            <rect x="11" y="3" width="10" height="16" rx="5" fill="currentColor"/>
            <path d="M6 16c0 5.523 4.477 10 10 10s10-4.477 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="11" y1="30" x2="21" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{ height: '22px', marginTop: '16px', display: 'flex', gap: '6px', alignItems: 'flex-end', justifyContent: 'center' }}>
        {agentState === 'speaking' && (
          <>
            <div className="sound-bar" style={{ animationDelay: '0ms' }} />
            <div className="sound-bar" style={{ animationDelay: '200ms' }} />
            <div className="sound-bar" style={{ animationDelay: '400ms' }} />
          </>
        )}
      </div>

      <div style={{ color: '#888898', fontSize: '14px', marginTop: '20px', transition: 'opacity 200ms ease' }}>
        {statusText}
      </div>
    </div>
  );
}
