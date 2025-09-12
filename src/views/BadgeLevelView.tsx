import React, { useMemo } from 'react';
import { fixCriteriaFormatting, extractEvidenceSection, shouldApplyFormatting, fixDescriptionFormatting } from '../utils/textFormatting';

type Category = {
  id: string;
  title: string;
};

type Badge = {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  criteria?: string;
  confirmation?: string;
  category_id: string;
  level?: string;
};

interface BadgeLevelViewProps {
  category: Category;
  badge: Badge;
  level: string;
  badges: Badge[];
  onBack: () => void;
  onChangeLevel: (level: string, levelId: string) => void;
}

const BadgeLevelView: React.FC<BadgeLevelViewProps> = ({ category, badge, level, badges, onBack, onChangeLevel }) => {
  const { levelBadge, allLevels } = useMemo(() => {
    const idSegments = (badge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    const levels = badges
      .filter((b) => {
        if (b.category_id !== badge.category_id) return false;
        if (isMultiLevel) {
          const seg = (b.id || '').split('.');
          return seg.length === 3 && seg[0] === idSegments[0] && seg[1] === idSegments[1];
        }
        return (b.id || '') === (badge.id || '');
      })
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const current = levels.find((b) => (b.level || '').toString() === (level || '').toString()) || badge;
    return { levelBadge: current, allLevels: levels };
  }, [badge, badges, level]);

  const { criteriaList, evidenceText } = useMemo(() => {
    let evidenceText: string | null = null;
    let baseCriteria: string[] = [];
    const source = levelBadge || badge;
    if (source && (source.criteria || source.confirmation)) {
      let raw = source.criteria || '';
      const should = shouldApplyFormatting(source.id);
      const processed = should ? fixCriteriaFormatting(raw) : raw;
      if (source.confirmation) {
        const { mainText, evidenceText: extracted } = extractEvidenceSection(processed);
        evidenceText = extracted || source.confirmation;
        raw = mainText;
      }
      baseCriteria = (raw || '')
        .split(/[\u0007\n•\-]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return { criteriaList: baseCriteria, evidenceText };
  }, [levelBadge, badge]);

  const description = useMemo(() => fixDescriptionFormatting(levelBadge?.description || badge.description || ''), [levelBadge?.description, badge.description]);

  return (
    <div className="badge-level-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад к значку</button>
        <div className="header-content">
          <h1 className="app-title">{levelBadge?.title || badge.title}</h1>
          <p className="badge-category">{category?.title}</p>
        </div>
      </div>

      <div className="badge-content">
        <div className="badge-info">
          {description && (
            <div className="badge-description pre-wrap">{description}</div>
          )}

          {criteriaList.length > 0 && (
            <div className="badge-criteria">
              <h3 className="level-title">Критерии</h3>
              <ul>
                {criteriaList.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {evidenceText && (
            <div className="badge-evidence">
              <h3 className="level-title">Подтверждение</h3>
              <div className="pre-wrap">{evidenceText}</div>
            </div>
          )}

          {allLevels.length > 1 && (
            <div className="badge-levels">
              <h3 className="level-title">Уровни</h3>
              <div className="levels-list">
                {allLevels.map((lvl) => (
                  <button
                    key={lvl.id}
                    className={`level-button ${(lvl.level || '').toString() === (level || '').toString() ? 'active' : ''}`}
                    onClick={() => onChangeLevel(lvl.level || '', lvl.id)}
                    title={lvl.title}
                  >
                    {lvl.level || ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeLevelView;
