import React, { useEffect, useMemo, Suspense } from 'react';
import {
  fixDescriptionFormatting,
  fixCriteriaFormatting,
  extractEvidenceSection,
  shouldApplyFormatting
} from '../utils/textFormatting';
import { useCustomCursor } from '../hooks/useCustomCursor';
import { useScrollReveal } from '../hooks/useScrollReveal';
import BadgeIcon from '../components/BadgeIcon';
import { getBadgeImagePath } from '../utils/badgeImages';
import '../styles/badge-view.css';
import type { Category, Badge } from '../types/guide';

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface BadgeViewProps {
  category: Category;
  badge: Badge;
  badges: Badge[];
  onBack: () => void;
  onLevelSelect: (level: string) => void;
  onBadgeClick: (badge: Badge) => void;
  // Chat props
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
}

const BadgeView: React.FC<BadgeViewProps> = ({ 
  category, 
  badge, 
  badges, 
  onBack, 
  onLevelSelect,
  onBadgeClick,
  onChatToggle,
  isChatOpen,
  onChatClose,
}) => {
  const { cursorDotRef, cursorOutlineRef, cursorReactorRef } = useCustomCursor();
  const { initReveal } = useScrollReveal();

  useEffect(() => {
    initReveal('.reveal-on-scroll');
    window.scrollTo(0, 0);
  }, [initReveal]);

  // Context Logic (ported from App.tsx)
  const { badgeLevels, baseLevelBadge, otherLevels, isMultiLevel } = useMemo(() => {
    const idSegments = (badge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    
    // Helper for same base segments
    const sameBaseTwoSegments = (a: string, b: string): boolean => {
      const as = String(a ?? '').split('.');
      const bs = String(b ?? '').split('.');
      return as.length >= 2 && bs.length >= 2 && as[0] === bs[0] && as[1] === bs[1];
    };

    const badgeLevels = badges.filter((b) => {
      if (b.category_id !== badge.category_id) return false;
      if (isMultiLevel) {
        return sameBaseTwoSegments(b.id, badge.id);
      }
      return (b.id || '') === (badge.id || '');
    });

    const baseLevelBadge = isMultiLevel
      ? (badgeLevels.find((b) => (b.level || '').toLowerCase().includes('базовый')) || 
         badgeLevels.find(b => (b.level || '').toLowerCase().includes('одноуровнев')) || 
         badgeLevels[0])
      : badge;

    const otherLevels = badgeLevels.filter((b) => {
      const isBase = baseLevelBadge && b.id === baseLevelBadge.id;
      const isSingle = (b.level || '').toLowerCase().includes('одноуровнев');
      return !isBase && !isSingle;
    });

    return { badgeLevels, baseLevelBadge, otherLevels, isMultiLevel };
  }, [badge, badges]);

  // Content Logic
  const { baseCriteria, evidenceText, mainDescription } = useMemo(() => {
    let evidenceText: string | null = null;
    let baseCriteria: string[] = [];
    
    const sourceBadge = baseLevelBadge || badge;
    
    let descriptionText = sourceBadge.description || '';
    // Fix: Remove duplicate text if present
    descriptionText = descriptionText.replace(/Объяснение ценности значка:\s*$/, '').trim();

    if (sourceBadge) {
      if (sourceBadge.confirmation) {
        evidenceText = sourceBadge.confirmation;
      }
      
      if (sourceBadge.criteria) {
        const raw = sourceBadge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
        const shouldFormat = shouldApplyFormatting(sourceBadge.id);
        const processedRaw = shouldFormat ? fixCriteriaFormatting(raw) : raw;
        
        if (sourceBadge.confirmation) {
          const { mainText, evidenceText: extracted } = extractEvidenceSection(processedRaw);
          evidenceText = extracted || sourceBadge.confirmation;
          baseCriteria = mainText.split('✅').filter(c => c.trim()).map(c => c.trim());
        } else {
          const { mainText, evidenceText: extracted } = extractEvidenceSection(processedRaw);
          evidenceText = extracted;
          baseCriteria = mainText.split('✅').filter(c => c.trim()).map(c => c.trim());
        }
      }
    }

    const shouldFormatDesc = shouldApplyFormatting(sourceBadge.id);
    const processedDesc = shouldFormatDesc ? fixDescriptionFormatting(descriptionText) : descriptionText;
    const { mainText: descMain, evidenceText: descEvidence } = extractEvidenceSection(processedDesc);
    
    // If evidence wasn't found in criteria, maybe it's in description
    if (!evidenceText && descEvidence) {
      evidenceText = descEvidence;
    }

    return { baseCriteria, evidenceText, mainDescription: descMain };
  }, [baseLevelBadge, badge]);

  // Helper for rendering emoji/icon
  const renderIcon = (b: Badge, size: 'large' | 'xlarge', className: string) => {
    const baseBadgeId = String(b.id).split('.').slice(0, 2).join('.');
    const isImageBadge = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16'].includes(baseBadgeId);
    
    if (isImageBadge) {
      // Используем ту же логику, что и в BadgeLevelView.tsx
      // Для каждого уровня передаем его собственный id и title
      return (
        <BadgeIcon
          badgeId={baseBadgeId}
          badgeTitle={badge.title}
          categoryId={badge.category_id || category.id}
          emoji={b.emoji || ''}
          levelId={String(b.id)}
          levelTitle={b.title}
          className={className}
          size={size}
        />
      );
    }
    return <div className={className} style={{fontSize: size === 'large' ? '4rem' : '3rem'}}>{b.emoji || '🏆'}</div>;
  };

  const badgeHeroImageUrl = useMemo(() => {
    const sourceBadge = baseLevelBadge || badge;
    const baseBadgeId = String(sourceBadge?.id || badge.id || '').split('.').slice(0, 2).join('.');
    if (!baseBadgeId) return null;
    const sourceTitle = sourceBadge?.title || badge.title;
    if (!sourceTitle) return null;
    return getBadgeImagePath(baseBadgeId, sourceTitle, category.id, undefined, undefined, 'realism');
  }, [baseLevelBadge, badge, category.id]);

  return (
    <div className="badge-view-container">
      <div className="noise-overlay"></div>
      <div className="cursor-reactor" ref={cursorReactorRef} data-cursor-reactor></div>
      <div className="cursor-dot" ref={cursorDotRef} data-cursor></div>
      <div className="cursor-outline" ref={cursorOutlineRef} data-cursor-outline></div>

      <div className="sticky-back-nav">
        <button onClick={onBack} className="nav-link-back hover-target">← Назад к категории</button>
      </div>

      <main className="badge-main">
        {/* Header */}
        <section className="badge-hero reveal-on-scroll">
          <div className="badge-hero-icon">
            {renderIcon(badge, 'large', 'hero-emoji')}
          </div>
          <div className="badge-hero-content">
            <h1>{badge.title}</h1>
            <div className="badge-hero-category">{category.title}</div>
          </div>
        </section>

        {badgeHeroImageUrl && (
          <section className="badge-hero-media reveal-on-scroll">
            <div className="badge-hero-media__frame">
              <img
                src={badgeHeroImageUrl}
                alt={baseLevelBadge?.title || badge.title}
                className="badge-hero-media__image"
                loading="lazy"
              />
            </div>
          </section>
        )}

        {/* Content Grid */}
        <div className="badge-content-grid">
          {/* Left Column */}
          <div className="badge-left-col reveal-on-scroll">
            <div className="content-block">
              <h3>Общая информация</h3>
              <p className="content-text" dangerouslySetInnerHTML={{ __html: mainDescription.replace(/\n/g, '<br/>') }} />

              {baseLevelBadge?.nameExplanation && (
                <>
                  <h4>Объяснение названия и ценности</h4>
                  <p className="content-text">{baseLevelBadge.nameExplanation}</p>
                </>
              )}

              {baseLevelBadge?.skillTips && (
                <>
                  <h4>Как прокачать навык</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: baseLevelBadge.skillTips.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {baseLevelBadge?.examples && (
                <>
                  <h4>Примеры</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: baseLevelBadge.examples.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {baseLevelBadge?.importance && (
                <>
                  <h4>Почему этот значок важен</h4>
                  <p className="content-text">{baseLevelBadge.importance}</p>
                </>
              )}

              {baseLevelBadge?.philosophy && (
                <>
                  <h4>Философия значка</h4>
                  <p className="content-text">{baseLevelBadge.philosophy}</p>
                </>
              )}

              {baseLevelBadge?.howToBecome && (
                <>
                  <h4>Как стать</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: baseLevelBadge.howToBecome.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              <div className="badge-meta">
                <div className="meta-item">
                  <span className="meta-label">Категория</span>
                  <span className="meta-value">{category.title}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Уровней</span>
                  <span className="meta-value">{badgeLevels.length}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ID</span>
                  <span className="meta-value">{badge.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="badge-right-col reveal-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="content-block">
              <h3>{isMultiLevel ? 'Как получить базовый уровень' : 'Как получить значок'}</h3>
              
              {baseCriteria.length > 0 ? (
                <ul className="criteria-list">
                  {baseCriteria.map((criterion, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: criterion.replace(/\n/g, '<br>') }} />
                  ))}
                </ul>
              ) : (
                <p className="content-text">Критерии пока не определены.</p>
              )}

              {evidenceText && (
                <>
                  <h4>Чем подтверждается</h4>
                  <p className="content-text" style={{ color: 'var(--c-volt)', fontStyle: 'italic' }}>
                    {evidenceText}
                  </p>
                </>
              )}
            </div>

            {/* Other Levels */}
            {otherLevels.length > 0 && (
              <div className="levels-dock">
                {otherLevels.map(level => (
                  <div 
                    key={level.id} 
                    className="level-bubble hover-target"
                    onClick={() => onLevelSelect(String(level.level))}
                  >
                    <div className="level-bubble-icon">
                      {renderIcon(level, 'xlarge', '')}
                    </div>
                    <div className="level-bubble-title">{level.title}</div>
                    <div className="level-bubble-subtitle">{String(level.level)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ChatBot and ChatAvatar */}
      <Suspense fallback={null}>
        <ChatAvatar onClick={onChatToggle} isOpen={isChatOpen} />
        <ChatBot 
          isOpen={isChatOpen} 
          onClose={onChatClose} 
          currentView="badge"
          currentCategory={category}
          currentBadge={badge}
        />
      </Suspense>
    </div>
  );
};

export default BadgeView;
