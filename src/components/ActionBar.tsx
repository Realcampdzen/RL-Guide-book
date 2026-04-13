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
  { id: 'default', label: '🎨 Классика' },
  { id: 'my-art', label: '🖼️ Мой арт' },
];

const ActionBar: React.FC<ActionBarProps> = ({
  activeVariant,
  onCreateAi,
  onSelectVariant,
  onUploadArt,
  uploadButtonLabel,
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
      <div className="badge-skin-toolbar__primary">
        <button
          type="button"
          onClick={onCreateAi}
          disabled={disabled || aiDisabled}
          className="badge-skin-btn badge-skin-btn--ai"
          title={aiTitle}
        >
          ✨ Создать с помощью ИИ
        </button>

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

        <button
          type="button"
          onClick={onUploadArt}
          disabled={disabled}
          className="badge-skin-btn badge-skin-btn--upload"
          title={uploadTitle}
        >
          {uploadButtonLabel}
        </button>
      </div>

      {pendingCount > 0 && (
        <span className="badge-skin-toolbar__meta">На согласовании: {pendingCount}</span>
      )}
    </div>
  );
};

export default ActionBar;
