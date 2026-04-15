import type React from 'react';

type SkinVariant = 'default' | 'my-art';

interface ActionBarProps {
  activeVariant: SkinVariant | null;
  onCreateAi: () => void;
  onSelectVariant: (variant: SkinVariant) => void;
  onUploadArt: () => void;
  uploadButtonLabel: string;
  pendingCount?: number;
  disabled?: boolean;
  aiDisabled?: boolean;
  aiTitle?: string;
  uploadTitle?: string;
  myArtDisabled?: boolean;
  myArtTitle?: string;
}

const variants: Array<{ id: SkinVariant; label: string }> = [
  { id: 'default', label: 'Классика' },
  { id: 'my-art', label: 'Мой арт' },
];

const ActionBar: React.FC<ActionBarProps> = ({
  activeVariant,
  onCreateAi,
  onSelectVariant,
  onUploadArt,

  pendingCount = 0,
  disabled = false,
  aiDisabled = false,
  aiTitle,
  uploadTitle,
  myArtDisabled = false,
  myArtTitle,
}) => {
  return (
    <div className="badge-skin-toolbar__controls">
      <div className="badge-skin-toolbar__head">
        <div className="badge-skin-segment" aria-label="Стиль значка">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectVariant(variant.id)}
              disabled={disabled || (variant.id === 'my-art' && myArtDisabled)}
              className={`badge-skin-btn badge-skin-btn--toggle${activeVariant === variant.id ? ' is-active' : ''}`}
              aria-pressed={activeVariant === variant.id}
              title={variant.id === 'my-art' ? myArtTitle : undefined}
            >
              {variant.label}
            </button>
          ))}
        </div>
        {pendingCount > 0 && (
          <span className="badge-skin-toolbar__meta">На согласовании: {pendingCount}</span>
        )}
      </div>

      <div className="badge-skin-toolbar__actions">
        <button
          type="button"
          onClick={onCreateAi}
          disabled={disabled || aiDisabled}
          className="badge-skin-btn badge-skin-btn--ai"
          title={aiTitle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14.6 8.5L21 9.2L15.8 13.5L17.7 19.8L12 16.2L6.3 19.8L8.2 13.5L3 9.2L9.4 8.5L12 2Z" fill="currentColor" opacity="0.9" />
            <circle cx="19" cy="4" r="2" fill="currentColor" />
            <circle cx="5" cy="4" r="1.5" fill="currentColor" opacity="0.7" />
          </svg>
          Создать ИИ-арт
        </button>

        <button
          type="button"
          onClick={onUploadArt}
          disabled={disabled}
          className="badge-skin-btn badge-skin-btn--upload"
          title={uploadTitle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16V4M12 4L8 8M12 4L16 8M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Загрузить
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
