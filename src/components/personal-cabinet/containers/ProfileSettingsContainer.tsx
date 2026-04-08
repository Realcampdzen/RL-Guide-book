import React, { useRef, useState } from 'react';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { useAuth } from '../../../context/AuthContext';
import { syncAuthProfile } from '../../../utils/authProfileApi';

const FONT = 'Inter, -apple-system, sans-serif';

interface ProfileSettingsContainerProps {
    onClose?: () => void;
}

export const ProfileSettingsContainer: React.FC<ProfileSettingsContainerProps> = ({ onClose }) => {
    const { userData, setNickname, setAvatar, setProfileStatus, setProfileBio } = useUserProgress();
    const { accessToken } = useAuth();
    
    const profile = userData?.profile || {};
    const initialNickname = (profile as any)?.nickname || 'Искатель';
    const initialAvatar = (profile as any)?.avatar || '';
    const initialStatus = (profile as any)?.status || '';
    const initialBio = (profile as any)?.bio || '';

    const [nicknameInput, setNicknameInput] = useState(initialNickname);
    const [avatarInput, setAvatarInput] = useState(initialAvatar);
    const [statusInput, setStatusInput] = useState(initialStatus);
    const [bioInput, setBioInput] = useState(initialBio);
    
    const avatarFileRef = useRef<HTMLInputElement>(null);

    const isImageAvatar = (str: string | null | undefined): boolean => {
        if (!str) return false;
        return str.startsWith('http') || str.startsWith('/') || str.startsWith('data:');
    };

    // --- Rank calculation logic ---
    const currentLevels = profile?.stats?.totalLevelsAchieved || Object.values(userData?.progress || {}).filter((p: any) => p.status === 'achieved').length;
    const rankThresholds = [0, 5, 15, 30, 50, 75, 100];
    const currentRankIdx = rankThresholds.findIndex((_, i) => (rankThresholds[i + 1] ?? Infinity) > currentLevels);
    const nextRankAt = rankThresholds[currentRankIdx + 1] ?? rankThresholds[rankThresholds.length - 1];
    const prevRankAt = rankThresholds[currentRankIdx] ?? 0;
    const xpPercent = nextRankAt > prevRankAt ? Math.min(100, ((currentLevels - prevRankAt) / (nextRankAt - prevRankAt)) * 100) : 100;
    const rankNames = ['Новичок', 'Исследователь', 'Путешественник', 'Мастер', 'Легенда', 'Хранитель', 'Архитектор'];
    const rank = rankNames[currentRankIdx] || 'Новичок';
    // ----------------------------

    const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { setAvatarInput(reader.result as string); };
        reader.readAsDataURL(file);
    };

    const saveProfile = () => {
        const nextNickname = String(nicknameInput || '').trim();
        const nextAvatar = String(avatarInput || '').trim();
        setNickname(nextNickname);
        setAvatar(nextAvatar);
        setProfileStatus(statusInput);
        setProfileBio(bioInput.trim().slice(0, 160));
        
        if (accessToken) {
            void syncAuthProfile(accessToken, { nickname: nextNickname, avatar_url: nextAvatar }).catch(() => {});
        }
        
        if (onClose) onClose();
    };

    return (
        <div className="fade-in" style={{
            maxWidth: 520, margin: '0 auto',
            background: 'rgba(8, 20, 40, 0.15)',
            borderRadius: 20, border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '32px 28px',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.25)'
        }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#e8f0ff', textAlign: 'center' }}>
                Профиль
            </h2>

            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                <div style={{
                    width: 160, height: 160, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: 16, cursor: 'pointer',
                }} onClick={() => avatarFileRef.current?.click()}>
                    {isImageAvatar(avatarInput) ? (
                        <img src={avatarInput} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: 64, opacity: 0.8 }}>{avatarInput || nicknameInput.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                <button type="button" onClick={() => avatarFileRef.current?.click()}
                    style={{ 
                        padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)', border: 'none',
                        color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: FONT,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                    Загрузить фото
                </button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ник
                    </span>
                    <input className="cab-input" value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} placeholder="Никнейм" />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Направление
                    </span>
                    <input className="cab-input" value={statusInput} onChange={e => setStatusInput(e.target.value)} maxLength={80} placeholder="Направление" />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Сейчас делаю
                    </span>
                    <textarea className="cab-input" value={bioInput} onChange={e => setBioInput(e.target.value)} maxLength={160} placeholder="Коротко. Одна мысль." style={{ minHeight: 80, resize: 'vertical' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: -2 }}>
                        {bioInput.length}/160
                    </span>
                </label>
            </div>

            {/* Rank */}
            <div style={{ margin: '24px 0 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Ранг</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{rank} · Уровень {currentLevels}</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${xpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #8B00FF, #FFD700)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{prevRankAt} ур.</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="cab-btn-glass" onClick={onClose} style={{ flex: 1, padding: '12px 20px', fontSize: 14 }}>
                    Отмена
                </button>
                <button type="button" onClick={saveProfile}
                    style={{
                        flex: 1, padding: '12px 20px', borderRadius: 12,
                        border: 'none',
                        background: 'linear-gradient(135deg, #8B00FF, #FFD700)',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: FONT,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        boxShadow: '0 4px 16px rgba(139,0,255,0.3)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139,0,255,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,0,255,0.3)'; }}
                >
                    Сохранить
                </button>
            </div>
        </div>
    );
};
