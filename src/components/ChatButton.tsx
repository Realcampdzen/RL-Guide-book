import React, { useState, useEffect } from 'react';

interface ChatButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`chat-button ${className}`}
      title={isOpen ? "Закрыть чат" : "Открыть чат"}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 100,
        background: isOpen 
          ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(46, 26, 26, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(26, 26, 46, 0.95) 100%)',
        border: isOpen 
          ? '2px solid rgba(255, 107, 107, 0.6)'
          : '2px solid rgba(78, 205, 196, 0.6)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '25px',
        boxShadow: isOpen 
          ? '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.3)'
          : '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(78, 205, 196, 0.3)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backdropFilter: 'blur(10px)',
        minWidth: '200px'
      }}
                onMouseEnter={(e) => {
            if (isOpen) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(46, 26, 26, 1) 100%)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 107, 107, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 1)';
            } else {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(78, 205, 196, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(26, 26, 46, 1) 100%)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(78, 205, 196, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 1)';
            }
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
          }}
                onMouseLeave={(e) => {
            if (isOpen) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(46, 26, 26, 0.95) 100%)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.6)';
            } else {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(26, 26, 46, 0.95) 100%)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(78, 205, 196, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.6)';
            }
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
          }}
    >
      <div style={{ position: 'relative' }}>
        <img 
          src="/Валюша.jpg" 
          alt="НейроВалюша" 
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid rgba(78, 205, 196, 0.8)',
            boxShadow: '0 0 15px rgba(78, 205, 196, 0.4)'
          }} 
        />
                    <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              background: isOpen ? '#ff6b6b' : '#4ecdc4',
              borderRadius: '50%',
              border: '2px solid rgba(12, 12, 12, 0.95)',
              boxShadow: isOpen 
                ? '0 0 8px rgba(255, 107, 107, 0.6)'
                : '0 0 8px rgba(78, 205, 196, 0.6)'
            }}></div>
      </div>
      <div style={{ display: window.innerWidth >= 640 ? 'block' : 'none' }}>
                    <div style={{
              fontSize: '16px',
              fontWeight: '700',
              lineHeight: '1.2',
              color: isOpen ? '#ff6b6b' : '#4ecdc4',
              textShadow: isOpen 
                ? '0 0 8px rgba(255, 107, 107, 0.3)'
                : '0 0 8px rgba(78, 205, 196, 0.3)'
            }}>
              НейроВалюша
            </div>
        <div style={{ 
          fontSize: '12px', 
          opacity: 0.9, 
          lineHeight: '1.2',
          color: '#a0aec0',
          fontWeight: '500'
        }}>
          Нейро вожатый
        </div>
      </div>
      
      {/* Пульсирующий индикатор */}
                <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '16px',
              height: '16px',
              background: isOpen ? '#ff6b6b' : '#4ecdc4',
              borderRadius: '50%',
              border: '2px solid rgba(12, 12, 12, 0.95)',
              boxShadow: isOpen 
                ? '0 0 12px rgba(255, 107, 107, 0.6)'
                : '0 0 12px rgba(78, 205, 196, 0.6)',
              animation: 'pulse 2s infinite'
            }}
          />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.7);
            }
            70% {
              transform: scale(1);
              box-shadow: 0 0 0 12px rgba(78, 205, 196, 0);
            }
            100% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(78, 205, 196, 0);
            }
          }
        `
      }} />
    </button>
  );
};

export default ChatButton;
