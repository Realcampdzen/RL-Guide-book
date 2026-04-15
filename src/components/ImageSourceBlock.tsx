import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { canUseExpensiveActions } from '../types/authRole';
import { compressImage, uploadImage } from '../utils/imageUploadApi';

export type ImageContextId =
  | 'gerb'
  | 'team_flag'
  | 'squad_photo'
  | 'wing_avatar'
  | 'passport_avatar'
  | 'workshop_badge'
  | 'diary_photo';

export interface ImageSourceBlockLabels {
  title?: string;
  upload?: string;
  uploadReplace?: string;
  generate?: string;
  process?: string;
  generateModalTitle?: string;
  generateModalDescription?: string;
  processModalTitle?: string;
  processModalDescription?: string;
  placeholder?: string;
  saveAs?: string;
  close?: string;
  retry?: string;
  generating?: string;
}

const DEFAULT_LABELS: Record<ImageContextId, ImageSourceBlockLabels> = {
  gerb: {
    upload: 'Загрузить своё фото',
    generate: 'Создать визуал команды',
    process: 'Обработать ИИ',
    generateModalTitle: 'Создать визуал команды',
    generateModalDescription: 'ИИ создаст уникальный герб по названию команды и стилю.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription:
      'Загрузите фото и при необходимости опишите правки. ИИ сохранит ключевые элементы и дополнит айдентикой лагеря.',
    placeholder: 'Фото',
    saveAs: 'Сохранить как герб',
    close: 'Закрыть',
    retry: 'Повторить',
    generating: 'Генерируем герб…',
  },
  team_flag: {
    upload: 'Добавить фото',
    uploadReplace: 'Изменить фото',
    placeholder: 'Фото флага',
    generate: 'Сгенерировать',
    process: 'Обработать ИИ',
    generateModalTitle: 'Сгенерировать флаг',
    generateModalDescription: 'ИИ создаст изображение флага по вашему описанию.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription: 'Загрузите фото и при необходимости опишите правки.',
  },
  squad_photo: {
    upload: 'Добавить фото',
    uploadReplace: 'Изменить фото',
    placeholder: 'Фото',
    generate: 'Сгенерировать',
    process: 'Обработать ИИ',
    generateModalTitle: 'Сгенерировать фото',
    generateModalDescription: 'ИИ создаст изображение для отрядного уголка.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription: 'Загрузите фото и при необходимости опишите правки.',
  },
  wing_avatar: {
    upload: 'Добавить фото',
    uploadReplace: 'Изменить фото',
    placeholder: 'Аватар',
    generate: 'Сгенерировать',
    process: 'Обработать ИИ',
    generateModalTitle: 'Сгенерировать аватар Крыла',
    generateModalDescription: 'ИИ создаст изображение аватара Крыла.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription: 'Загрузите фото и при необходимости опишите правки.',
  },
  passport_avatar: {
    upload: 'Фото',
    uploadReplace: 'Изменить',
    placeholder: 'Аватар',
    generate: 'Сгенерировать',
    process: 'Обработать ИИ',
    generateModalTitle: 'Сгенерировать аватар',
    generateModalDescription: 'ИИ создаст изображение аватара для паспорта.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription: 'Загрузите фото и при необходимости опишите правки.',
  },
  workshop_badge: {
    upload: 'Загрузить изображение',
    uploadReplace: 'Изменить изображение',
    placeholder: 'Изображение',
    generate: 'Сгенерировать',
    process: 'Обработать ИИ',
    generateModalTitle: 'Сгенерировать изображение значка',
    generateModalDescription: 'ИИ создаст изображение для идеи значка Кузницы Смыслов.',
    processModalTitle: 'Обработать изображение ИИ',
    processModalDescription: 'Загрузите фото и при необходимости опишите правки.',
  },
  diary_photo: {
    upload: 'Добавить фото',
    uploadReplace: 'Изменить фото',
    placeholder: 'Фото',
  },
};

export type GerbStyle = 'cyberpunk' | 'cosmos' | 'realism';

const GERB_STYLE_LABELS: Record<GerbStyle, string> = {
  cyberpunk: 'Киберпанк',
  cosmos: 'Космос',
  realism: 'Реализм',
};

