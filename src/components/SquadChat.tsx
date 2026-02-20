import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSquadMessages, postSquadMessage, type SquadMessage } from '../utils/badgeApprovalApi';

interface SquadChatProps {
  squadId: string;
  accessToken: string;
}

export const SquadChat: React.FC<SquadChatProps> = ({ squadId, accessToken }) => {
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const isNearBottom = useCallback(() => {
    const node = listRef.current;
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 64;
  }, []);

  const scrollToBottom = useCallback(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stickToBottom = isNearBottom();
      const data = await fetchSquadMessages(accessToken, squadId, { limit: 50 });
      setMessages(data.messages || []);
      if (stickToBottom) {
        requestAnimationFrame(scrollToBottom);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isNearBottom, scrollToBottom, squadId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    const onFocus = () => {
      void loadMessages();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadMessages]);

  const sendMessage = useCallback(async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await postSquadMessage(accessToken, squadId, clean);
      setMessages((prev) => [...prev, created.message]);
      setText('');
      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  }, [accessToken, sending, scrollToBottom, squadId, text]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);

  return (
    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Чат отряда</div>
      {error && <div className="profile-error profile-error--not-found" style={{ marginBottom: 8 }}>{error}</div>}
      <div
        ref={listRef}
        style={{
          maxHeight: 240,
          minHeight: 120,
          overflowY: 'auto',
          borderRadius: 10,
          padding: 8,
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 8
        }}
      >
        {loading && messages.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Сообщений пока нет.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 8, fontSize: 12, lineHeight: 1.35 }}>
              <div style={{ opacity: 0.75 }}>
                {(m.nickname || m.deviceId || 'Участник')} {m.role ? `· ${m.role}` : ''} · {new Date(m.createdAt).toLocaleString('ru-RU')}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          className="w-input"
          style={{ width: '100%', minHeight: 70 }}
          placeholder="Напишите сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{text.trim().length}/2000</span>
        <button type="button" className="btn-primary-gold" style={{ padding: '8px 14px' }} onClick={() => void sendMessage()} disabled={!canSend}>
          {sending ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </div>
  );
};

