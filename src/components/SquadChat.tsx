import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSquadMessages, postSquadMessage, deleteSquadMessage, pinSquadMessage, fetchPinnedMessage, fetchTeamMessages, postTeamMessage, deleteTeamMessage, type SquadMessage } from '../utils/badgeApprovalApi';
import { EMOJI_CATEGORIES } from '../utils/emojiData';

const ROLE_LABELS: Record<string, string> = {
  participant: 'Участник',
  counselor: 'Вожатый',
  educator: 'Педагог',
  shift_leader: 'Ст. вожатый',
  camp_director: 'Нач. лагеря',
  parent: 'Родитель',
  developer: 'Разработчик',
};

const isImageAvatar = (value?: string | null): boolean => Boolean(
  value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'))
);


interface SquadChatProps {
  squadId: string;
  accessToken: string;
  nickname?: string;
  deviceId?: string;
  role?: string;
  chatType?: 'squad' | 'team' | 'wing';
  members?: Array<{ deviceId: string; nickname?: string | null; avatarUrl?: string | null }>;
  height?: string | number;
  minHeight?: string | number;
}

export const SquadChat: React.FC<SquadChatProps> = ({ squadId, accessToken, nickname: myNickname, deviceId, chatType = 'squad', members = [], height = 'calc(100vh - 120px)', minHeight = 500 }) => {
  // In sandbox/dev mode, accessToken may be a fake deviceId string, not a real JWT.
  // In that case we must use X-Device-Id header instead of Authorization.
  const isRealJwt = accessToken && accessToken.includes('.');
  const authHeaders = useMemo((): Record<string, string> => {
    if (isRealJwt) return { Authorization: `Bearer ${accessToken}` };
    if (import.meta.env.DEV && deviceId) return { 'X-Device-Id': deviceId };
    return {};
  }, [accessToken, deviceId, isRealJwt]);
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCat, setEmojiCat] = useState('smileys');
  const [pinnedMsg, setPinnedMsg] = useState<SquadMessage | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);


  const insertEmoji = useCallback((emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  }, []);

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
      const data = chatType === 'squad'
        ? await fetchSquadMessages(isRealJwt ? accessToken : '', squadId, { limit: 50 }, authHeaders)
        : await fetchTeamMessages(isRealJwt ? accessToken : '', squadId, { limit: 50 }, authHeaders);
      setMessages(data.messages || []);
      if (stickToBottom) requestAnimationFrame(scrollToBottom);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isNearBottom, scrollToBottom, squadId, authHeaders, isRealJwt]);

  const loadPinned = useCallback(async () => {
    if (chatType === 'team') return; // pinning supported for squad and wing chat
    try {
      const data = await fetchPinnedMessage(isRealJwt ? accessToken : '', squadId, authHeaders);
      setPinnedMsg(data.message || null);
    } catch { /* ignore */ }
  }, [accessToken, squadId, chatType, authHeaders, isRealJwt]);

  useEffect(() => { void loadMessages(); void loadPinned(); }, [loadMessages, loadPinned]);

  useEffect(() => {
    const timer = window.setInterval(() => { void loadMessages(); }, 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    const onFocus = () => { void loadMessages(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadMessages]);

  const sendMessage = useCallback(async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    setEmojiOpen(false);
    try {
      const created = chatType === 'squad'
        ? await postSquadMessage(isRealJwt ? accessToken : '', squadId, clean, myNickname, authHeaders)
        : await postTeamMessage(isRealJwt ? accessToken : '', squadId, clean, myNickname, authHeaders);
      setMessages((prev) => [...prev, created.message]);
      setText('');
      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  }, [accessToken, myNickname, sending, scrollToBottom, squadId, text, authHeaders, isRealJwt]);

  const handleDelete = useCallback(async (msgId: string) => {
    try {
      chatType === 'squad'
        ? await deleteSquadMessage(isRealJwt ? accessToken : '', squadId, msgId, authHeaders)
        : await deleteTeamMessage(isRealJwt ? accessToken : '', squadId, msgId, authHeaders);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (pinnedMsg?.id === msgId) setPinnedMsg(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить.');
    }
  }, [accessToken, squadId, pinnedMsg, authHeaders, isRealJwt]);

  const handlePin = useCallback(async (msgId: string, pin: boolean) => {
    try {
      const res = await pinSquadMessage(isRealJwt ? accessToken : '', squadId, msgId, pin, authHeaders);
      setPinnedMsg(res.pinned ? (res.message || null) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось закрепить.');
    }
  }, [accessToken, squadId, authHeaders, isRealJwt]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);
  const activeCatEmojis = useMemo(() => EMOJI_CATEGORIES.find(c => c.id === emojiCat)?.emojis || [], [emojiCat]);

  const isPinned = (m: SquadMessage) => pinnedMsg?.id === m.id;

  return (
    <div className="fade-in" style={{
      padding: 16, borderRadius: 16,
      background: 'rgba(15, 10, 42, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', height, minHeight,
    }}>
      {/* Header */}
      <div style={{
        fontSize: 14, fontWeight: 700, marginBottom: 12,
        color: '#e8f0ff', letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: messages.length > 0 ? '#8b00ff' : 'rgba(255,255,255,0.25)',
          boxShadow: messages.length > 0 ? '0 0 8px rgba(139, 0, 255, 0.5)' : 'none',
        }} />
        {chatType === 'wing' ? 'Чат Крыла' : chatType === 'team' ? 'Чат Движка' : 'Чат отряда'}
        {loading && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>обновление...</span>}
      </div>

      {/* Pinned message banner */}
      {pinnedMsg && (
        <div style={{
          padding: '8px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(139, 0, 255, 0.08)', border: '1px solid rgba(139, 0, 255, 0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>📌</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              {pinnedMsg.nickname || 'Участник'} · {ROLE_LABELS[pinnedMsg.role || ''] || pinnedMsg.role}
            </div>
            <div style={{
              fontSize: 12, color: '#e8f0ff', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{pinnedMsg.text}</div>
          </div>
          <button type="button" onClick={() => void handlePin(pinnedMsg.id, false)}
            title="Открепить" style={{
              padding: '2px 6px', borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 11, flexShrink: 0,
            }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '8px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)',
          color: '#ff6b6b', fontSize: 12,
        }}>{error}</div>
      )}

      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, overflowY: 'auto', borderRadius: 12, padding: 10,
        background: 'rgba(0, 0, 0, 0.15)', border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: 12, minHeight: 200,
      }}>
        {loading && messages.length === 0 ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 32 }}>Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 32, fontWeight: 500 }}>Сообщений пока нет. Напишите первое!</div>
        ) : (
          messages.map((m) => {
            const writer = members.find(x => x.deviceId === m.deviceId || (x.nickname && x.nickname === m.nickname));
            const writerAvatar = m.avatarUrl || writer?.avatarUrl;
            const isCounselor = m.role === 'counselor' || m.role === 'shift_leader' || m.role === 'developer';
            const initial = (m.nickname || writer?.nickname || 'У')[0].toUpperCase();

            return (
              <div key={m.id}
                style={{
                  marginBottom: 8, padding: '10px 14px', borderRadius: 12, position: 'relative',
                  background: isPinned(m) ? 'rgba(139, 0, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                  border: isPinned(m) ? '1px solid rgba(139, 0, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  {writerAvatar && isImageAvatar(writerAvatar) ? (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}` }}>
                      <img src={writerAvatar} alt={m.nickname || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : writerAvatar ? (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                      border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                      flexShrink: 0
                    }}>
                      {writerAvatar}
                    </div>
                  ) : (
                    <div style={{ 
                      width: 34, height: 34, borderRadius: '50%', 
                      background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                      border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: 14, fontWeight: 800, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                      flexShrink: 0
                    }}>
                      {initial}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Message header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                      {isPinned(m) && <span style={{ fontSize: 10 }}>📌</span>}
                      <span style={{ fontWeight: 600, color: '#e8f0ff' }}>{m.nickname || 'Участник'}</span>
                      {m.role && <span style={{ color: isCounselor ? '#f472b6' : 'rgba(255, 215, 0, 0.6)' }}>· {ROLE_LABELS[m.role] || m.role}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 10 }}>{new Date(m.createdAt).toLocaleString('ru-RU')}</span>
                      {/* Action buttons */}
                      <button type="button" title={isPinned(m) ? 'Открепить' : 'Закрепить'}
                        onClick={() => void handlePin(m.id, !isPinned(m))}
                        style={{
                          padding: '1px 5px', borderRadius: 4, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: 13, lineHeight: 1, opacity: isPinned(m) ? 0.8 : 0.35,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = isPinned(m) ? '0.8' : '0.35'; }}
                      >📌</button>
                      <button type="button" title="Удалить"
                        onClick={() => { if (window.confirm('Удалить сообщение?')) void handleDelete(m.id); }}
                        style={{
                          padding: '1px 5px', borderRadius: 4, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: 13, lineHeight: 1, opacity: 0.35,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.35'; }}
                      >🗑️</button>
                    </div>
                    {/* Message text */}
                    <div style={{ fontSize: 13, lineHeight: 1.45, color: '#e8f0ff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Emoji picker */}
      {emojiOpen && (
        <>
          <div onClick={() => setEmojiOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{
            position: 'relative', zIndex: 101, marginBottom: 8,
            background: 'rgba(10, 8, 30, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14, padding: 10,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 8, overflowX: 'auto' }}>
              {EMOJI_CATEGORIES.map(cat => (
                <button key={cat.id} type="button" title={cat.label}
                  onClick={() => setEmojiCat(cat.id)}
                  style={{
                    padding: '4px 8px', borderRadius: 8, border: 'none',
                    background: emojiCat === cat.id ? 'rgba(139, 0, 255, 0.15)' : 'transparent',
                    cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0,
                    transition: 'background 0.12s',
                  }}
                >{cat.icon}</button>
              ))}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2, maxHeight: 180, overflowY: 'auto', padding: 2,
            }}>
              {activeCatEmojis.map((e, i) => (
                <button key={i} type="button" onClick={() => insertEmoji(e)}
                  style={{
                    padding: 4, border: 'none', borderRadius: 6,
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 22, lineHeight: 1, textAlign: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}
                >{e}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          className="squad-chat-input"
          rows={1}
          style={{
            flex: 1, minHeight: 48, height: 48, maxHeight: 120, resize: 'vertical',
            padding: '14px 14px', borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e8f0ff', fontSize: 13,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 0, 255, 0.4)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
          placeholder="Напишите сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canSend) { e.preventDefault(); void sendMessage(); } }}
        />
        <button type="button" onClick={() => setEmojiOpen(!emojiOpen)} title="Эмодзи"
          style={{
            width: 48, height: 48, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            background: emojiOpen ? 'rgba(139, 0, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: emojiOpen ? '1px solid rgba(139, 0, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer', fontSize: 20, transition: 'all 0.15s',
          }}
        >😊</button>
        <button type="button" onClick={() => void sendMessage()} disabled={!canSend}
          style={{
            minWidth: 48, height: 48, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
            background: canSend
              ? 'linear-gradient(135deg, rgba(139, 0, 255, 0.3), rgba(139, 0, 255, 0.1))'
              : 'rgba(255, 255, 255, 0.08)',
            color: canSend ? '#e8f0ff' : 'rgba(255, 255, 255, 0.7)',
            fontSize: 18, fontWeight: 700, cursor: canSend ? 'pointer' : 'default',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            transition: 'all 0.15s',
            border: canSend ? '1px solid rgba(139, 0, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
            whiteSpace: 'nowrap',
          }}
        >{sending ? '...' : '→'}</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'right' }}>
        {text.trim().length}/2000
      </div>
      <style>{`
        .squad-chat-input::placeholder {
          color: rgba(255, 255, 255, 0.75) !important;
        }
      `}</style>
    </div>
  );
};
