import React, { useMemo, useState, useCallback } from 'react';
import type { Badge } from '../types/guide';

// ---------------------------------------------------------------------------
// Helpers — localStorage likes
// ---------------------------------------------------------------------------

const LIKE_PREFIX = 'rl_badge_likes_';

function getLikeCount(badgeId: string): number {
    if (typeof window === 'undefined') return 0;
    return localStorage.getItem(`${LIKE_PREFIX}${badgeId}`) === '1' ? 1 : 0;
}

function toggleLike(badgeId: string): boolean {
    const key = `${LIKE_PREFIX}${badgeId}`;
    const liked = localStorage.getItem(key) === '1';
    if (liked) { localStorage.removeItem(key); return false; }
    localStorage.setItem(key, '1');
    return true;
}

function isLiked(badgeId: string): boolean {
    return typeof window !== 'undefined' && localStorage.getItem(`${LIKE_PREFIX}${badgeId}`) === '1';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommunityRankingPanelProps {
    communityBadges: Badge[];
    customBadges: Badge[];
    onNavigateToBadge?: (badgeId: string) => void;
    onShareCreatorCard?: (nickname: string, badgeCount: number, totalLikes: number) => void;
}

interface CreatorProfile {
    nickname: string;
    badgeCount: number;
    totalLikes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#f59e0b';
const ACCENT_LIGHT = 'rgba(245, 158, 11, 0.15)';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CommunityRankingPanel: React.FC<CommunityRankingPanelProps> = ({
    communityBadges,
    customBadges,
    onNavigateToBadge,
    onShareCreatorCard,
}) => {
    const allBadges = useMemo(() => [...communityBadges, ...customBadges], [communityBadges, customBadges]);

    // Category filter
    const categories = useMemo(() => {
        const set = new Set<string>();
        allBadges.forEach(b => { if (b.category_id) set.add(b.category_id); });
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [allBadges]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Like toggle state (force re-render)
    const [likeVersion, setLikeVersion] = useState(0);

    const handleToggleLike = useCallback((badgeId: string) => {
        toggleLike(badgeId);
        setLikeVersion(v => v + 1);
    }, []);

    // Filtered badges
    const filteredBadges = useMemo(() => {
        if (!selectedCategory) return allBadges;
        return allBadges.filter(b => b.category_id === selectedCategory);
    }, [allBadges, selectedCategory]);

    // Top-5 weekly (by likes, within 7 days)
    const topWeekly = useMemo(() => {
        return allBadges
            .map(b => ({ badge: b, likes: getLikeCount(b.id) }))
            .filter(item => item.likes > 0)
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 5);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allBadges, likeVersion]);

    // Creator Card popup
    const [creatorPopup, setCreatorPopup] = useState<CreatorProfile | null>(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ---------- Top-5 Weekly ---------- */}
            <div style={{ padding: 14, borderRadius: 14, background: ACCENT_LIGHT, border: `1px solid rgba(245,158,11,0.25)` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🏆 Лучшее недели
                </div>
                {topWeekly.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Пока нет лайков. Оцени значки в списке ниже!</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {topWeekly.map((item, idx) => (
                            <div
                                key={item.badge.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                                    borderRadius: 10, background: 'rgba(0,0,0,0.15)',
                                    cursor: onNavigateToBadge ? 'pointer' : undefined,
                                }}
                                onClick={() => onNavigateToBadge?.(item.badge.id)}
                            >
                                <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </span>
                                <span style={{ fontSize: 18 }}>{item.badge.emoji || '⭐'}</span>
                                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.badge.title}
                                </span>
                                <span style={{ fontSize: 11, opacity: 0.8 }}>❤️ {item.likes}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ---------- Category Filter ---------- */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>Категории:</span>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11, opacity: selectedCategory === null ? 1 : 0.7 }}
                    onClick={() => setSelectedCategory(null)}
                >
                    Все
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, opacity: selectedCategory === cat ? 1 : 0.7 }}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        Кат. {cat}
                    </button>
                ))}
            </div>

            {/* ---------- Badges List ---------- */}
            {filteredBadges.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Нет значков в этой категории.</div>
            ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                    {filteredBadges.map(badge => {
                        const liked = isLiked(badge.id);
                        const likes = getLikeCount(badge.id);
                        return (
                            <div
                                key={badge.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                                    borderRadius: 10, background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span style={{ fontSize: 18, cursor: onNavigateToBadge ? 'pointer' : undefined }}
                                    onClick={() => onNavigateToBadge?.(badge.id)}
                                >
                                    {badge.emoji || '⭐'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0, cursor: onNavigateToBadge ? 'pointer' : undefined }}
                                    onClick={() => onNavigateToBadge?.(badge.id)}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {badge.title}
                                    </div>
                                    <div style={{ fontSize: 10, opacity: 0.6 }}>Кат. {badge.category_id} · {badge.level}</div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                        padding: '4px 8px', fontSize: 11, minWidth: 44,
                                        color: liked ? '#ef4444' : undefined,
                                        borderColor: liked ? 'rgba(239,68,68,0.4)' : undefined,
                                    }}
                                    onClick={() => handleToggleLike(badge.id)}
                                >
                                    {liked ? '❤️' : '🤍'} {likes}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ---------- Creator Card Popup ---------- */}
            {creatorPopup && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setCreatorPopup(null)}
                >
                    <div
                        style={{
                            background: 'var(--surface-2, #1a1a2e)', borderRadius: 16, padding: 24,
                            maxWidth: 320, width: '90%', border: `1px solid rgba(245,158,11,0.3)`,
                            textAlign: 'center',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🎨</div>
                        <h4 style={{ margin: '0 0 4px', color: ACCENT, fontSize: 16 }}>{creatorPopup.nickname}</h4>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>Созидатель</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>{creatorPopup.badgeCount}</div>
                                <div style={{ fontSize: 10, opacity: 0.8 }}>Значков</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{creatorPopup.totalLikes}</div>
                                <div style={{ fontSize: 10, opacity: 0.8 }}>Лайков</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {onShareCreatorCard && (
                                <button
                                    type="button"
                                    className="btn-primary-gold"
                                    style={{ padding: '8px 16px', fontSize: 12 }}
                                    onClick={() => {
                                        onShareCreatorCard(creatorPopup.nickname, creatorPopup.badgeCount, creatorPopup.totalLikes);
                                        setCreatorPopup(null);
                                    }}
                                >
                                    📤 Поделиться
                                </button>
                            )}
                            <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => setCreatorPopup(null)}>
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityRankingPanel;
