import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useHintOverlay } from '../../../context/HintOverlayContext';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { createBadgeRequest } from '../../../utils/badgeApprovalApi';

export interface ProofFormBadge {
  id: string;
  title: string;
  learned?: string;
  link?: string;
}

export const ProofModal: React.FC = () => {
  const { accessToken, deviceId } = useAuth();
  const { updateLevelEvidence, userData } = useUserProgress();
  const { showHint } = useHintOverlay();

  const [proofBadge, setProofBadge] = useState<ProofFormBadge | null>(null);
  const [proofForm, setProofForm] = useState({ learned: '', impact: '', link: '' });
  const [proofPhotoCount, setProofPhotoCount] = useState(0);
  const proofPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOpenBadgeProof = (e: Event) => {
      const customEvent = e as CustomEvent<{ badgeInfo: ProofFormBadge }>;
      const badgeInfo = customEvent.detail?.badgeInfo;
      if (!badgeInfo) return;
      setProofForm({ learned: badgeInfo.learned || '', impact: '', link: badgeInfo.link || '' });
      setProofPhotoCount(0);
      if (proofPhotoInputRef.current) proofPhotoInputRef.current.value = '';
      setProofBadge({ id: badgeInfo.id, title: badgeInfo.title });
    };
    window.addEventListener('profile:openBadgeProof', handleOpenBadgeProof);
    return () => {
      window.removeEventListener('profile:openBadgeProof', handleOpenBadgeProof);
    };
  }, []);

  if (!proofBadge) return null;

  const handleClose = () => {
    setProofBadge(null);
    setProofForm({ learned: '', impact: '', link: '' });
    setProofPhotoCount(0);
    if (proofPhotoInputRef.current) proofPhotoInputRef.current.value = '';
  };

  return createPortal(
    <div
      className="profile-view"
      style={{ position: 'fixed', inset: 0, zIndex: 15000, pointerEvents: 'none', cursor: 'auto' }}
    >
      <div
        className="proof-modal-overlay"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="proof-modal fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-proof-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="profile-modal-proof-title" style={{ marginTop: 0, marginBottom: 4 }}>
            Подтверждение: {proofBadge.title}
          </h3>
          <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 20, lineHeight: 1.5 }}>
            Опыт и рефлексия помогают зафиксировать достижение. Вожатый рассмотрит заявку в Пульте
            управления.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 6,
                }}
              >
                Чему научился(лась)?
              </label>
              <textarea
                placeholder="Чему научился(лась)? Что освоил(а)?"
                className="w-input"
                style={{
                  height: 72,
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  resize: 'vertical',
                }}
                value={proofForm.learned}
                onChange={(e) => setProofForm({ ...proofForm, learned: e.target.value })}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 6,
                }}
              >
                Реальный вклад
              </label>
              <textarea
                placeholder="Как повлияло на лагерь и тебя? Что изменилось?"
                className="w-input"
                style={{
                  height: 72,
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  resize: 'vertical',
                }}
                value={proofForm.impact}
                onChange={(e) => setProofForm({ ...proofForm, impact: e.target.value })}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 6,
                }}
              >
                Ссылка (пост, доказательство)
              </label>
              <input
                type="url"
                placeholder="Ссылка (посты в соцсетях лагеря, отряда, вашей страницы и т.д.)"
                className="w-input"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                }}
                value={proofForm.link}
                onChange={(e) => setProofForm({ ...proofForm, link: e.target.value })}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                  marginBottom: 6,
                }}
              >
                Фото (доказательство)
              </label>
              <button
                type="button"
                onClick={() => proofPhotoInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                📷 {proofPhotoCount > 0 ? `Выбрано: ${proofPhotoCount}` : 'Прикрепить фото'}
              </button>
              <input
                type="file"
                ref={proofPhotoInputRef}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => setProofPhotoCount(e.target.files?.length ?? 0)}
              />
              <p style={{ fontSize: 11, opacity: 0.55, marginTop: 4, lineHeight: 1.3 }}>
                Фото прикрепляется к заявке и будет видно вожатому.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const hasAny =
                proofForm.learned.trim() ||
                proofForm.impact.trim() ||
                proofForm.link.trim() ||
                proofPhotoCount > 0;
              if (
                !hasAny &&
                !confirm('Отправить без описания? Рекомендуем заполнить опыт и реальный вклад.')
              )
                return;
              try {
                // Convert photos to base64 data URLs
                const photos: string[] = [];
                if (proofPhotoInputRef.current?.files) {
                  for (const file of Array.from(proofPhotoInputRef.current.files)) {
                    const dataUrl = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        // Compress: draw to canvas at max 800px
                        const img = new Image();
                        img.onload = () => {
                          const MAX = 800;
                          let w = img.width,
                            h = img.height;
                          if (w > MAX || h > MAX) {
                            const scale = Math.min(MAX / w, MAX / h);
                            w = Math.round(w * scale);
                            h = Math.round(h * scale);
                          }
                          const canvas = document.createElement('canvas');
                          canvas.width = w;
                          canvas.height = h;
                          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                          resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.onerror = () => resolve(reader.result as string);
                        img.src = reader.result as string;
                      };
                      reader.onerror = () => resolve('');
                      reader.readAsDataURL(file);
                    });
                    if (dataUrl) photos.push(dataUrl);
                  }
                }
                await createBadgeRequest(
                  accessToken || '',
                  {
                    levelId: proofBadge.id,
                    badgeTitle: proofBadge.title,
                    evidence: {
                      reflection: proofForm.learned.trim() || undefined,
                      impact: proofForm.impact.trim() || undefined,
                      link: proofForm.link.trim() || undefined,
                      photos: photos.length > 0 ? photos : undefined,
                    },
                    nickname: undefined,
                  },
                  deviceId || undefined
                );
                showHint({
                  title: '✅ Заявка отправлена',
                  content: 'Вожатый рассмотрит её в Пульте управления.',
                });
                if (proofBadge.id && userData?.progress?.[proofBadge.id] && updateLevelEvidence) {
                  const evidence: { type: 'link' | 'text'; value: string }[] = [];
                  if (proofForm.learned.trim())
                    evidence.push({ type: 'text', value: proofForm.learned.trim() });
                  if (proofForm.impact.trim())
                    evidence.push({ type: 'text', value: proofForm.impact.trim() });
                  if (proofForm.link.trim())
                    evidence.push({ type: 'link', value: proofForm.link.trim() });
                  if (evidence.length > 0) updateLevelEvidence(proofBadge.id, evidence);
                }
              } catch (err: any) {
                console.error('createBadgeRequest error:', err);
                showHint({
                  title: 'Ошибка',
                  content:
                    err?.message || 'Не удалось отправить заявку. Проверьте, что backend запущен.',
                });
                return;
              }
              handleClose();
            }}
            className="btn-primary-gold"
            style={{ width: '100%', marginTop: 24 }}
          >
            Отправить на проверку
          </button>
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'white',
              marginTop: 10,
              cursor: 'pointer',
              opacity: 0.5,
              fontSize: 13,
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
