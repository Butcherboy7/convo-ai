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
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#55556a', fontSize: '14px', gap: '8px'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Your conversation will appear here</span>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        color: '#6b6b80', fontSize: '11px', fontWeight: 600,
        letterSpacing: '0.08em', padding: '18px 20px 10px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        textTransform: 'uppercase'
      }}>
        Conversation
      </div>
      <div ref={containerRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '2px'
      }}>
      {messages.map((msg, i) => {
        const isUser = msg.speaker === 'user';
        const timeStr = (msg.timestamp ? new Date(msg.timestamp) : new Date()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        const isSameAsPrev = i > 0 && messages[i-1].speaker === msg.speaker;
        const marginTop = isSameAsPrev ? '3px' : '14px';
        return (
          <div key={msg.id || i} className="msg-appear" style={{
            display: 'flex', flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            width: '100%', marginTop
          }}>
            {!isSameAsPrev && (
              <div style={{
                color: isUser ? '#6b6b80' : '#818cf8',
                fontSize: '11px', fontWeight: 600,
                marginBottom: '5px', letterSpacing: '0.04em',
                textAlign: isUser ? 'right' : 'left'
              }}>
                {isUser ? 'You' : 'Maya'}
              </div>
            )}
            <div style={{
              maxWidth: '80%',
              background: isUser
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(129,140,248,0.08)',
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              borderLeft: (isUser && msg.is_error)
                ? '3px solid #818cf8'
                : ((!isUser) ? '2px solid rgba(129,140,248,0.15)' : 'none'),
              padding: '10px 14px',
              color: '#e2e2ea',
              fontSize: '14px',
              lineHeight: 1.7,
              letterSpacing: '0.01em'
            }}>
              {msg.text}
              {(isUser && msg.is_error && msg.correction) && (
                <div style={{
                  color: '#34d399', fontSize: '12px',
                  fontStyle: 'italic', marginTop: '6px',
                  textAlign: 'right', fontWeight: 500
                }}>
                  &#x21A9; {msg.correction}
                </div>
              )}
            </div>
            <div style={{
              color: '#44445a', fontSize: '10px',
              marginTop: '4px', fontWeight: 400
            }}>
              {timeStr}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
