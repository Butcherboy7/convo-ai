import React, { useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export default function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const { localParticipant } = useLocalParticipant();
  const languages = [
    { id: 'English', label: 'English', flag: '🇬🇧' },
    { id: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
    { id: 'French', label: 'French', flag: '🇫🇷' }
  ];

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
      <div style={{ display: 'flex', gap: '8px' }}>
        {languages.map(({ id: lang, label, flag }) => {
          const isSelected = selectedLanguage === lang;
          return (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              style={{
                borderRadius: '12px',
                padding: '8px 18px',
                cursor: 'pointer',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(99,102,241,0.15))'
                  : 'rgba(255,255,255,0.03)',
                color: isSelected ? '#c7d2fe' : '#6b6b80',
                border: isSelected
                  ? '1px solid rgba(129,140,248,0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                fontWeight: isSelected ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                display: 'flex', alignItems: 'center', gap: '6px',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)';
                  e.currentTarget.style.color = '#a0a0b8';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#6b6b80';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
