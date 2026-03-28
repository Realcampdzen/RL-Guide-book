import sys

file_path = "src/components/SquadChat.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add formatChatDate at the top
is_image_avatar_src = """const isImageAvatar = (value?: string | null): boolean => Boolean(
  value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'))
);"""

is_image_avatar_dest = """const isImageAvatar = (value?: string | null): boolean => Boolean(
  value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'))
);

const formatChatDate = (isoStr: string): string => {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Вчера, ${timeStr}`;
  
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')}, ${timeStr}`;
};"""

content = content.replace(is_image_avatar_src, is_image_avatar_dest)

# 2. Replace message rendering loop
msg_block_start = "            return (\n              <div key={m.id}"
msg_block_end = "            );\n          })\n        )}"

start_idx = content.find(msg_block_start)
end_idx = content.find(msg_block_end)

if start_idx == -1 or end_idx == -1:
    print("Could not find message loop bounds")
    sys.exit(1)

new_msg_block = """            return (
              <div key={m.id}
                style={{
                  marginBottom: 16,
                  display: 'flex', gap: 10,
                  alignItems: 'flex-start',
                  position: 'relative',
                  opacity: isPinned(m) ? 1 : 0.95,
                  paddingRight: 8,
                }}>
                
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  {writerAvatar && isImageAvatar(writerAvatar) ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}` }}>
                      <img src={writerAvatar} alt={m.nickname || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : writerAvatar ? (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                      border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                    }}>
                      {writerAvatar}
                    </div>
                  ) : (
                    <div style={{ 
                      width: 36, height: 36, borderRadius: '50%', 
                      background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                      border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: 14, fontWeight: 800, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                    }}>
                      {initial}
                    </div>
                  )}
                </div>

                {/* Content Container */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 8px', marginBottom: 4, width: '100%' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: isCounselor ? '#f472b6' : '#e8f0ff' }}>
                      {m.nickname || 'Участник'}
                    </span>
                    {m.role && (
                      <span style={{ 
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
                        padding: '2px 6px', borderRadius: 6,
                        background: isCounselor ? 'rgba(244,114,182,0.15)' : 'rgba(255,255,255,0.08)',
                        color: isCounselor ? '#f472b6' : 'rgba(255, 255, 255, 0.7)',
                        border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.25)' : 'rgba(255,255,255,0.1)'}`
                      }}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    )}
                    {isPinned(m) && <span style={{ fontSize: 11, filter: 'drop-shadow(0 0 4px rgba(139, 0, 255, 0.5))' }} title="Закреплено">📌</span>}
                    
                    {/* Action buttons visible on hover (or always partially transparent) */}
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', opacity: 0.75, transition: 'opacity 0.2s' }} className="msg-actions">
                        <button type="button" title={isPinned(m) ? 'Открепить' : 'Закрепить'}
                          onClick={() => void handlePin(m.id, !isPinned(m))}
                          style={{
                            padding: 4, borderRadius: 6, border: 'none',
                            background: isPinned(m) ? 'rgba(139, 0, 255, 0.2)' : 'transparent',
                            cursor: 'pointer', fontSize: 12, lineHeight: 1,
                            transition: 'background 0.15s, transform 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isPinned(m) ? 'rgba(139, 0, 255, 0.2)' : 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >📌</button>
                        <button type="button" title="Удалить"
                          onClick={() => { if (window.confirm('Удалить сообщение?')) void handleDelete(m.id); }}
                          style={{
                            padding: 4, borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            fontSize: 12, lineHeight: 1,
                            transition: 'background 0.15s, transform 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >🗑️</button>
                    </div>
                  </div>

                  {/* Bubble */}
                  <div style={{
                    position: 'relative',
                    background: isPinned(m) ? 'linear-gradient(135deg, rgba(139, 0, 255, 0.15), rgba(139, 0, 255, 0.05))' : 'rgba(255, 255, 255, 0.05)',
                    border: isPinned(m) ? '1px solid rgba(139, 0, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '0 12px 12px 12px',
                    padding: '8px 12px 14px 12px', /* extra padding for timestamp */
                    minWidth: 80,
                    maxWidth: '100%', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 13, lineHeight: 1.45, color: '#e8f0ff', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingBottom: 6 }}>
                      {m.text}
                    </div>
                    {/* Timestamp at bottom right corner */}
                    <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', fontWeight: 500 }}>
                       {formatChatDate(m.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
"""

content = content[:start_idx] + new_msg_block + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
