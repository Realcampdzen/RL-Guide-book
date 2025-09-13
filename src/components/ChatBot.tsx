import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: string;
  currentCategory?: {
    id: string;
    title: string;
    emoji?: string;
  };
  currentBadge?: {
    id: string;
    title: string;
    emoji: string;
    categoryId: string;
  };
  currentLevel?: string;
  currentLevelBadgeTitle?: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ 
  isOpen, 
  onClose, 
  currentView,
  currentCategory, 
  currentBadge,
  currentLevel,
  currentLevelBadgeTitle
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Автофокус на поле ввода при открытии чата
  useEffect(() => {
    if (isOpen) {
      // Даем React дорендерить DOM и ставим фокус
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Универсальная отправка текста (используется инпутом и кликом по подсказке)
  const sendText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Используем наш backend API на Vercel
        const response = await fetch('https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          user_id: 'web_user',
          context: {
            current_view: currentView,
            current_category: currentCategory ? { id: currentCategory } : null,
            current_badge: currentBadge ? { id: currentBadge } : null,
            current_level: currentLevelBadgeTitle ? 'current_level' : null,
            current_level_badge_title: currentLevelBadgeTitle
          }
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response || 'Извините, не могу ответить сейчас.',
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.message || 'Ошибка соединения. Проверьте, что чат-бот запущен.',
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Fallback ответы для случая, когда backend недоступен
      const fallbackResponses = [
        "Привет! Я НейроВалюша, цифровая вожатая проекта 'Реальный Лагерь'! 🌟",
        "К сожалению, мой сервер временно недоступен, но я могу рассказать о системе значков!",
        "В 'Реальном Лагере' есть 14 категорий значков для развития разных навыков!",
        "Хочешь узнать о значках? Посмотри категории в главном меню!",
        "Система значков помогает отслеживать прогресс и достижения участников лагеря!"
      ];
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Возвращаем фокус в поле ввода после ответа бота/ошибки
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Отправка из поля ввода
  const sendMessage = async () => {
    await sendText(inputText);
  };

  // Обработка нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Очистка истории
  // const _clearHistory = () => {
  //   setMessages([]);
  // };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'transparent',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
      zIndex: 10000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out',
      pointerEvents: 'none' // Позволяет кликать сквозь фон
    }}>
              <div style={{
          background: 'linear-gradient(135deg, rgba(12, 12, 12, 0.6) 0%, rgba(26, 26, 46, 0.6) 50%, rgba(22, 33, 62, 0.6) 100%)',
          borderRadius: '24px',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(78, 205, 196, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          width: '400px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          border: '1px solid rgba(78, 205, 196, 0.5)',
          animation: 'slideInFromRight 0.4s ease-out',
          backdropFilter: 'blur(20px)',
          marginTop: '20px',
          pointerEvents: 'auto' // Восстанавливаем интерактивность для самого чата
        }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid rgba(78, 205, 196, 0.3)',
          background: 'rgba(78, 205, 196, 0.08)',
          borderRadius: '24px 24px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src="/RL-Guide-book/Валюша.jpg" 
                alt="НейроВалюша" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(78, 205, 196, 0.6)',
                  boxShadow: '0 0 15px rgba(78, 205, 196, 0.3)'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '12px',
                height: '12px',
                background: '#4ecdc4',
                borderRadius: '50%',
                border: '2px solid rgba(12, 12, 12, 0.95)',
                boxShadow: '0 0 8px rgba(78, 205, 196, 0.5)'
              }}></div>
            </div>
            <div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                color: '#4ecdc4', 
                margin: 0,
                textShadow: '0 0 8px rgba(78, 205, 196, 0.3)'
              }}>
                НейроВалюша
              </h3>
              <p style={{ 
                fontSize: '12px', 
                color: '#a0aec0', 
                margin: 0,
                fontWeight: '500'
              }}>
                ✨ Нейро вожатый
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#a0aec0',
              background: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.3)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(78, 205, 196, 0.2)';
              e.currentTarget.style.color = '#4ecdc4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(78, 205, 196, 0.1)';
              e.currentTarget.style.color = '#a0aec0';
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контекстная информация */}
        {(currentView || currentCategory || currentBadge || currentLevel) && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(78, 205, 196, 0.08)',
            borderBottom: '1px solid rgba(78, 205, 196, 0.2)',
            borderLeft: '3px solid #4ecdc4'
          }}>
            <div style={{ fontSize: '12px', color: '#4ecdc4', fontWeight: '500', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {currentView && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>🧭</span>
                  <span>
                    Экран: {
                      (
                        {
                          'intro': 'Главная',
                          'categories': 'Список категорий',
                          'category': 'Категория',
                          'badge': 'Страница значка',
                          'badge-level': 'Уровень значка',
                          'introduction': 'Введение',
                          'additional-material': 'Доп. материалы',
                          'about-camp': 'Информация о лагере',
                          'registration-form': 'Форма регистрации'
                        } as Record<string, string>
                      )[currentView] || currentView
                    }
                  </span>
                </div>
              )}
              {currentCategory && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>📁</span>
                  <span>Категория: {currentCategory.emoji} {currentCategory.title}</span>
                </div>
              )}
              {currentBadge && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: currentCategory ? '3px' : '0' }}>
                  <span style={{ fontSize: '14px' }}>🏆</span>
                  <span>Значок: {currentBadge.emoji} {currentBadge.title}</span>
                </div>
              )}
              {currentLevel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>🎯</span>
                  <span>Уровень: {currentLevel}{currentLevelBadgeTitle ? ` — ${currentLevelBadgeTitle}` : ''}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Сообщения */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '0 0 24px 24px'
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#a0aec0', padding: '30px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                <img 
                  src="/RL-Guide-book/Валюша.jpg" 
                  alt="НейроВалюша" 
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid rgba(78, 205, 196, 0.7)',
                    boxShadow: '0 0 25px rgba(78, 205, 196, 0.5)'
                  }} 
                />
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  width: '20px',
                  height: '20px',
                  background: '#4ecdc4',
                  borderRadius: '50%',
                  border: '2px solid rgba(12, 12, 12, 0.95)',
                  boxShadow: '0 0 12px rgba(78, 205, 196, 0.7)',
                  animation: 'pulse 2s infinite'
                }}></div>
              </div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#4ecdc4', 
                margin: '0 0 12px 0',
                textShadow: '0 0 10px rgba(78, 205, 196, 0.4)'
              }}>
                Привет! 😊
              </h3>
              <p style={{ 
                fontSize: '14px', 
                margin: '0 0 8px 0', 
                fontWeight: '500',
                color: '#e2e8f0',
                lineHeight: '1.4'
              }}>
                Я здесь чтобы помочь! 
              </p>
              <p style={{ 
                fontSize: '12px', 
                margin: '0', 
                opacity: '0.9',
                color: '#a0aec0',
                lineHeight: '1.4'
              }}>
                Если что-то не понятно — спрашивай! 💫
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                marginBottom: '8px'
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: message.isUser 
                    ? 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'
                    : 'rgba(78, 205, 196, 0.1)',
                  color: message.isUser ? 'white' : '#e2e8f0',
                  border: message.isUser 
                    ? '1px solid rgba(78, 205, 196, 0.3)'
                    : '1px solid rgba(78, 205, 196, 0.2)',
                  boxShadow: message.isUser 
                    ? '0 6px 20px rgba(78, 205, 196, 0.3)'
                    : '0 3px 12px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <p style={{ 
                  fontSize: '13px', 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4',
                  fontWeight: '500'
                }}>
                  {message.text}
                </p>
                <p style={{
                  fontSize: '10px',
                  marginTop: '6px',
                  color: message.isUser ? 'rgba(255, 255, 255, 0.7)' : 'rgba(160, 174, 192, 0.6)',
                  fontWeight: '400'
                }}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(78, 205, 196, 0.1)',
                border: '1px solid rgba(78, 205, 196, 0.2)',
                boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(78, 205, 196, 0.3)',
                    borderTop: '2px solid #4ecdc4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ 
                    fontSize: '13px', 
                    color: '#a0aec0',
                    fontWeight: '500'
                  }}>
                    НейроВалюша печатает...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Подсказки отключены */}

        {/* Поле ввода */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(78, 205, 196, 0.3)',
          background: 'rgba(78, 205, 196, 0.05)',
          borderRadius: '0 0 24px 24px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid rgba(78, 205, 196, 0.3)',
                borderRadius: '16px',
                fontSize: '14px',
                outline: 'none',
                background: 'rgba(12, 12, 12, 0.6)',
                color: '#e2e8f0',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              disabled={isLoading}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(78, 205, 196, 0.6)';
                e.target.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(78, 205, 196, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: (!inputText.trim() || isLoading) ? 0.5 : 1,
                boxShadow: '0 6px 20px rgba(78, 205, 196, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(78, 205, 196, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(78, 205, 196, 0.3)';
              }}
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideInFromRight {
            0% { 
              transform: translateX(100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(0);
              opacity: 1;
            }
          }
        `
      }} />
    </div>
  );
};

export default ChatBot;
