import React from 'react';

export default function SessionSummary({ summary, onClose }) {
  if (!summary) return null;

  const { mistake_count, common_error, example } = summary;

  const handleOverlayClick = () => {
    onClose();
  };

  const formatErrorType = (typeStr) => {
    if (!typeStr) return "None";
    const str = typeStr.replace(/_/g, ' ');
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div 
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          width: '100%', maxWidth: '440px',
          background: 'rgba(18,18,26,0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '36px',
          position: 'relative',
          margin: '0 16px'
        }}
      >
        <button 
          onClick={onClose}
          aria-label="Close summary"
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none',
            color: '#55556a', cursor: 'pointer', fontSize: '20px',
            width: '32px', height: '32px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            borderRadius: '8px', transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#e2e2ea';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#55556a';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          &times;
        </button>

        {mistake_count === 0 ? (
          <div>
            <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '8px' }}>
              ✦ CLEAN SESSION
            </div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#e2e2ea', marginBottom: '8px' }}>
              Perfect run
            </div>
            <div style={{ color: '#8888a0', lineHeight: 1.6 }}>
              No grammar mistakes caught. You're doing great — keep the momentum going.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#e2e2ea', marginBottom: '24px' }}>
              Session complete
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                borderRadius: '14px', padding: '18px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{
                  fontSize: '32px', fontWeight: 700,
                  background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {mistake_count}
                </div>
                <div style={{ fontSize: '12px', color: '#6b6b80', marginTop: '4px' }}>
                  mistakes caught
                </div>
              </div>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                borderRadius: '14px', padding: '18px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e2ea', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                  {formatErrorType(common_error)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b6b80', marginTop: '4px' }}>
                  most common error
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

            {example && (
              <div>
                <div style={{ fontSize: '11px', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', fontWeight: 600 }}>
                  Example correction
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#6b6b80', marginBottom: '4px', fontWeight: 500 }}>before</div>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px', padding: '10px 14px',
                    color: '#fca5a5', fontSize: '14px'
                  }}>
                    {example.before}
                  </div>
                </div>

                <div style={{ color: '#44445a', margin: '8px 0', textAlign: 'center', fontSize: '16px' }}>&darr;</div>

                <div>
                  <div style={{ fontSize: '11px', color: '#6b6b80', marginBottom: '4px', fontWeight: 500 }}>after</div>
                  <div style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: '10px', padding: '10px 14px',
                    color: '#6ee7b7', fontSize: '14px'
                  }}>
                    {example.after}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          style={{
            width: '100%', marginTop: '28px',
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            color: '#fff', fontWeight: 600,
            borderRadius: '12px', padding: '14px', border: 'none', cursor: 'pointer',
            fontSize: '15px', transition: 'opacity 150ms ease',
            letterSpacing: '0.01em'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Start new session →
        </button>
      </div>
    </div>
  );
}
