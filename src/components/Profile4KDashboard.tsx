import React, { useMemo, useState } from 'react';
import {
  type Skill4K,
  type ProgramTrack2026,
  compute4kProfile,
  normalize4kProfile,
  getSkillLabel,
  getSkillEmoji,
  ALL_SKILLS,
  computeProgram2026Profile,
  normalizeProgram2026Profile,
  getProgramTrackLabel,
  getProgramTrackEmoji,
  ALL_PROGRAM_TRACKS,
  getProgram2026CategoryIds
} from '../utils/profile4k';
import type { IUserData } from '../types/userProgress';
import type { Badge } from '../types/guide';
import { fetchPedagogy4k } from '../utils/aiService';

const PROFILE4K_ACCENT = '#14b8a6';
const PROFILE4K_ACCENT_LIGHT = 'rgba(20, 184, 166, 0.2)';
const PROFILE4K_GRADIENT = 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(13, 148, 136, 0.12) 100%)';

export type Profile4KTabId = 'skills' | 'camp-progress';

interface Profile4KDashboardProps {
  userData: IUserData | null;
  /** Значки для маппинга categoryId (опционально, если badgeId имеет нестандартный формат) */
  badges?: Badge[];
  badgeTitlesInPath?: string[];
  favoriteBadgeTitles?: string[];
  rank?: string;
  nickname?: string;
  variant?: 'accordion' | 'cabin';
  activeTab?: Profile4KTabId;
  onTabChange?: (tab: Profile4KTabId) => void;
}

export const Profile4KDashboard: React.FC<Profile4KDashboardProps> = ({
  userData,
  badgeTitlesInPath = [],
  favoriteBadgeTitles = [],
  rank,
  nickname,
  variant = 'accordion',
  activeTab = 'skills',
  onTabChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [characteristic, setCharacteristic] = useState<string | null>(null);
  const [characteristicLoading, setCharacteristicLoading] = useState(false);

  const { raw, normalized, program2026Raw, program2026Normalized } = useMemo(() => {
    const progress = userData?.progress || {};
    const favorites = userData?.favorites || [];
    const raw = compute4kProfile({ progress, favorites });
    const normalized = normalize4kProfile(raw);
    const program2026Raw = computeProgram2026Profile({ progress, favorites });
    const program2026Normalized = normalizeProgram2026Profile(program2026Raw);
    return { raw, normalized, program2026Raw, program2026Normalized };
  }, [userData?.progress, userData?.favorites]);

  const hasAny = Object.values(raw).some(v => v > 0);
  const hasAnyProgram2026 = Object.values(program2026Raw).some(v => v > 0);

  React.useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  const renderSkillsSection = () => (
    <div className={variant === 'cabin' ? 'profile4k-cabin-section' : undefined} style={variant === 'accordion' ? {} : { display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
        По твоим значкам в пути и достижениям
      </p>
      {characteristic && (
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px', fontStyle: 'italic', color: PROFILE4K_ACCENT }}>
          {characteristic}
        </div>
      )}
      <div style={{ fontSize: '12px', fontWeight: 700, color: PROFILE4K_ACCENT, marginBottom: '8px' }}>
        Твой профиль 4К
      </div>
      {(ALL_SKILLS as Skill4K[]).map((skill) => (
        <div key={skill} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              {getSkillEmoji(skill)} {getSkillLabel(skill)}
            </span>
            <span style={{ fontSize: '12px', opacity: 0.8, minWidth: '28px', textAlign: 'right' }}>
              {raw[skill]}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${normalized[skill]}%`,
                height: '100%',
                background: PROFILE4K_ACCENT,
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={async () => {
          if (characteristicLoading) return;
          setCharacteristicLoading(true);
          setCharacteristic(null);
          try {
            const line = await fetchPedagogy4k({
              badgeTitlesInPath,
              favoriteBadgeTitles,
              rank,
              nickname
            });
            setCharacteristic(line || 'Не удалось получить характеристику.');
          } catch {
            setCharacteristic('Не удалось получить характеристику.');
          } finally {
            setCharacteristicLoading(false);
          }
        }}
        disabled={characteristicLoading}
        style={{
          padding: '10px 16px',
          background: PROFILE4K_ACCENT_LIGHT,
          border: `1px solid ${PROFILE4K_ACCENT}`,
          color: PROFILE4K_ACCENT,
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: characteristicLoading ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
          marginTop: '4px'
        }}
      >
        {characteristicLoading ? 'Генерируем…' : 'Получить характеристику'}
      </button>
    </div>
  );

  const renderCampProgressSection = () => (
    <div className={variant === 'cabin' ? 'profile4k-cabin-section' : undefined} style={variant === 'accordion' ? { marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: PROFILE4K_ACCENT, marginBottom: '8px' }}>
        Программа Реального Лагеря 2026
      </div>
      <p style={{ fontSize: '11px', opacity: 0.65, marginBottom: '12px' }}>
        {hasAnyProgram2026 ? 'Распределение достижений по направлениям' : `Выбери значки из категорий ${getProgram2026CategoryIds()}`}
      </p>
      {(ALL_PROGRAM_TRACKS as ProgramTrack2026[]).map((track) => (
        <div key={track} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              {getProgramTrackEmoji(track)} {getProgramTrackLabel(track)}
            </span>
            <span style={{ fontSize: '12px', opacity: 0.8, minWidth: '28px', textAlign: 'right' }}>
              {program2026Raw[track]}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${program2026Normalized[track]}%`,
                height: '100%',
                background: PROFILE4K_ACCENT,
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const summary = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: variant === 'accordion' && isExpanded ? '20px' : '0' }}>
      <div onClick={variant === 'accordion' ? () => setIsExpanded(!isExpanded) : undefined} style={{ cursor: variant === 'accordion' ? 'pointer' : 'default', flex: 1 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: PROFILE4K_ACCENT,
            letterSpacing: '0.1em',
            marginBottom: '4px'
          }}
        >
          Аналитика
        </div>
        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🧩 Твой профиль 4К
        </h3>
        {(variant === 'cabin' || !isExpanded) && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', opacity: 0.75, lineHeight: 1.4 }}>
            {hasAny ? 'Распределение по навыкам по твоим значкам' : 'Пока нет данных — выбери значки в путь'}
          </p>
        )}
      </div>

      {variant === 'accordion' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: PROFILE4K_ACCENT,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.3s ease'
          }}
        >
          ▾
        </button>
      )}
    </div>
  );

  if (variant === 'accordion') {
    return (
      <div
        className="profile4k-dashboard"
        style={{
          background: PROFILE4K_GRADIENT,
          borderRadius: '24px',
          padding: '20px',
          border: `1px solid ${PROFILE4K_ACCENT_LIGHT}`,
          marginBottom: '24px',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            background: PROFILE4K_ACCENT,
            filter: 'blur(50px)',
            opacity: hasAny ? 0.15 : 0.08,
            pointerEvents: 'none'
          }}
        />
        {summary}
        {isExpanded && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderSkillsSection()}
            {renderCampProgressSection()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in profile4k-cabin-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {summary}
      {activeTab === 'skills' ? renderSkillsSection() : renderCampProgressSection()}
    </div>
  );
};
