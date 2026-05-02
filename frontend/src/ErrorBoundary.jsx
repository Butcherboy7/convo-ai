import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info.componentStack)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#0d0d0f',
          color: '#e8e8e8', gap: '16px', padding: '24px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px' }}>⚠</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Something went wrong</div>
          <div style={{ color: '#888898', fontSize: '14px', maxWidth: '360px' }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px', padding: '10px 24px',
              background: 'transparent', border: '1px solid #f59e0b',
              color: '#f59e0b', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
export default ErrorBoundary;
