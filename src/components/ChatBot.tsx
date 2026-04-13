import * as Dialog from '@radix-ui/react-dialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/chatbot.css';
import { useAuth } from '../context/AuthContext';
import { rafThrottle } from '../utils/rafThrottle';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when traveler clicks "Разблокировать через код" — parent can scroll to unlock block */
  onUnlockRequest?: () => void;
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
  /** Active section/tab inside PersonalCabinet */
  cabinetContext?: {
    section: string;
    sectionLabel: string;
    tab: string;
    tabLabel: string;
  };
}

interface ViewportState {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  offsetTop: number;
  offsetLeft: number;
}

type ChatPosition = { x: number; y: number };

const CHAT_POS_STORAGE_KEY = 'rl-chatbot-position-v1';
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

const ChatBot: React.FC<ChatBotProps> = ({
  isOpen,
  onClose,
  onUnlockRequest,
  currentView,
  currentCategory,
  currentBadge,
  currentLevel,
  currentLevelBadgeTitle,
  cabinetContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileNavHeightRef = useRef<number>(68);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);
  const isNearBottomRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [messagesPerDay, setMessagesPerDay] = useState<number | null>(null);
  const { canUseChat, accessToken, clearAuth } = useAuth();

  // Лимит сообщений в день с бэкенда (GET /api/chat/limits)
  useEffect(() => {
    if (!canUseChat || !isOpen) return;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    const limitsUrl = useLocalApi
      ? '/api/chat/limits'
      : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat/limits';
    const controller = new AbortController();
    fetch(limitsUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('limits fetch failed'))))
      .then((data: { messagesPerDay?: number }) => {
        if (typeof data?.messagesPerDay === 'number' && data.messagesPerDay >= 0) {
          setMessagesPerDay(data.messagesPerDay);
        }
      })
      .catch(() => setMessagesPerDay(null));
    return () => controller.abort();
  }, [canUseChat, isOpen]);

  // Генерируем уникальный user_id для каждого сеанса
  const [userId] = useState(
    () => `web_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const getViewportState = (): ViewportState => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        innerWidth: 1024,
        innerHeight: 768,
        offsetTop: 0,
        offsetLeft: 0,
      };
    }
    const { innerWidth, innerHeight } = window;
    const visualViewport = window.visualViewport;
    return {
      width: innerWidth,
      height: visualViewport?.height ?? innerHeight,
      innerWidth,
      innerHeight,
      offsetTop: visualViewport?.offsetTop ?? 0,
      offsetLeft: visualViewport?.offsetLeft ?? 0,
    };
  };

  const [viewport, setViewport] = useState<ViewportState>(() => getViewportState());
  const isMobile = viewport.width <= 768;
  const isTablet = viewport.width > 768 && viewport.width <= 1024;
  const keyboardInset = Math.max(0, viewport.innerHeight - viewport.height - viewport.offsetTop);
  const safeAreaLeft = Math.max(0, viewport.offsetLeft);
  const safeAreaRight = Math.max(0, viewport.innerWidth - viewport.width - viewport.offsetLeft);
  const isKeyboardOpen = isMobile && keyboardInset > 60;

  const readMobileNavHeight = useCallback(() => {
    if (typeof window === 'undefined') return 68;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--mobile-nav-height')
      .trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 68;
  }, []);

  const [mobileNavHeightPx, setMobileNavHeightPx] = useState<number>(() => 68);
  const [isMessagesScrolling, setIsMessagesScrolling] = useState(false);
  const mobileBottomInset = isMobile ? Math.max(12, keyboardInset + mobileNavHeightPx + 16) : 0;
  const mobileOverlayBackground = isMobile
    ? isKeyboardOpen
      ? 'rgba(15, 10, 31, 0.94)'
      : 'rgba(15, 10, 31, 0.88)'
    : 'transparent';

  const [chatPos, setChatPos] = useState<ChatPosition | null>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startPos: ChatPosition;
  } | null>(null);

  // Lock page scroll while chat is open on mobile to avoid viewport/layout thrash during keyboard toggles.
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isMobile, isOpen]);

  const persistChatPos = (pos: ChatPosition) => {
    try {
      localStorage.setItem(CHAT_POS_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore
    }
  };

  const readPersistedChatPos = (): ChatPosition | null => {
    try {
      const raw = localStorage.getItem(CHAT_POS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<ChatPosition>;
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
      return { x: parsed.x, y: parsed.y };
    } catch {
      return null;
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = isMobile ? 'auto' : 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const updateNearBottom = useMemo(
    () =>
      rafThrottle(() => {
        const el = messagesListRef.current;
        if (!el) return;
        const thresholdPx = 80;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNearBottom = distanceToBottom <= thresholdPx;
        isNearBottomRef.current = isNearBottom;
        setShowJumpToBottom(!isNearBottom);
      }),
    []
  );

  useEffect(() => {
    const handleResize = rafThrottle(() => {
      setViewport((prev) => {
        const next = getViewportState();
        if (
          prev.width === next.width &&
          prev.height === next.height &&
          prev.innerWidth === next.innerWidth &&
          prev.innerHeight === next.innerHeight &&
          prev.offsetTop === next.offsetTop &&
          prev.offsetLeft === next.offsetLeft
        ) {
          return prev;
        }
        return next;
      });
    });

    handleResize();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', handleResize, { passive: true } as AddEventListenerOptions);
    window.addEventListener('orientationchange', handleResize, {
      passive: true,
    } as AddEventListenerOptions);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleResize, {
      passive: true,
    } as AddEventListenerOptions);
    visualViewport?.addEventListener('scroll', handleResize, {
      passive: true,
    } as AddEventListenerOptions);

    return () => {
      window.removeEventListener('resize', handleResize as unknown as EventListener);
      window.removeEventListener('orientationchange', handleResize as unknown as EventListener);
      visualViewport?.removeEventListener('resize', handleResize as unknown as EventListener);
      visualViewport?.removeEventListener('scroll', handleResize as unknown as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // Auto-scroll only if the user is already near the bottom.
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [isOpen, isMobile, messages]);

  // Scroll-to-bottom only when opening the chat or adding new messages.
  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom('auto');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Make sure the initial near-bottom state is correct once the dialog is mounted.
    window.setTimeout(() => updateNearBottom(), 0);
  }, [isOpen, updateNearBottom]);

  useEffect(() => {
    if (!isOpen) return;
    if (isMobile) return;
    const saved = readPersistedChatPos();
    setChatPos((prev) => saved || prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Автофокус на поле ввода при открытии чата
  useEffect(() => {
    if (isOpen) {
      // Desktop/tablet only: mobile autofocus triggers keyboard/viewport resize loops.
      if (!isMobile) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!isMobile) return;
    if (typeof window === 'undefined') return;
    const update = rafThrottle(() => {
      const h = readMobileNavHeight();
      mobileNavHeightRef.current = h;
      setMobileNavHeightPx(h);
    });
    update();
    window.addEventListener('resize', update, { passive: true } as AddEventListenerOptions);
    window.addEventListener('orientationchange', update, {
      passive: true,
    } as AddEventListenerOptions);
    return () => {
      window.removeEventListener('resize', update as unknown as EventListener);
      window.removeEventListener('orientationchange', update as unknown as EventListener);
    };
  }, [isMobile, readMobileNavHeight]);

  const markMessagesScrolling = useCallback(() => {
    if (!isMobile) return;
    setIsMessagesScrolling(true);
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsMessagesScrolling(false);
    }, 140);
  }, [isMobile]);

  const onMessagesScroll = useCallback(() => {
    markMessagesScrolling();
    updateNearBottom();
  }, [markMessagesScrolling, updateNearBottom]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Универсальная отправка текста (используется инпутом и кликом по подсказке)
  const sendText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const shouldRestoreFocus =
      !isMobile && typeof document !== 'undefined' && document.activeElement === inputRef.current;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Используем чат-бот сервис:
      // - в dev (Vite) — локальный Flask API через proxy (/api/chat)
      // - в prod — Cloudflare endpoint
      const hostname = window.location.hostname;
      const useLocalApi =
        import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
      const chatbotUrl = useLocalApi
        ? '/api/chat' // Vite proxy к Flask backend на порту 4000
        : 'https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat';

      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(chatbotUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          user_id: userId,
          context: {
            current_view: currentView,
            current_category: currentCategory,
            current_badge: currentBadge,
            current_level: currentLevel,
            current_level_badge_title: currentLevelBadgeTitle,
            cabinet_section: cabinetContext?.section,
            cabinet_section_label: cabinetContext?.sectionLabel,
            cabinet_tab: cabinetContext?.tab,
            cabinet_tab_label: cabinetContext?.tabLabel,
          },
        }),
      });
      window.clearTimeout(timeoutId);

      const responseText = await response.text();
      if (response.ok) {
        let data: { reply?: string; response?: string };
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = {};
        }
        // Поддержка разных форматов ответа: Cloudflare возвращает 'reply', Flask возвращает 'response'
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply || data.response || 'Извините, не могу ответить сейчас.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        if (response.status === 401) {
          clearAuth();
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Войдите как участник смены для доступа к чату.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }
        if (response.status === 403) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Доступ к чату недоступен для вашей роли.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }
        if (response.status === 429) {
          let limitText = 'Лимит сообщений на сегодня исчерпан.';
          if (responseText) {
            try {
              const errData = JSON.parse(responseText) as { error?: string };
              if (errData.error) limitText = errData.error;
            } catch {
              // оставляем дефолтный текст
            }
          }
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: limitText,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }
        let errText = 'Чат временно недоступен. Пожалуйста, попробуйте позже.';
        if (responseText) {
          try {
            const errData = JSON.parse(responseText) as { message?: string; error?: string };
            errText = errData.message || errData.error || errText;
          } catch {
            // не-JSON тело — оставляем общее сообщение
          }
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: errText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);

      const isAbort = (error as any)?.name === 'AbortError';
      const isJsonError = error instanceof SyntaxError;
      const fallbackText = isAbort
        ? 'Чат сейчас не отвечает (таймаут). Попробуйте ещё раз через пару секунд.'
        : isJsonError
          ? 'Не удалось разобрать ответ сервера. Чат временно недоступен.'
          : 'Извините, чат временно недоступен. Пожалуйста, попробуйте позже.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Desktop only: on mobile this can re-open keyboard and cause viewport jank.
      if (shouldRestoreFocus) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
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

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: mobileOverlayBackground,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: isMobile ? 'center' : 'flex-end',
    zIndex: 20000,
    paddingTop: 20,
    paddingLeft: isMobile ? Math.max(12, safeAreaLeft + 12) : 20,
    paddingRight: isMobile ? Math.max(12, safeAreaRight + 12) : 20,
    paddingBottom: isMobile ? mobileBottomInset : isTablet ? 5 : 20,
    animation: 'chatFadeIn 0.3s ease-out',
    pointerEvents: 'none',
    // Provide CSS vars for potential CSS-only fallback/layout tuning.
    ['--chat-vh' as any]: `${viewport.height}px`,
    ['--chat-mobile-nav' as any]: `${mobileNavHeightPx}px`,
  };

  const availableHeight = Math.max(320, Math.round(viewport.height - mobileNavHeightPx - 24));
  const computedMobileHeight = clamp(
    Math.round(availableHeight),
    360,
    Math.round(viewport.height - mobileNavHeightPx - 12)
  );
  const desktopHeight = clamp(Math.round((viewport.height || window.innerHeight) - 80), 420, 760);

  const containerWidthPx = isMobile
    ? Math.min(480, Math.max(280, Math.round(viewport.width - 24)))
    : 360;

  const effectiveHeight = isMobile ? computedMobileHeight : desktopHeight;

  const clampPosToViewport = useCallback(
    (pos: ChatPosition, heightPx: number): ChatPosition => {
      const leftMin = Math.max(0, safeAreaLeft + 8);
      const rightMax = Math.max(
        leftMin,
        viewport.innerWidth - safeAreaRight - 8 - containerWidthPx
      );
      const topMin = 8;
      const bottomMax = Math.max(
        topMin,
        viewport.height - Math.max(0, keyboardInset) - mobileNavHeightPx - 8 - heightPx
      );
      return {
        x: clamp(pos.x, leftMin, rightMax),
        y: clamp(pos.y, topMin, bottomMax),
      };
    },
    [
      containerWidthPx,
      keyboardInset,
      mobileNavHeightPx,
      safeAreaLeft,
      safeAreaRight,
      viewport.height,
      viewport.innerWidth,
    ]
  );

  const defaultPos: ChatPosition = useMemo(() => {
    const x = isMobile
      ? Math.round((viewport.innerWidth - containerWidthPx) / 2)
      : viewport.innerWidth - containerWidthPx - 24;
    const y = isMobile ? viewport.height - effectiveHeight : viewport.height - effectiveHeight - 24;
    return clampPosToViewport({ x, y }, effectiveHeight);
  }, [
    clampPosToViewport,
    containerWidthPx,
    effectiveHeight,
    isMobile,
    viewport.height,
    viewport.innerWidth,
  ]);

  const effectivePos = useMemo(() => {
    if (isMobile) {
      // Mobile: keep horizontally centered; y is handled by bottom inset.
      const x = clampPosToViewport(defaultPos, effectiveHeight).x;
      return { x, y: 0 };
    }
    return clampPosToViewport(chatPos || defaultPos, effectiveHeight);
  }, [chatPos, clampPosToViewport, defaultPos, effectiveHeight]);

  const reduceEffects = isKeyboardOpen || (isMobile && isMessagesScrolling);
  const containerShadow = reduceEffects
    ? '0 14px 28px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(225, 29, 72, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
    : '0 24px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(225, 29, 72, 0.5), 0 0 28px rgba(124, 58, 237, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)';

  const containerStyle: React.CSSProperties = {
    background:
      'linear-gradient(135deg, rgba(12, 12, 12, 0.7) 0%, rgba(32, 12, 24, 0.72) 45%, rgba(52, 16, 76, 0.78) 100%)',
    borderRadius: '24px',
    boxShadow: containerShadow,
    width: `${containerWidthPx}px`,
    maxWidth: `${containerWidthPx}px`,
    height: `${effectiveHeight}px`,
    maxHeight: `${effectiveHeight}px`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    border: '1px solid rgba(225, 29, 72, 0.5)',
    animation: isMobile
      ? 'chatSlideInFromBottom 0.4s ease-out'
      : 'chatSlideInFromRight 0.4s ease-out',
    backdropFilter: reduceEffects ? 'none' : 'blur(20px)',
    position: 'fixed',
    left: `${effectivePos.x}px`,
    ...(isMobile
      ? {
          top: 'auto',
          bottom: `${mobileBottomInset}px`,
        }
      : { top: `${effectivePos.y}px` }),
    pointerEvents: 'auto',
    overflow: 'hidden',
    isolation: 'isolate',
    transform: 'translateZ(0)',
    willChange: reduceEffects ? 'auto' : 'transform',
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: isMobile ? '16px 16px calc(12px + env(safe-area-inset-bottom))' : '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '16px' : '20px',
    background: 'transparent',
    borderRadius: 0,
    scrollBehavior: 'smooth',
  };

  const inputAreaStyle: React.CSSProperties = {
    padding: isMobile ? '12px 16px 12px' : '16px',
    paddingBottom: isMobile ? 'calc(14px + env(safe-area-inset-bottom))' : '16px',
    borderTop: 'none',
    background: 'transparent',
    borderRadius: '0 0 24px 24px',
  };

  if (!isOpen) return null;

  const onDragPointerDown = (e: React.PointerEvent) => {
    const startPos = effectivePos;
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPos,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    const st = dragStateRef.current;
    if (!st?.isDragging) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const next = clampPosToViewport(
      { x: st.startPos.x + dx, y: st.startPos.y + dy },
      effectiveHeight
    );
    setChatPos(next);
    e.preventDefault();
  };

  const onDragPointerUp = () => {
    const st = dragStateRef.current;
    if (!st?.isDragging) return;
    dragStateRef.current = null;
    const finalPos = clampPosToViewport(chatPos || effectivePos, effectiveHeight);
    setChatPos(finalPos);
    persistChatPos(finalPos);
  };

  const overlayWrapperStyle: React.CSSProperties = {
    ...overlayStyle,
    background: 'transparent',
  };

  return (
    <Dialog.Root
      open={isOpen}
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div
          className={`chatbot-overlay ${isOpen ? 'is-visible' : ''}${isKeyboardOpen ? ' is-keyboard-open' : ''}${
            isMessagesScrolling ? ' is-scrolling' : ''
          }`}
          style={overlayWrapperStyle}
        >
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: mobileOverlayBackground,
              pointerEvents: 'none',
            }}
          />

          <Dialog.Content
            className="chatbot-container"
            style={containerStyle}
            aria-labelledby="chatbot-dialog-title"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            {!isMobile && (
              <div
                className="chatbot-drag-handle"
                title="Перетащите, чтобы переместить чат"
                onPointerDown={onDragPointerDown}
                onPointerMove={onDragPointerMove}
                onPointerUp={onDragPointerUp}
                onPointerCancel={onDragPointerUp}
              />
            )}
            {/* Заголовок */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '14px 16px' : '16px',
                borderBottom: '1px solid rgba(225, 29, 72, 0.28)',
                background:
                  'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(124, 58, 237, 0.18) 100%)',
                borderRadius: '24px 24px 0 0',
              }}
            >
              <div
                className="chatbot-header-info"
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div className="chatbot-avatar" style={{ position: 'relative' }}>
                  <img
                    src={`${import.meta.env.BASE_URL}Валюша.jpg`}
                    alt="НейроВалюша"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(225, 29, 72, 0.5)',
                      boxShadow: '0 0 15px rgba(255, 79, 139, 0.35)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      right: '-1px',
                      width: '12px',
                      height: '12px',
                      background: '#ff4f8b',
                      borderRadius: '50%',
                      border: '2px solid rgba(12, 12, 12, 0.95)',
                      boxShadow: '0 0 8px rgba(255, 79, 139, 0.6)',
                    }}
                  ></div>
                </div>
                <div>
                  <Dialog.Title asChild>
                    <h3
                      id="chatbot-dialog-title"
                      style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#ff4f8b',
                        margin: 0,
                        textShadow: '0 0 10px rgba(255, 79, 139, 0.45)',
                      }}
                    >
                      НейроВалюша
                    </h3>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#a0aec0',
                        margin: 0,
                        fontWeight: '500',
                      }}
                    >
                      ✨ Нейро вожатый
                    </p>
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  style={{
                    color: '#a0aec0',
                    background: 'rgba(124, 58, 237, 0.18)',
                    border: '1px solid rgba(124, 58, 237, 0.45)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.28)';
                    e.currentTarget.style.color = '#ff4f8b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.18)';
                    e.currentTarget.style.color = '#a0aec0';
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {/* Контекстная информация */}
            {(currentView || currentCategory || currentBadge || currentLevel || cabinetContext) && (
              <div
                className="chatbot-context"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(225, 29, 72, 0.15)',
                  borderBottom: '1px solid rgba(225, 29, 72, 0.28)',
                  borderLeft: '3px solid #ff4f8b',
                }}
              >
                <div
                  className="chatbot-context-text"
                  style={{
                    fontSize: '12px',
                    color: '#ff4f8b',
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {currentView && (
                    <div
                      className="chatbot-context-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span className="chatbot-context-icon" style={{ fontSize: '14px' }}>
                        🧭
                      </span>
                      <span>
                        Экран:{' '}
                        {(
                          {
                            intro: 'Главная',
                            categories: 'Список категорий',
                            category: 'Категория',
                            badge: 'Страница значка',
                            'badge-level': 'Уровень значка',
                            profile: 'Личный кабинет',
                            introduction: 'Введение',
                            'additional-material': 'Доп. материалы',
                            'about-camp': 'Информация о лагере',
                            'registration-form': 'Форма регистрации',
                          } as Record<string, string>
                        )[currentView] || currentView}
                      </span>
                    </div>
                  )}
                  {cabinetContext && (
                    <div
                      className="chatbot-context-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span className="chatbot-context-icon" style={{ fontSize: '14px' }}>
                        📍
                      </span>
                      <span>
                        {cabinetContext.sectionLabel}
                        {cabinetContext.tabLabel ? ` → ${cabinetContext.tabLabel}` : ''}
                      </span>
                    </div>
                  )}
                  {currentCategory && !cabinetContext && (
                    <div
                      className="chatbot-context-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span className="chatbot-context-icon" style={{ fontSize: '14px' }}>
                        📁
                      </span>
                      <span>
                        Категория: {currentCategory.emoji} {currentCategory.title}
                      </span>
                    </div>
                  )}
                  {currentBadge && !cabinetContext && (
                    <div
                      className="chatbot-context-item chatbot-context-item-with-margin"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: currentCategory ? '3px' : '0',
                      }}
                    >
                      <span className="chatbot-context-icon" style={{ fontSize: '14px' }}>
                        🏆
                      </span>
                      <span>
                        Значок: {currentBadge.emoji} {currentBadge.title}
                      </span>
                    </div>
                  )}
                  {currentLevel && !cabinetContext && (
                    <div
                      className="chatbot-context-item"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span className="chatbot-context-icon" style={{ fontSize: '14px' }}>
                        🎯
                      </span>
                      <span>
                        Уровень: {currentLevel}
                        {currentLevelBadgeTitle ? ` — ${currentLevelBadgeTitle}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Traveler: превью и CTA вместо чата */}
            {!canUseChat && (
              <div
                className="chatbot-messages chatbot-locked"
                style={{
                  ...messagesContainerStyle,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#ff4f8b',
                      margin: '0 0 12px 0',
                    }}
                  >
                    Что умеет Валюша
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    НейроВалюша — ИИ-вожатый Путеводителя. Отвечает на вопросы о значках, помогает
                    составить план, подсказывает по методике и лагерю.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onUnlockRequest?.();
                    }}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                      background: 'linear-gradient(135deg, #ff4f8b, #7c3aed)',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Разблокировать через код
                  </button>
                </div>
              </div>
            )}

            {/* Сообщения (только если canUseChat) */}
            {canUseChat && (
              <div
                ref={messagesListRef}
                className="chatbot-messages"
                style={messagesContainerStyle}
                onScroll={onMessagesScroll}
              >
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#a0aec0', padding: '30px 0' }}>
                    <div
                      className="chatbot-welcome-avatar"
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        marginBottom: '20px',
                      }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}Валюша.jpg`}
                        alt="НейроВалюша"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid rgba(225, 29, 72, 0.7)',
                          boxShadow: '0 0 25px rgba(255, 79, 139, 0.5)',
                        }}
                      />
                      <div
                        className="chatbot-welcome-indicator"
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          width: '20px',
                          height: '20px',
                          background: '#ff4f8b',
                          borderRadius: '50%',
                          border: '2px solid rgba(12, 12, 12, 0.95)',
                          boxShadow: '0 0 12px rgba(255, 79, 139, 0.7)',
                          animation: 'chatPulse 2s infinite',
                        }}
                      ></div>
                    </div>
                    <h3
                      className="chatbot-welcome-title"
                      style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#ff4f8b',
                        margin: '0 0 12px 0',
                        textShadow: '0 0 12px rgba(255, 79, 139, 0.45)',
                      }}
                    >
                      Привет! 😊
                    </h3>
                    <p
                      className="chatbot-welcome-text"
                      style={{
                        fontSize: '14px',
                        margin: '0 0 8px 0',
                        fontWeight: '500',
                        color: '#e2e8f0',
                        lineHeight: '1.4',
                      }}
                    >
                      Я здесь чтобы помочь!
                    </p>
                    <p
                      className="chatbot-welcome-subtext"
                      style={{
                        fontSize: '12px',
                        margin: '0',
                        opacity: '0.9',
                        color: '#a0aec0',
                        lineHeight: '1.4',
                      }}
                    >
                      Если что-то не понятно — спрашивай! 💫
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chatbot-message ${message.isUser ? 'user' : 'bot'}`}
                    style={{
                      display: 'flex',
                      justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      className="chatbot-message-content"
                      style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: message.isUser
                          ? 'linear-gradient(135deg, #ff4f8b 0%, #7c3aed 100%)'
                          : 'rgba(225, 29, 72, 0.12)',
                        color: message.isUser ? 'white' : '#e2e8f0',
                        border: message.isUser
                          ? '1px solid rgba(225, 29, 72, 0.35)'
                          : '1px solid rgba(225, 29, 72, 0.22)',
                        boxShadow: message.isUser
                          ? '0 6px 20px rgba(225, 29, 72, 0.35)'
                          : '0 3px 12px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <p
                        className="chatbot-message-text"
                        style={{
                          fontSize: '13px',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4',
                          fontWeight: '500',
                        }}
                      >
                        {message.text}
                      </p>
                      <p
                        className="chatbot-message-time"
                        style={{
                          fontSize: '10px',
                          marginTop: '6px',
                          color: message.isUser
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'rgba(160, 174, 192, 0.6)',
                          fontWeight: '400',
                        }}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="chatbot-loading">
                    <div className="chatbot-loading-content">
                      <div className="chatbot-loading-spinner">
                        <div className="chatbot-spinner"></div>
                        <span className="chatbot-loading-text">НейроВалюша печатает...</span>
                      </div>
                    </div>
                  </div>
                )}

                {showJumpToBottom && messages.length > 0 && (
                  <div
                    style={{
                      position: 'sticky',
                      bottom: '12px',
                      display: 'flex',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      marginTop: '-6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        isNearBottomRef.current = true;
                        setShowJumpToBottom(false);
                        scrollToBottom('smooth');
                      }}
                      style={{
                        pointerEvents: 'auto',
                        border: '1px solid rgba(225, 29, 72, 0.35)',
                        background: 'rgba(12, 12, 12, 0.72)',
                        color: '#e2e8f0',
                        borderRadius: '999px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 10px 20px rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(10px)',
                      }}
                      aria-label="Прокрутить к последнему сообщению"
                    >
                      ↓ к последнему
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Подсказки отключены */}

            {/* Поле ввода (только если canUseChat) */}
            {canUseChat && (
              <div style={inputAreaStyle}>
                <div
                  className="chatbot-input-wrapper"
                  style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
                >
                  <input
                    ref={inputRef}
                    autoFocus={!isMobile}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Напишите сообщение..."
                    className="chatbot-input"
                    style={{
                      flex: 1,
                      padding: isMobile ? '12px 14px' : '12px 16px',
                      border: '1px solid rgba(124, 58, 237, 0.35)',
                      borderRadius: '16px',
                      fontSize: isMobile ? '16px' : '14px',
                      outline: 'none',
                      background: 'rgba(12, 12, 12, 0.6)',
                      color: '#e2e8f0',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      minHeight: isMobile ? '48px' : 'auto',
                    }}
                    disabled={isLoading}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(124, 58, 237, 0.7)';
                      e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.25)';
                      if (!isMobile) {
                        scrollToBottom('auto');
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(124, 58, 237, 0.35)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className="chatbot-send-btn"
                    style={{
                      padding: isMobile ? '12px 14px' : '12px 16px',
                      background: 'linear-gradient(135deg, #ff4f8b 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: isMobile ? '16px' : '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: !inputText.trim() || isLoading ? 0.5 : 1,
                      boxShadow: '0 6px 20px rgba(124, 58, 237, 0.35)',
                      transition: 'all 0.3s ease',
                      minWidth: isMobile ? '72px' : '80px',
                      minHeight: isMobile ? '48px' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(124, 58, 237, 0.45)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.35)';
                    }}
                  >
                    Отправить
                  </button>
                </div>
                <div
                  className="chatbot-limit-hint"
                  style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}
                >
                  Сообщений в день: {messagesPerDay !== null ? messagesPerDay : '—'}
                </div>
              </div>
            )}
          </Dialog.Content>

          <style
            dangerouslySetInnerHTML={{
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
        `,
            }}
          />
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default React.memo(ChatBot);
