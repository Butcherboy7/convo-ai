import React, { useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export default function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const { localParticipant } = useLocalParticipant();
  const languages = ['English', 'Spanish', 'French'];

  const handleSelect = async (lang) => {
    setSelectedLanguage(lang);
    if (!localParticipant) {
      console.warn("localParticipant not ready yet");
      return;
    }
    await localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ 
        type: "config", 
        language: lang 
      })),
      { topic: "tutor-events", reliable: true }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textTransform: 'uppercase', color: '#888898', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '8px' }}>
        Practicing
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {languages.map(lang => {
          const isSelected = selectedLanguage === lang;
          return (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              style={{
                borderRadius: '9999px',
                padding: '6px 20px',
                cursor: 'pointer',
                background: isSelected ? '#f59e0b' : 'transparent',
                color: isSelected ? '#0d0d0f' : '#888898',
                border: isSelected ? '1px solid #f59e0b' : '1px solid #2a2a35',
                fontWeight: isSelected ? 500 : 400,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.color = '#e8e8e8';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#2a2a35';
                  e.currentTarget.style.color = '#888898';
                }
              }}
            >
              {lang}
            </button>
          );
        })}
      </div>
    </div>
  );
}
