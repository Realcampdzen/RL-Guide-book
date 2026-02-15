import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';
import ActionBar from './ActionBar';
import StatusChips, { type StatusChipItem } from './StatusChips';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import {
  getAiSkinId,
  getApprovedArtSkinId,
  isDataOrUrl,
  MAX_BADGE_AI_SKINS,
  MAX_BADGE_APPROVED_ARTS,
  parseAiSkinSlotIndex,
  parseApprovedArtSkinSlotIndex,
} from '../utils/badgeSkins';

interface BadgeSkinPanelProps {
  badgeTitle: string;
  badgeBaseId: string;
  categoryId: string;
  categoryTitle: string;
  inProgressCount: number;
  inProgressMax: number;
  inProgressHint: string;
  disabled?: boolean;
  disabledHint?: string;
}

type DeleteTarget = { kind: 'ai' | 'approved'; slotIndex: number } | null;
type ActiveStatus = 'ai' | 'approved' | 'progress' | null;

const BadgeSkinPanel: React.FC<BadgeSkinPanelProps> = ({
  badgeTitle,
  badgeBaseId,
  categoryId,
  categoryTitle,
  inProgressCount,
  inProgressMax,
  inProgressHint,
  disabled = false,
  disabledHint
}) => {
  const { accessToken, role } = useAuth();
  const {
    userData,
    updateBadgeSkin,
    addGeneratedBadgeSkin,
    removeGeneratedBadgeSkin,
    submitBadgeArtProposal,
    removeApprovedBadgeSkin
  } = useUserProgress();
  const customArtInputRef = useRef<HTMLInputElement>(null);

  const [aiSkinModalOpen, setAiSkinModalOpen] = useState(false);
  const [aiSkinPrompt, setAiSkinPrompt] = useState('');
  const [aiSkinPreviewUrl, setAiSkinPreviewUrl] = useState<string | null>(null);
  const [aiSkinError, setAiSkinError] = useState<string | null>(null);
  const [aiSkinBusy, setAiSkinBusy] = useState(false);

  const [artProposalModalOpen, setArtProposalModalOpen] = useState(false);
  const [artProposalDraftUrl, setArtProposalDraftUrl] = useState<string | null>(null);
  const [artProposalBusy, setArtProposalBusy] = useState(false);
  const [artProposalError, setArtProposalError] = useState<string | null>(null);
  const [artProposalSuccess, setArtProposalSuccess] = useState<string | null>(null);

  const [panelError, setPanelError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget>(null);
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>(null);

  const currentSkin = useMemo(() => {
    return userData.selectedSkins?.[badgeBaseId] || 'auto';
  }, [userData.selectedSkins, badgeBaseId]);

  const generatedSkins = useMemo(() => {
    return userData.generatedBadgeSkins?.[badgeBaseId] || [];
  }, [userData.generatedBadgeSkins, badgeBaseId]);

  const approvedSkins = useMemo(() => {
    return userData.approvedBadgeSkins?.[badgeBaseId] || [];
  }, [userData.approvedBadgeSkins, badgeBaseId]);

  const pendingArtProposalsCount = useMemo(() => {
    return (userData.badgeArtProposals || []).filter((proposal) => (
      proposal.badgeBaseId === badgeBaseId && proposal.status === 'pending'
    )).length;
  }, [userData.badgeArtProposals, badgeBaseId]);

  const isAiSkinLimitReached = generatedSkins.length >= MAX_BADGE_AI_SKINS;
  const isApprovedLimitReached = approvedSkins.length >= MAX_BADGE_APPROVED_ARTS;
  const hasApprovedArt = approvedSkins.length > 0;
  const uploadButtonLabel = hasApprovedArt ? '📤 Предложить другой арт' : '📤 Предложить свой арт';
  const isModeratorRole = role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer';
  const aiSlotIndex = parseAiSkinSlotIndex(currentSkin);
  const approvedSlotIndex = parseApprovedArtSkinSlotIndex(currentSkin);
  const isMyArtSelected = aiSlotIndex !== null || approvedSlotIndex !== null || currentSkin === 'custom' || isDataOrUrl(currentSkin);
  const hasMyArt = generatedSkins.length > 0 || approvedSkins.length > 0;

  const handleSkinChange = (skin: string) => {
    if (disabled) return;
    updateBadgeSkin(badgeBaseId, skin);
  };

  const handleSelectMyArt = () => {
    if (disabled) return;
    if (isMyArtSelected) return;
    if (generatedSkins.length > 0) {
      handleSkinChange(getAiSkinId(0));
      return;
    }
    if (approvedSkins.length > 0) {
      handleSkinChange(getApprovedArtSkinId(0));
      return;
    }
    setPanelError('Сначала создай арт через ИИ или отправь свой арт.');
  };

  const openAiSkinModal = () => {
    if (disabled) return;
    setAiSkinError(null);
    setAiSkinPrompt('');
    setAiSkinPreviewUrl(null);
    setAiSkinBusy(false);
    setAiSkinModalOpen(true);
  };

  const closeAiSkinModal = () => {
    setAiSkinModalOpen(false);
    setAiSkinError(null);
    setAiSkinPrompt('');
    setAiSkinPreviewUrl(null);
    setAiSkinBusy(false);
  };

  const handleGenerateAiSkin = async () => {
    if (disabled || aiSkinBusy) return;
    if (isAiSkinLimitReached) {
      setAiSkinError(`Можно хранить не больше ${MAX_BADGE_AI_SKINS} ИИ-артов для одного значка.`);
      return;
    }
    setAiSkinBusy(true);
    setAiSkinError(null);
    try {
      const basePrompt =
        `Create an original badge skin image for the Real Camp badge "${badgeTitle}" ` +
        `(base id: ${badgeBaseId}, category: ${categoryTitle}). ` +
        'Keep the emblem clean, readable, high-contrast, and suitable for mobile UI.';
      const extra = aiSkinPrompt.trim();
      const prompt = extra ? `${basePrompt} Additional instructions: ${extra}` : basePrompt;
      const image = await requestImageGenerate(
        { mode: 'generate', context: 'badge_skins', prompt },
        accessToken ?? null
      );
      setAiSkinPreviewUrl(image);
    } catch (e) {
      setAiSkinError(e instanceof Error ? e.message : 'Не удалось сгенерировать арт. Попробуй позже.');
    } finally {
      setAiSkinBusy(false);
    }
  };

  const handleSaveAiSkin = () => {
    if (disabled || !aiSkinPreviewUrl) return;
    const saved = addGeneratedBadgeSkin(badgeBaseId, aiSkinPreviewUrl);
    if (!saved.ok) {
      setAiSkinError(
        saved.reason === 'limit'
          ? `Можно хранить не больше ${MAX_BADGE_AI_SKINS} ИИ-артов для одного значка.`
          : 'Не удалось сохранить арт. Попробуй ещё раз.'
      );
      return;
    }
    closeAiSkinModal();
  };

  const handleRemoveAiSkin = (slotIndex: number) => {
    if (disabled) return;
    const removed = removeGeneratedBadgeSkin(badgeBaseId, slotIndex);
    if (!removed) {
      setPanelError('Не удалось удалить ИИ-арт. Попробуй ещё раз.');
      return;
    }
    setPendingDelete(null);
    if (panelError) setPanelError(null);
  };

  const handleRemoveApprovedSkin = (slotIndex: number) => {
    if (disabled) return;
    const removed = removeApprovedBadgeSkin(badgeBaseId, slotIndex);
    if (!removed) {
      setPanelError('Не удалось удалить одобренный арт. Попробуй ещё раз.');
      return;
    }
    setPendingDelete(null);
    if (panelError) setPanelError(null);
  };

  const handleArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) return;
      setArtProposalDraftUrl(dataUrl);
      setArtProposalError(null);
      setArtProposalSuccess(null);
      setArtProposalBusy(false);
      setArtProposalModalOpen(true);
      setPanelError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const closeArtProposalModal = () => {
    setArtProposalModalOpen(false);
    setArtProposalError(null);
    setArtProposalBusy(false);
    setArtProposalSuccess(null);
  };

  const handleSubmitArtProposal = () => {
    if (disabled || artProposalBusy || !artProposalDraftUrl) return;
    setArtProposalBusy(true);
    setArtProposalError(null);
    const result = submitBadgeArtProposal({
      badgeBaseId,
      badgeTitle,
      categoryId,
      categoryTitle,
      imageUrl: artProposalDraftUrl
    });
    if (!result.ok) {
      setArtProposalBusy(false);
      setArtProposalError(
        result.reason === 'duplicate'
          ? 'Этот вариант уже отправлен и ждёт согласования.'
          : 'Не удалось отправить версию на согласование.'
      );
      return;
    }
    setArtProposalBusy(false);
    setArtProposalSuccess('Версия отправлена на согласование.');
  };

  const openDeleteConfirm = (kind: 'ai' | 'approved', slotIndex: number) => {
    if (disabled) return;
    setPendingDelete({ kind, slotIndex });
  };

  const closeDeleteConfirm = () => {
    setPendingDelete(null);
  };

  const handleStatusToggle = (status: Exclude<ActiveStatus, null>) => {
    setActiveStatus((prev) => (prev === status ? null : status));
  };

  const statusItems: StatusChipItem[] = [
    {
      id: 'ai',
      title: 'ИИ-арты',
      count: generatedSkins.length,
      max: MAX_BADGE_AI_SKINS,
      hint: generatedSkins.length > 0 ? 'Открыть список вариантов' : 'Пока нет сохранённых артов',
      active: activeStatus === 'ai',
      onClick: () => handleStatusToggle('ai'),
    },
    {
      id: 'approved',
      title: 'Одобренные арты',
      count: approvedSkins.length,
      max: MAX_BADGE_APPROVED_ARTS,
      hint: approvedSkins.length > 0 ? 'Открыть список артов' : 'Пока нет одобренных версий',
      active: activeStatus === 'approved',
      onClick: () => handleStatusToggle('approved'),
    },
    {
      id: 'progress',
      title: 'В коллекции',
      count: inProgressCount,
      max: inProgressMax,
      hint: inProgressHint,
      active: activeStatus === 'progress',
      onClick: () => handleStatusToggle('progress'),
    },
  ];

  return (
    <div className="badge-skin-panel">
      <input
        ref={customArtInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleArtUpload}
        aria-hidden
      />

      <ActionBar
        activeVariant={isMyArtSelected ? 'my-art' : 'default'}
        onCreateAi={openAiSkinModal}
        onSelectVariant={(variant) => {
          if (variant === 'default') {
            handleSkinChange('default');
            return;
          }
          handleSelectMyArt();
        }}
        onUploadArt={() => {
          if (disabled) return;
          customArtInputRef.current?.click();
        }}
        uploadButtonLabel={uploadButtonLabel}
        pendingCount={pendingArtProposalsCount}
        disabled={disabled}
        aiDisabled={isAiSkinLimitReached}
        aiTitle={isAiSkinLimitReached ? `Лимит ${MAX_BADGE_AI_SKINS}/${MAX_BADGE_AI_SKINS}` : undefined}
        myArtDisabled={!hasMyArt && !isMyArtSelected}
        myArtTitle={!hasMyArt ? 'Сначала создай арт через ИИ или загрузи свой арт' : undefined}
        uploadTitle={isApprovedLimitReached ? `Лимит одобренных артов: ${MAX_BADGE_APPROVED_ARTS}` : undefined}
      />

      <StatusChips items={statusItems} />

      {activeStatus === 'ai' && (
        <div className="badge-status-content" aria-label="Панель ИИ-артов">
          <div className="badge-skin-gallery__head">
            <span className="badge-skin-gallery__title">ИИ-арты</span>
            <span className="badge-skin-gallery__count">{generatedSkins.length}/{MAX_BADGE_AI_SKINS}</span>
          </div>
          {generatedSkins.length > 0 ? (
            <div className="badge-skin-gallery__list">
              {generatedSkins.map((url, index) => {
                const aiSkinId = getAiSkinId(index);
                const isActive = currentSkin === aiSkinId;
                const isDeleteConfirmOpen = pendingDelete?.kind === 'ai' && pendingDelete.slotIndex === index;
                return (
                  <div key={aiSkinId} className={`badge-skin-gallery__item${isActive ? ' is-active' : ''}`}>
                    <button
                      type="button"
                      className="badge-skin-gallery__pick"
                      onClick={() => handleSkinChange(aiSkinId)}
                      disabled={disabled}
                      aria-label={`Выбрать ИИ-арт ${index + 1}`}
                    >
                      <img src={url} alt={`ИИ-арт ${index + 1}`} loading="lazy" />
                      <span>{index + 1}</span>
                    </button>
                    <button
                      type="button"
                      className="badge-skin-gallery__remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isDeleteConfirmOpen) {
                          handleRemoveAiSkin(index);
                          return;
                        }
                        openDeleteConfirm('ai', index);
                      }}
                      disabled={disabled}
                      aria-label={isDeleteConfirmOpen ? `Подтвердить удаление ИИ-арта ${index + 1}` : `Удалить ИИ-арт ${index + 1}`}
                    >
                      {isDeleteConfirmOpen ? '!' : '×'}
                    </button>
                    {isDeleteConfirmOpen && (
                      <div
                        className="badge-skin-gallery__confirm"
                        role="dialog"
                        aria-label={`Подтверждение удаления ИИ-арта ${index + 1}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="badge-skin-gallery__confirm-text">Удалить арт?</div>
                        <div className="badge-skin-gallery__confirm-actions">
                          <button
                            type="button"
                            className="badge-skin-gallery__confirm-btn is-danger"
                            onClick={() => handleRemoveAiSkin(index)}
                            disabled={disabled}
                          >
                            Да
                          </button>
                          <button
                            type="button"
                            className="badge-skin-gallery__confirm-btn"
                            onClick={closeDeleteConfirm}
                            disabled={disabled}
                          >
                            Нет
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="badge-skin-gallery__empty">
              Пока пусто. Сгенерируй первый вариант.
            </div>
          )}
        </div>
      )}

      {activeStatus === 'approved' && (
        <div className="badge-status-content" aria-label="Панель одобренных артов">
          <div className="badge-skin-gallery__head">
            <span className="badge-skin-gallery__title">Одобренные арты</span>
            <span className="badge-skin-gallery__count">{approvedSkins.length}/{MAX_BADGE_APPROVED_ARTS}</span>
          </div>
          {approvedSkins.length > 0 ? (
            <div className="badge-skin-gallery__list">
              {approvedSkins.map((url, index) => {
                const approvedSkinId = getApprovedArtSkinId(index);
                const isActive = currentSkin === approvedSkinId;
                const isDeleteConfirmOpen = pendingDelete?.kind === 'approved' && pendingDelete.slotIndex === index;
                return (
                  <div key={approvedSkinId} className={`badge-skin-gallery__item${isActive ? ' is-active' : ''}`}>
                    <button
                      type="button"
                      className="badge-skin-gallery__pick"
                      onClick={() => handleSkinChange(approvedSkinId)}
                      disabled={disabled}
                      aria-label={`Выбрать одобренный арт ${index + 1}`}
                    >
                      <img src={url} alt={`Одобренный арт ${index + 1}`} loading="lazy" />
                      <span>A{index + 1}</span>
                    </button>
                    <button
                      type="button"
                      className="badge-skin-gallery__remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isDeleteConfirmOpen) {
                          handleRemoveApprovedSkin(index);
                          return;
                        }
                        openDeleteConfirm('approved', index);
                      }}
                      disabled={disabled}
                      aria-label={isDeleteConfirmOpen ? `Подтвердить удаление арта ${index + 1}` : `Удалить арт ${index + 1}`}
                    >
                      {isDeleteConfirmOpen ? '!' : '×'}
                    </button>
                    {isDeleteConfirmOpen && (
                      <div
                        className="badge-skin-gallery__confirm"
                        role="dialog"
                        aria-label={`Подтверждение удаления арта ${index + 1}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="badge-skin-gallery__confirm-text">Удалить арт?</div>
                        <div className="badge-skin-gallery__confirm-actions">
                          <button
                            type="button"
                            className="badge-skin-gallery__confirm-btn is-danger"
                            onClick={() => handleRemoveApprovedSkin(index)}
                            disabled={disabled}
                          >
                            Да
                          </button>
                          <button
                            type="button"
                            className="badge-skin-gallery__confirm-btn"
                            onClick={closeDeleteConfirm}
                            disabled={disabled}
                          >
                            Нет
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="badge-skin-gallery__empty">
              Пока нет одобренных пользовательских артов.
            </div>
          )}
        </div>
      )}

      {activeStatus === 'progress' && (
        <div className="badge-status-content badge-status-content--progress" aria-label="Панель коллекции">
          <div className="badge-status-content__progress">
            <div className="badge-status-content__progress-title">В коллекции</div>
            <div className="badge-status-content__progress-value">{inProgressCount}/{inProgressMax}</div>
          </div>
          <div className="badge-status-content__progress-hint">{inProgressHint}</div>
        </div>
      )}

      {panelError && (
        <div className="badge-skin-lock-note" style={{ borderColor: 'rgba(255,120,120,0.45)', color: '#ffcbcb', background: 'rgba(120,20,20,0.22)' }}>
          {panelError}
        </div>
      )}

      {disabled && (
        <div className="badge-skin-lock-note">
          {disabledHint || 'Арты откроются после получения предыдущего уровня.'}
        </div>
      )}

      {aiSkinModalOpen && (
        <div
          className="proof-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAiSkinModal();
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
            aria-labelledby="badge-ai-skin-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#16162a',
              borderRadius: 16,
              padding: 20,
              color: 'white',
            }}
          >
            <h3 id="badge-ai-skin-modal-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Создать арт значка с помощью ИИ
            </h3>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>
              ИИ сгенерирует новый визуал для значка «{badgeTitle}». Слоты: {generatedSkins.length}/{MAX_BADGE_AI_SKINS}.
            </p>
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
                placeholder="Например: неон, киберпанк, золотой герб, минимализм..."
                value={aiSkinPrompt}
                onChange={(e) => setAiSkinPrompt(e.target.value)}
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
            {aiSkinError ? (
              <div className="profile-error profile-error--not-found" style={{ marginBottom: 16 }}>
                {aiSkinError}
                <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={handleGenerateAiSkin}>
                  Повторить
                </button>
              </div>
            ) : aiSkinPreviewUrl ? (
              <>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 220,
                    margin: '0 auto 16px',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <img src={aiSkinPreviewUrl} alt="Превью арта" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                <button
                  type="button"
                  onClick={handleSaveAiSkin}
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
                  Сохранить как арт значка
                </button>
              </>
            ) : aiSkinBusy ? (
              <p className="profile-loading" style={{ textAlign: 'center', padding: '16px' }}>Генерируем арт...</p>
            ) : (
              <button
                type="button"
                onClick={handleGenerateAiSkin}
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
              onClick={closeAiSkinModal}
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
              Закрыть
            </button>
          </div>
        </div>
      )}

      {artProposalModalOpen && (
        <div
          className="proof-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeArtProposalModal();
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
            aria-labelledby="badge-art-proposal-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#16162a',
              borderRadius: 16,
              padding: 20,
              color: 'white',
            }}
          >
            <h3 id="badge-art-proposal-modal-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Отправить версию значка на согласование
            </h3>
            <p style={{ fontSize: 12, opacity: 0.78, marginBottom: 12, lineHeight: 1.5 }}>
              После утверждения арт появится в разделе «Одобренные арты» и его можно будет выбрать как арт.
            </p>
            {isModeratorRole && (
              <p style={{ fontSize: 12, opacity: 0.62, marginTop: 0, marginBottom: 12 }}>
                Для вашей роли заявка доступна в ЛК в блоке согласования артов.
              </p>
            )}
            {artProposalDraftUrl && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 220,
                  margin: '0 auto 16px',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <img src={artProposalDraftUrl} alt="Новый арт значка" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}
            {artProposalError && (
              <div className="profile-error profile-error--not-found" style={{ marginBottom: 12 }}>
                {artProposalError}
              </div>
            )}
            {artProposalSuccess && (
              <div style={{ marginBottom: 12, border: '1px solid rgba(89, 255, 168, 0.45)', background: 'rgba(70, 180, 120, 0.18)', borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
                {artProposalSuccess}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmitArtProposal}
              disabled={artProposalBusy || !artProposalDraftUrl || Boolean(artProposalSuccess)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(90deg, #7a37ff, #48a6ff)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                cursor: artProposalBusy || !artProposalDraftUrl || Boolean(artProposalSuccess) ? 'not-allowed' : 'pointer',
                opacity: artProposalBusy || !artProposalDraftUrl || Boolean(artProposalSuccess) ? 0.65 : 1,
              }}
            >
              {artProposalBusy ? 'Отправляем...' : artProposalSuccess ? 'Отправлено' : 'Отправить на согласование'}
            </button>
            <button
              type="button"
              onClick={closeArtProposalModal}
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
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeSkinPanel;
