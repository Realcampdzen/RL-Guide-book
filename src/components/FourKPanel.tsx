import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchStats, type FourKStats } from '../utils/fourKApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FourKPanelProps {
    deviceId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILLS = [
    { key: 'critical_thinking' as const, label: 'Критическое мышление', color: '#ef4444', icon: '🔴' },
    { key: 'creativity' as const, label: 'Креативность', color: '#eab308', icon: '🟡' },
    { key: 'communication' as const, label: 'Коммуникация', color: '#3b82f6', icon: '🔵' },
    { key: 'cooperation' as const, label: 'Кооперация', color: '#22c55e', icon: '🟢' },
];

const PROGRAMS = [
    { label: '4К навыки', color: '#a855f7', icon: '🧠' },
    { label: 'Нейросети для обучения', color: '#3b82f6', icon: '🤖' },
    { label: 'Вожатское мастерство', color: '#f59e0b', icon: '⭐' },
    { label: 'Соуправление', color: '#22c55e', icon: '🏛️' },
];

const CX = 100;
const CY = 100;
const R = 75;

// ---------------------------------------------------------------------------
// Radar Chart (SVG)
// ---------------------------------------------------------------------------

function radarPoints(values: number[], max: number): string {
    const n = values.length;
    return values.map((v, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (v / max) * R;
        return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
    }).join(' ');
}

function RadarChart({ stats }: { stats: FourKStats }) {
    const values = SKILLS.map(s => stats[s.key]);
    const maxVal = 100;

    return (
        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 240, margin: '0 auto', display: 'block' }}>
            {/* Grid circles */}
            {[25, 50, 75, 100].map(pct => (
                <circle key={pct} cx={CX} cy={CY} r={(pct / maxVal) * R}
                    fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            ))}

            {/* Axis lines */}
            {SKILLS.map((s, i) => {
                const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
                const x2 = CX + R * Math.cos(angle);
                const y2 = CY + R * Math.sin(angle);
                return <line key={s.key} x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />;
            })}

            {/* Data polygon */}
            <polygon points={radarPoints(values, maxVal)}
                fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth={1.5} />

            {/* Data points + labels */}
            {SKILLS.map((s, i) => {
                const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
                const v = values[i];
                const px = CX + (v / maxVal) * R * Math.cos(angle);
                const py = CY + (v / maxVal) * R * Math.sin(angle);
                const lx = CX + (R + 18) * Math.cos(angle);
                const ly = CY + (R + 18) * Math.sin(angle);
                return (
                    <g key={s.key}>
                        <circle cx={px} cy={py} r={3} fill={s.color} />
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                            fill={s.color} fontSize={7} fontWeight={700}>
                            {s.icon} {v}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FourKPanel: React.FC<FourKPanelProps> = ({ deviceId }) => {
    const [stats, setStats] = useState<FourKStats | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setStats(await fetchStats(deviceId)); }
        catch { setStats(null); }
        finally { setLoading(false); }
    }, [deviceId]);

    useEffect(() => { void load(); }, [load]);

    // Program progress (mock based on 4K aggregate + stub values)
    const programValues = useMemo(() => {
        if (!stats) return [0, 0, 0, 0];
        const fourKAggregate = Math.round((stats.critical_thinking + stats.creativity + stats.communication + stats.cooperation) / 4);
        return [fourKAggregate, Math.min(100, fourKAggregate * 0.7), Math.min(100, fourKAggregate * 0.5), Math.min(100, fourKAggregate * 0.6)];
    }, [stats]);

    if (loading && !stats) return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка навыков…</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#a855f7' }}>🧠 4К — Навыки и рост</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
            </div>

            {stats ? (
                <>
                    {/* Radar chart */}
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
                        <RadarChart stats={stats} />
                    </div>

                    {/* Skill details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {SKILLS.map(s => (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, width: 20 }}>{s.icon}</span>
                                <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                                <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                                    <div style={{ width: `${stats[s.key]}%`, height: '100%', borderRadius: 3, background: s.color, transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, width: 28, textAlign: 'right' }}>{stats[s.key]}</span>
                            </div>
                        ))}
                    </div>

                    {/* Badge contributions */}
                    {stats.badgeContributions && stats.badgeContributions.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>Какие значки дали очки:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {stats.badgeContributions.slice(0, 12).map((c, i) => {
                                    const sk = SKILLS.find(s => s.key === c.skill);
                                    return (
                                        <span key={`${c.badgeId}-${i}`} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${sk?.color ?? '#6b7280'}22`, color: sk?.color ?? '#6b7280' }}>
                                            {c.badgeTitle} +{c.points}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Program progress bars */}
                    <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 6 }}>Программы РЛ:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {PROGRAMS.map((prog, i) => (
                                <div key={prog.label}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                        <span style={{ fontSize: 12 }}>{prog.icon}</span>
                                        <span style={{ flex: 1, fontSize: 11 }}>{prog.label}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: prog.color }}>{Math.round(programValues[i])}%</span>
                                    </div>
                                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                                        <div style={{ width: `${programValues[i]}%`, height: '100%', borderRadius: 3, background: prog.color, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Нет данных о навыках. Начните получать значки!</div>
            )}
        </div>
    );
};

export default FourKPanel;
