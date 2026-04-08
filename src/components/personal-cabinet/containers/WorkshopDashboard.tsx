import React, { useState, useEffect } from 'react';
import { fetchMyProposals, createWorkshopProposal, type WorkshopProposal } from '../../../utils/workshopProposalsApi';
import { ArtInboxTab } from '../../ArtInboxTab';
import { ImageSourceBlock } from '../../ImageSourceBlock';
import { CommunityRankingPanel } from '../../CommunityRankingPanel';
import { requestImageGenerate } from '../../../utils/imageGenerateApi';

export interface WorkshopDashboardProps {
    workshopTab: string;
    effectiveToken: string | null;
    customBadges?: any[];
    communityBadges?: any[];
    navigateToBadge?: (id: string, action?: "plan" | "confirm") => void | Promise<void>;
}

export const WorkshopDashboard: React.FC<WorkshopDashboardProps> = ({
    workshopTab,
    effectiveToken,
    customBadges = [],
    communityBadges = [],
    navigateToBadge
}) => {
    const [wsProposalType, setWsProposalType] = useState<'badge' | 'category' | 'version'>('badge');
    const [wsTitle, setWsTitle] = useState('');
    const [wsDescription, setWsDescription] = useState('');
    const [wsEmoji, setWsEmoji] = useState('');
    const [wsBadgeId, setWsBadgeId] = useState('');
    const [wsImage, setWsImage] = useState<string | null>(null);
    const [wsBusy, setWsBusy] = useState(false);

    // Workshop proposals from API (used in "Мои проекты" tab)
    const [cabinetProposals, setCabinetProposals] = useState<WorkshopProposal[]>([]);
    useEffect(() => {
        if (!effectiveToken) return;
        let cancelled = false;
        fetchMyProposals(effectiveToken).then(rows => { if (!cancelled) setCabinetProposals(rows); }).catch(() => {});
        return () => { cancelled = true; };
    }, [effectiveToken]);

    const handleWsSubmit = async () => {
        if (!wsTitle.trim() || !effectiveToken) return;
        if (wsProposalType === 'version' && !wsBadgeId.trim()) return;
        setWsBusy(true);
        try {
            const created = await createWorkshopProposal(effectiveToken, {
                type: wsProposalType,
                title: wsTitle.trim(),
                description: wsDescription.trim() || undefined,
                emoji: wsProposalType === 'category' ? (wsEmoji.trim() || '📁') : undefined,
                badgeId: wsProposalType === 'version' ? wsBadgeId.trim() : undefined,
                image: wsImage || undefined,
            });
            setCabinetProposals(prev => [created, ...prev]);
            setWsTitle(''); setWsDescription(''); setWsEmoji(''); setWsBadgeId(''); setWsImage(null);
        } catch (_) { /* handled silently */ }
        setWsBusy(false);
    };

    const labelStyle = { 
        display: 'block', fontSize: 12, fontWeight: 800, 
        color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' as const, 
        letterSpacing: '0.05em', marginBottom: 8 
    };
    const activeClass = wsProposalType === 'badge' ? 'cab-input--cyan' : wsProposalType === 'category' ? 'cab-input--purple' : 'cab-input--pink';

    return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            {/* Конструктор */}
            {workshopTab === 'constructor' && (
                <div key="ws-constructor" className="fade-in cab-card" style={{
                    padding: '28px 32px', borderRadius: 20,
                    display: 'flex', flexDirection: 'column', gap: 24,
                }}>
                    {/* Header */}
                    <div>
                        <h3 style={{ 
                            margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                            letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <span style={{ fontSize: 20 }}>✨</span> Конструктор
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                            Предложи свой значок, категорию или версию. Всё пройдёт проверку вожатым. Ваши лучшие идеи попадут в путеводитель!
                        </p>
                    </div>

                    {/* Type selector */}
                    <div>
                        <div style={{ 
                            display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, 
                            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
                            flexWrap: 'wrap'
                        }}>
                            {([['badge', 'Новый значок'], ['category', 'Категория'], ['version', 'Версия']] as const).map(([type, label]) => (
                                <button key={type} type="button"
                                    className={wsProposalType === type ? 'cab-btn-accent-sm' : ''}
                                    onClick={() => setWsProposalType(type)}
                                    style={wsProposalType === type ? { padding: '8px 16px', borderRadius: 8 } : {
                                        padding: '8px 16px', borderRadius: 8,
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                        background: 'transparent',
                                        color: 'rgba(255,255,255,0.6)',
                                        border: 'none',
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p style={{ margin: '8px 0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                            {wsProposalType === 'badge' ? 'Предложи оригинальный значок в любую категорию'
                                : wsProposalType === 'category' ? 'Предложи новую масштабную категорию для значков'
                                : 'Предложи альтернативную версию существующего значка (например, новогоднюю)'}
                        </p>
                    </div>

                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {wsProposalType === 'badge' && (
                            <>
                                <div>
                                    <label style={labelStyle}>Название значка</label>
                                    <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                        placeholder="Например: Мастер костра" 
                                        className={`cab-input ${activeClass}`} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Описание и критерии</label>
                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                        placeholder="За что выдаётся этот значок? Какие задания нужно выполнить?" 
                                        className={`cab-input ${activeClass}`} style={{ minHeight: 100, resize: 'vertical' }} />
                                </div>
                            </>
                        )}

                        {wsProposalType === 'category' && (
                            <>
                                <div>
                                    <label style={labelStyle}>Название категории</label>
                                    <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                        placeholder="Например: Спортивные достижения" 
                                        className={`cab-input ${activeClass}`} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Описание</label>
                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                        placeholder="Пиши суть. Какие значки будут в этой категории?" 
                                        className={`cab-input ${activeClass}`} style={{ minHeight: 80, resize: 'vertical' }} />
                                </div>
                            </>
                        )}

                        {wsProposalType === 'version' && (
                            <>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>ID оригинала</label>
                                        <input value={wsBadgeId} onChange={e => setWsBadgeId(e.target.value)}
                                            placeholder="Например: 1.1" 
                                            className={`cab-input ${activeClass}`} />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={labelStyle}>Название версии</label>
                                        <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                            placeholder="Новогодняя искра" 
                                            className={`cab-input ${activeClass}`} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Отличия и условия</label>
                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                        placeholder="В чём особенность этой версии?" 
                                        className={`cab-input ${activeClass}`} style={{ minHeight: 80, resize: 'vertical' }} />
                                </div>
                            </>
                        )}

                        {/* Image Uploader */}
                        <div>
                            <label style={labelStyle}>Изображение (Опционально)</label>
                            <div style={{
                                padding: '16px', borderRadius: 16, background: 'rgba(0,0,0,0.15)',
                                border: '1px dashed rgba(255,255,255,0.06)'
                            }}>
                                <ImageSourceBlock
                                    context="workshop_badge"
                                    value={wsImage}
                                    onChange={(url) => setWsImage(url)}
                                    aspect="free"
                                    onGenerate={async (opts) =>
                                        requestImageGenerate({ mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' }, effectiveToken || null)
                                    }
                                    onProcess={async (imageBase64, opts) =>
                                        requestImageGenerate({ mode: 'process', context: 'workshop', imageBase64, prompt: opts?.prompt ?? '' }, effectiveToken || null)
                                    }
                                />
                                {wsImage && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                                        <button type="button" className="cab-btn cab-btn--danger"
                                            onClick={() => setWsImage(null)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            Удалить
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                            <button onClick={handleWsSubmit} 
                                disabled={!wsTitle.trim() || (wsProposalType === 'version' && !wsBadgeId.trim()) || wsBusy}
                                className="cab-btn-accent">
                                {wsBusy ? 'Отправка...' : 'Отправить на проверку'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Арты */}
            {workshopTab === 'arts' && (
                <div key="ws-arts" className="fade-in cab-card" style={{
                    padding: '28px 32px', borderRadius: 20,
                    display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                    <div>
                        <h3 style={{ 
                            margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                            letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            Арты и скины
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                            Сгенерируй арт для значка с помощью ИИ или загрузи свой.<br/>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>AI-генерация доступна в основном кабинете.</span>
                        </p>
                    </div>
                    {effectiveToken && <ArtInboxTab accessToken={effectiveToken} />}
                </div>
            )}

            {/* Мои проекты */}
            {workshopTab === 'my' && (() => {
                const combined = [
                    ...cabinetProposals.map((p: any) => ({ ...p, source: 'proposal' })),
                    ...customBadges.map((b: any) => ({ ...b, source: 'badge', type: 'badge', status: 'active' })),
                ];
                return (
                    <div key="ws-my" className="fade-in cab-card" style={{
                        padding: '28px 32px', borderRadius: 20,
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        <div>
                            <h3 style={{ 
                                margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                Мои проекты
                            </h3>
                            {combined.length === 0 && (
                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                    Пока нет проектов. Создай первый в Конструкторе.
                                </p>
                            )}
                        </div>
                        {combined.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {combined.map((item: any) => (
                                    <div key={item.id} style={{
                                        padding: '12px 16px', borderRadius: 12,
                                        background: 'rgba(0,0,0,0.15)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: '#e8f0ff' }}>
                                            {item.type === 'category' ? '📁' : item.type === 'version' ? '🔄' : (item.emoji || '🏅')} {item.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                            {item.type === 'category' ? 'Категория' : item.type === 'version' ? 'Версия значка' : 'Значок'}
                                            {' · '}
                                            {item.status === 'pending' ? '⏳ На проверке' : item.status === 'approved' ? '✅ Одобрено' : item.status === 'rejected' ? '❌ Отклонено' : '📋 Активно'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Сообщество */}
            {workshopTab === 'community' && (
                <CommunityRankingPanel
                    communityBadges={communityBadges}
                    customBadges={customBadges}
                    onNavigateToBadge={navigateToBadge}
                />
            )}
        </div>
    );
};