export interface ImageSourceBlockProps {
  value: string | null;
  onChange: (dataUrl: string) => void;
  context: ImageContextId;
  labels?: Partial<ImageSourceBlockLabels>;
  aspect?: 'square' | '9:16' | 'free';
  onGenerate?: (options: { prompt?: string; style?: string }) => Promise<string>;
  onProcess?: (imageBase64: string, options?: { prompt?: string }) => Promise<string>;
  /** Optional context line shown in gerb modal (e.g. team name · nickname) */
  contextLine?: React.ReactNode;
  /** Class name for the wrapper (e.g. for layout) */
  className?: string;
  /** Called after saving generated image (e.g. to show toast) */
  onSaved?: () => void;
  /** Optional override for lock reason shown to traveler */
  lockReason?: string;
  /** Optional CTA when traveler sees lock */
  onUnlockRequest?: () => void;
  /** Hide the preview block when parent shows avatar separately */
  hidePreview?: boolean;
  /** 'row' = buttons in a row (default), 'column' = stacked vertically */
  buttonLayout?: 'row' | 'column' | 'bento';
}

const isImageUrl = (s: string | null | undefined): s is string =>
  !!s && (s.startsWith('data:') || s.startsWith('http') || s.startsWith('/'));

export const ImageSourceBlock: React.FC<ImageSourceBlockProps> = ({
  value,
  onChange,
  context,
  labels: labelsProp,
  aspect = 'free',
  onGenerate,
  onProcess,
  contextLine,
  className,
  onSaved,
  lockReason,
  onUnlockRequest,
  hidePreview = false,
  buttonLayout = 'row',
}) => {
  const { role, accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processFileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [generateStyle, setGenerateStyle] = useState<GerbStyle>('cosmos');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processImage, setProcessImage] = useState<string | null>(null);
  const [processPrompt, setProcessPrompt] = useState('');
  const [processError, setProcessError] = useState<string | null>(null);
  const [processLoading, setProcessLoading] = useState(false);
  const [processPreviewUrl, setProcessPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const labels = { ...DEFAULT_LABELS[context], ...labelsProp };
  const uploadLabel = uploading 
    ? 'Загрузка...' 
    : (value && isImageUrl(value) ? (labels.uploadReplace ?? labels.upload) : labels.upload);
  const showGenerate = !!onGenerate;
  const showProcess = !!onProcess;
  const expensiveActionsAllowed = canUseExpensiveActions(role);
  const aiActionsLocked = (showGenerate || showProcess) && !expensiveActionsAllowed;
  const lockText =
    lockReason ||
    'Генерация и обработка изображений доступны участникам смены после разблокировки по коду.';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
      const url = await uploadImage(compressedBlob, accessToken || null, context);
      onChange(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось загрузить изображение');
    } finally {
      setUploading(false);
    }
  };

  const openModal = () => {
    setPreviewUrl(null);
    setGenerateError(null);
    setGenerating(false);
    setGeneratePrompt('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setPreviewUrl(null);
    setGenerateError(null);
    setGenerating(false);
    setGeneratePrompt('');
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      const result = await onGenerate({
        prompt: generatePrompt.trim() || undefined,
        style: context === 'gerb' ? generateStyle : undefined,
      });
      setPreviewUrl(result);
    } catch (e) {
      setGenerateError(
        e instanceof Error
          ? e.message
          : 'Не удалось сгенерировать изображение. Проверь подключение или попробуй позже.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = () => {
    setGenerateError(null);
    handleGenerate();
  };

  const openProcessModal = () => {
    setProcessImage(null);
    setProcessPrompt('');
    setProcessError(null);
    setProcessPreviewUrl(null);
    setProcessModalOpen(true);
  };

  useEffect(() => {
    if (processModalOpen && processFileInputRef.current) processFileInputRef.current.value = '';
  }, [processModalOpen]);

  const closeProcessModal = () => {
    setProcessModalOpen(false);
    setProcessImage(null);
    setProcessPrompt('');
    setProcessError(null);
    setProcessLoading(false);
    setProcessPreviewUrl(null);
  };

  const handleProcessFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => setProcessImage(r.result as string);
      r.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleProcessSubmit = async () => {
    if (!onProcess || !processImage) return;
    setProcessError(null);
    setProcessLoading(true);
    try {
      const result = await onProcess(processImage, { prompt: processPrompt.trim() || undefined });
      setProcessPreviewUrl(result);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : 'Не удалось обработать изображение.');
    } finally {
      setProcessLoading(false);
    }
  };

  const handleSaveProcessPreview = () => {
    if (processPreviewUrl) {
      onChange(processPreviewUrl);
      closeProcessModal();
      onSaved?.();
    }
  };

  const handleProcessRetry = () => {
    setProcessError(null);
    handleProcessSubmit();
  };

  const handleSavePreview = () => {
    if (previewUrl) {
      onChange(previewUrl);
      closeModal();
      onSaved?.();
    }
  };

  const aspectStyle =
    aspect === 'square'
      ? { width: 80, height: 80, borderRadius: 10 }
      : aspect === '9:16'
        ? { width: 120, height: 213, borderRadius: 12 }
        : { width: 120, height: 80, borderRadius: 12 };

  const buttonsContainerStyle: React.CSSProperties =
    buttonLayout === 'bento'
      ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
      : {
          display: 'flex',
          flexDirection: buttonLayout === 'column' ? 'column' : 'row',
          gap: 8,
          flexWrap: buttonLayout === 'column' ? 'nowrap' : 'wrap',
        };

  return (
    <div
      className={className}
      style={
        buttonLayout === 'bento'
          ? { display: 'grid', gap: 12 }
          : {
              display: 'flex',
              flexDirection: buttonLayout === 'column' ? 'column' : 'row',
              alignItems: buttonLayout === 'column' ? 'stretch' : 'center',
              gap: 12,
              flexWrap: 'wrap',
            }
      }
    >
      {!hidePreview && (
        <div
          style={{
            ...aspectStyle,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {value && isImageUrl(value) ? (
            <img
              src={value}
              alt={labels.placeholder ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', padding: '0 4px' }}>
              {labels.placeholder ?? 'Фото'}
            </span>
          )}
        </div>
      )}
      <div style={buttonsContainerStyle}>
        {/* In bento: AI buttons on top row, upload full-width bottom. Otherwise: original order */}
        {buttonLayout === 'bento' ? (
          <>
            {showGenerate && (
              <button
                type="button"
                className="cab-btn-accent"
                onClick={openModal}
                disabled={!expensiveActionsAllowed}
                style={{
                  padding: '12px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  minWidth: 'unset',
                  width: '100%',
                  cursor: expensiveActionsAllowed ? 'pointer' : 'not-allowed',
                  opacity: expensiveActionsAllowed ? 1 : 0.55,
                }}
              >
                {labels.generate ?? 'Сгенерировать'}
              </button>
            )}
            {showProcess && (
              <button
                type="button"
                className="cab-btn-glass"
                aria-label="Обработать изображение с помощью ИИ"
                onClick={openProcessModal}
                disabled={!expensiveActionsAllowed}
                style={{
                  padding: '12px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  minWidth: 'unset',
                  width: '100%',
                  cursor: expensiveActionsAllowed ? 'pointer' : 'not-allowed',
                  opacity: expensiveActionsAllowed ? 1 : 0.55,
                }}
              >
                {labels.process ?? 'Обработать ИИ'}
              </button>
            )}
            <button
              type="button"
              className="cab-btn-glass"
              onClick={() => fileInputRef.current?.click()}
              style={{
                gridColumn: '1 / -1',
                padding: '12px 14px',
                fontSize: 13,
                fontWeight: 500,
                minWidth: 'unset',
                width: '100%',
                cursor: 'pointer',
              }}
              disabled={uploading}
            >
              {uploadLabel}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cab-btn-glass"
              style={{ padding: '8px 14px', fontSize: 13, minWidth: 'unset', fontWeight: 500 }}
              disabled={uploading}
            >
              {uploadLabel}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            {showGenerate && (
              <button
                type="button"
                onClick={openModal}
                disabled={!expensiveActionsAllowed}
                className="cab-btn-accent"
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  minWidth: 'unset',
                  fontWeight: 500,
                  opacity: expensiveActionsAllowed ? 1 : 0.55,
                }}
              >
                {labels.generate ?? 'Сгенерировать'}
              </button>
            )}
            {showProcess && (
              <button
                type="button"
                aria-label="Обработать изображение с помощью ИИ"
                onClick={openProcessModal}
                className="cab-btn-glass"
                disabled={!expensiveActionsAllowed}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  minWidth: 'unset',
                  fontWeight: 500,
                  opacity: expensiveActionsAllowed ? 1 : 0.55,
                  cursor: expensiveActionsAllowed ? 'pointer' : 'not-allowed',
                }}
              >
                {labels.process ?? 'Обработать ИИ'}
              </button>
            )}
          </>
        )}
      </div>
      {aiActionsLocked && (
        <div style={{ width: '100%', fontSize: 11, lineHeight: 1.45, opacity: 0.88 }}>
          <span>{lockText}</span>
          {onUnlockRequest && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
              onClick={onUnlockRequest}
            >
              Разблокировать по коду
            </button>
          )}
        </div>
      )}

      {modalOpen && (
        <div
          className="proof-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            className="proof-modal fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-source-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#16162a',
              borderRadius: 16,
              padding: 20,
              color: 'white',
            }}
          >
            <h3 id="image-source-modal-title" style={{ marginTop: 0, marginBottom: 8 }}>
              {labels.generateModalTitle ?? 'Сгенерировать изображение'}
            </h3>
            {labels.generateModalDescription && (
              <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>
                {labels.generateModalDescription}
              </p>
            )}
            {context === 'gerb' && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.9,
                    marginBottom: 8,
                  }}
                >
                  Стиль
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['cyberpunk', 'cosmos', 'realism'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGenerateStyle(s)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        background:
                          generateStyle === s ? 'rgba(139, 0, 255, 0.4)' : 'rgba(255,255,255,0.08)',
                        border:
                          generateStyle === s
                            ? '1px solid #8b00ff'
                            : '1px solid rgba(255,255,255,0.15)',
                        color: 'white',
                      }}
                    >
                      {GERB_STYLE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 8,
                }}
              >
                Промпт
              </div>
              <textarea
                placeholder="Опиши, что хочешь увидеть…"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  resize: 'vertical',
                  fontSize: 13,
                }}
              />
            </div>
            {contextLine && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                {contextLine}
              </div>
            )}
            {generateError ? (
              <div className="profile-error profile-error--not-found" style={{ marginBottom: 16 }}>
                {generateError}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={handleRetry}
                >
                  {labels.retry ?? 'Повторить'}
                </button>
              </div>
            ) : previewUrl ? (
              <>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 200,
                    margin: '0 auto 16px',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Превью"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSavePreview}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'linear-gradient(90deg, #8b00ff, #4dacff)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  {labels.saveAs ?? 'Сохранить'}
                </button>
              </>
            ) : generating ? (
              <p className="profile-loading" style={{ textAlign: 'center', padding: '16px' }}>
                {labels.generating ?? 'Генерируем…'}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(90deg, #8b00ff, #4dacff)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Сгенерировать
              </button>
            )}
            <button
              type="button"
              onClick={closeModal}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'white',
                marginTop: 12,
                cursor: 'pointer',
                opacity: 0.5,
                fontSize: 13,
              }}
            >
              {labels.close ?? 'Закрыть'}
            </button>
          </div>
        </div>
      )}

      {processModalOpen && (
        <div
          className="proof-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeProcessModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            className="proof-modal fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="process-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#16162a',
              borderRadius: 16,
              padding: 20,
              color: 'white',
            }}
          >
            <h3 id="process-modal-title" style={{ marginTop: 0, marginBottom: 8 }}>
              {labels.processModalTitle ?? 'Обработать изображение ИИ'}
            </h3>
            {(labels.processModalDescription ?? labels.generateModalDescription) && (
              <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>
                {labels.processModalDescription ?? labels.generateModalDescription}
              </p>
            )}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 8,
                }}
              >
                Изображение
              </div>
              <input
                ref={processFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProcessFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => processFileInputRef.current?.click()}
                className="btn-secondary"
                style={{ width: '100%', padding: '10px 14px', fontSize: 12 }}
              >
                {processImage ? 'Выбрать другое фото' : 'Загрузить фото'}
              </button>
              {processImage && isImageUrl(processImage) && (
                <div
                  style={{
                    marginTop: 12,
                    maxWidth: 120,
                    maxHeight: 120,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <img
                    src={processImage}
                    alt=""
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 8,
                }}
              >
                Промпт (необязательно)
              </div>
              <textarea
                placeholder="Опиши правки…"
                value={processPrompt}
                onChange={(e) => setProcessPrompt(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  resize: 'vertical',
                  fontSize: 13,
                }}
              />
            </div>
            {processError ? (
              <div className="profile-error profile-error--not-found" style={{ marginBottom: 16 }}>
                {processError}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={handleProcessRetry}
                >
                  {labels.retry ?? 'Повторить'}
                </button>
              </div>
            ) : processPreviewUrl ? (
              <>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 200,
                    margin: '0 auto 16px',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <img
                    src={processPreviewUrl}
                    alt="Превью"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveProcessPreview}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'linear-gradient(90deg, #8b00ff, #4dacff)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  {labels.saveAs ?? 'Сохранить'}
                </button>
              </>
            ) : processLoading ? (
              <p className="profile-loading" style={{ textAlign: 'center', padding: '16px' }}>
                Обрабатываем…
              </p>
            ) : (
              <button
                type="button"
                onClick={handleProcessSubmit}
                disabled={!processImage}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: processImage
                    ? 'linear-gradient(90deg, #8b00ff, #4dacff)'
                    : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: processImage ? 'pointer' : 'not-allowed',
                  opacity: processImage ? 1 : 0.6,
                }}
              >
                Обработать
              </button>
            )}
            <button
              type="button"
              onClick={closeProcessModal}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'white',
                marginTop: 12,
                cursor: 'pointer',
                opacity: 0.5,
                fontSize: 13,
              }}
            >
              {labels.close ?? 'Закрыть'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
