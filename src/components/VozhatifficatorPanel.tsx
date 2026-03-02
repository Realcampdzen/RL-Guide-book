import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VozhatifficatorPanelProps {
    deviceId: string;
    accessToken?: string | null;
}

type VTabId = 'main' | '2019-2022' | '2023+' | 'lights';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#f59e0b';

const LIGHTS_CHECKLIST = [
    { id: 'l1', title: 'Знакомство с Путеводителем', desc: 'Изучить основы системы значков' },
    { id: 'l2', title: 'Первый значок', desc: 'Получить любой значок из Путеводителя' },
    { id: 'l3', title: 'Отрядный Уголок', desc: 'Заполнить данные Отрядного Уголка' },
    { id: 'l4', title: 'Движок создан', desc: 'Создать или вступить в Движок' },
    { id: 'l5', title: 'Инициатива', desc: 'Предложить инициативу в Совет' },
    { id: 'l6', title: 'Традиция', desc: 'Предложить или утвердить традицию' },
    { id: 'l7', title: 'Инспектор', desc: 'Выполнить хотя бы 1 чек-лист Инспектора' },
    { id: 'l8', title: 'БРО', desc: 'Пройти Бросвящение и получить паспорт' },
    { id: 'l9', title: '4К — все навыки', desc: 'Набрать хотя бы 10 очков по каждому навыку 4К' },
    { id: 'l10', title: 'Мастер', desc: 'Получить 3 значка одной категории' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const VozhatifficatorPanel: React.FC<VozhatifficatorPanelProps> = ({ deviceId }) => {
    const [tab, setTab] = useState<VTabId>('main');

    // Lights progress (localStorage)
    const LS_KEY = `rl-voz-lights-${deviceId}`;
    const [checked, setChecked] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]') as string[]); }
        catch { return new Set(); }
    });

    const toggle = (id: string) => {
        const next = new Set(checked);
        if (next.has(id)) next.delete(id); else next.add(id);
        setChecked(next);
        try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch { /* */ }
    };

    const lightsDone = checked.size;
    const lightsTotal = LIGHTS_CHECKLIST.length;
    const lightsPct = lightsTotal > 0 ? Math.round((lightsDone / lightsTotal) * 100) : 0;

    const tabs: Array<{ id: VTabId; label: string }> = [
        { id: 'main', label: '🔥 Обзор' },
        { id: 'lights', label: '🕯️ Путеводные Огни' },
        { id: '2019-2022', label: '📜 2019-2022' },
        { id: '2023+', label: '🚀 2023+' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>🧭 Вожатификатор</span>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.id} type="button" className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 10, background: tab === t.id ? `${ACCENT}22` : undefined, color: tab === t.id ? ACCENT : undefined }}
                        onClick={() => setTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Main tab */}
            {tab === 'main' && (
                <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Прогресс Вожатификации</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.3)' }}>
                            <div style={{ width: `${lightsPct}%`, height: '100%', borderRadius: 4, background: ACCENT, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{lightsPct}%</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{lightsDone}/{lightsTotal} Путеводных Огней зажжено</div>
                </div>
            )}

            {/* Lights tab */}
            {tab === 'lights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
                            <span>{lightsDone}/{lightsTotal}</span><span>{lightsPct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)' }}>
                            <div style={{ width: `${lightsPct}%`, height: '100%', borderRadius: 3, background: lightsPct === 100 ? '#22c55e' : ACCENT, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                    {LIGHTS_CHECKLIST.map(item => {
                        const done = checked.has(item.id);
                        return (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                borderRadius: 8, background: done ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.12)',
                                opacity: done ? 0.7 : 1,
                            }}>
                                <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => toggle(item.id)}>
                                    {done ? '✅' : '⬜'}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, textDecoration: done ? 'line-through' : 'none' }}>{item.title}</div>
                                    <div style={{ fontSize: 10, opacity: 0.6 }}>{item.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Stub tabs */}
            {(tab === '2019-2022' || tab === '2023+') && (
                <div style={{ padding: 20, borderRadius: 12, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        {tab === '2019-2022' ? 'Архив 2019-2022' : 'Программа 2023+'}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>Раздел в разработке. Будет доступен в следующих обновлениях.</div>
                    <div style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: ACCENT, fontSize: 10, display: 'inline-block' }}>
                        В разработке
                    </div>
                </div>
            )}
        </div>
    );
};

export default VozhatifficatorPanel;
