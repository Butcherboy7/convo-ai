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
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '440px',
          background: '#1a1a1f',
          borderRadius: '16px',
          border: '1px solid #2a2a35',
          padding: '32px',
          position: 'relative',
          margin: '0 16px'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none',
            color: '#55556a', cursor: 'pointer', fontSize: '24px',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e8e8e8'}
          onMouseLeave={e => e.currentTarget.style.color = '#55556a'}
        >
          &times;
        </button>

        {mistake_count === 0 ? (
          <div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#e8e8e8', marginBottom: '8px' }}>
              Clean session
            </div>
            <div style={{ color: '#888898', marginBottom: '24px' }}>
              No mistakes caught. Impressive — keep it going.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#e8e8e8', marginBottom: '24px' }}>
              Session complete
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, background: '#22222a', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '36px', fontWeight: 700, color: '#f59e0b' }}>
                  {mistake_count}
                </div>
                <div style={{ fontSize: '12px', color: '#888898' }}>
                  mistakes caught
                </div>
              </div>
              <div style={{ flex: 1, background: '#22222a', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#e8e8e8', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                  {formatErrorType(common_error)}
                </div>
                <div style={{ fontSize: '12px', color: '#888898', marginTop: '4px' }}>
                  most common error
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2a2a35', margin: '24px 0' }} />

            {example && (
              <div>
                <div style={{ fontSize: '12px', color: '#55556a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  A correction from this session
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#55556a', marginBottom: '4px' }}>before</div>
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 12px', color: '#fca5a5', fontFamily: 'monospace' }}>
                    {example.before}
                  </div>
                </div>

                <div style={{ color: '#55556a', margin: '8px 0', textAlign: 'center' }}>&rarr;</div>

                <div>
                  <div style={{ fontSize: '11px', color: '#55556a', marginBottom: '4px' }}>after</div>
                  <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '8px', padding: '8px 12px', color: '#86efac', fontFamily: 'monospace' }}>
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
            background: '#f59e0b', color: '#0d0d0f', fontWeight: 600,
            borderRadius: '10px', padding: '14px', border: 'none', cursor: 'pointer',
            fontSize: '15px', transition: 'background 150ms ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e08d00'}
          onMouseLeave={e => e.currentTarget.style.background = '#f59e0b'}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}
