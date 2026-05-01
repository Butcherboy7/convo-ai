import React, { useRef, useEffect } from 'react';

export default function Transcript({ messages }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#55556a', fontSize: '14px' }}>
        Your conversation will appear here
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {messages.map((msg, i) => {
        const isUser = msg.speaker === 'user';
        const timeStr = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        return (
          <div key={i} className="msg-appear" style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
            <div style={{ color: '#55556a', fontSize: '11px', marginBottom: '4px', letterSpacing: '0.08em', textAlign: isUser ? 'right' : 'left' }}>
              {isUser ? 'You' : 'Maya'}
            </div>
            <div style={{
              maxWidth: '75%',
              background: isUser ? '#22222a' : '#1a1a1f',
              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              borderLeft: (isUser && msg.is_error) ? '3px solid #f59e0b' : 'none',
              borderTopLeftRadius: (isUser && msg.is_error) ? '4px' : (isUser ? '18px' : '18px'),
              padding: '10px 14px',
              fontFamily: "'Courier New', monospace",
              color: '#e8e8e8',
              position: 'relative'
            }}>
              {msg.text}
              {(isUser && msg.is_error) && (
                <div style={{ color: '#4ade80', fontSize: '12px', fontStyle: 'italic', marginTop: '4px', textAlign: 'right' }}>
                  ✓ {msg.correction}
                </div>
              )}
            </div>
            <div style={{ color: '#55556a', fontSize: '11px', marginTop: '4px' }}>
              {timeStr}
            </div>
          </div>
        );
      })}
    </div>
  );
}
