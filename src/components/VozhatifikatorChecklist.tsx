import React, { useState, useRef } from 'react';
import {
  VOZHATIFIKATOR_CHECKLIST_ITEMS,
  getVozhatifikatorLevel,
} from '../data/vozhatifikatorChecklist';
import { submitVozhatifikatorProof } from '../utils/adminApi';

interface VozhatifikatorChecklistProps {
  completedIds: string[];
  onToggle: (itemId: string, completed: boolean) => void;
  /** Info for the proof submission — nickname, role, deviceId */
  userNickname?: string;
  userRole?: string;
  deviceId?: string;
}

export const VozhatifikatorChecklist: React.FC<VozhatifikatorChecklistProps> = ({
  completedIds,
  onToggle,
  userNickname,
  userRole,
  deviceId,
}) => {
  const totalPoints = VOZHATIFIKATOR_CHECKLIST_ITEMS.reduce(
    (sum, item) => (completedIds.includes(item.id) ? sum + item.points : sum),
    0
  );
  const level = getVozhatifikatorLevel(totalPoints);
  const totalMax = VOZHATIFIKATOR_CHECKLIST_ITEMS.reduce((s, i) => s + i.points, 0);
  const progressPct = totalMax > 0 ? Math.min(100, (totalPoints / totalMax) * 100) : 0;

  // Proof submission state
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'ok' | 'error' | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Фото слишком большое (макс. 5 МБ)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (completedIds.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      await submitVozhatifikatorProof({
        deviceId: deviceId || 'unknown',
        nickname: userNickname || 'Участник',
        userRole: userRole || 'participant',
        completedIds,
        totalPoints,
        level: level.label,
        photo: proofPhoto || undefined,
      });
      setSubmitResult('ok');
      setProofPhoto(null);
    } catch {
      setSubmitResult('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vozhatifikator-checklist">
      {/* Header with decorative icon */}
      <div className="vozhatifikator-checklist__header">
        <span className="vozhatifikator-checklist__header-icon" aria-hidden="true">🕯️</span>
        <h2 className="vozhatifikator-checklist__title">Путеводные огни</h2>
      </div>
      <p className="vozhatifikator-checklist__intro">
        Отмечайте достижения — так вы увидите свой уровень вожатификации по шкале из книги.
      </p>

      {/* Score card */}
      <div className="vozhatifikator-checklist__score">
        <span className="vozhatifikator-checklist__points">
          {totalPoints.toFixed(1)} / {totalMax.toFixed(1)}
        </span>
        <span className="vozhatifikator-checklist__level" title={level.description}>
          {level.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="vozhatifikator-checklist__progress-wrap">
        <div className="vozhatifikator-checklist__progress-track">
          <div
            className="vozhatifikator-checklist__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <p className="vozhatifikator-checklist__level-desc">{level.description}</p>

      {/* Checklist items */}
      <ul className="vozhatifikator-checklist__list" aria-label="Пункты чек-листа">
        {VOZHATIFIKATOR_CHECKLIST_ITEMS.map((item, idx) => {
          const isDone = completedIds.includes(item.id);
          return (
            <li
              key={item.id}
              className={`vozhatifikator-checklist__item ${isDone ? 'vozhatifikator-checklist__item--done' : ''}`}
              style={{ animationDelay: `${idx * 0.03}s` }}
              onClick={() => onToggle(item.id, !isDone)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(item.id, !isDone); } }}
              aria-pressed={isDone}
              aria-label={isDone ? `Снять отметку: ${item.title}` : `Отметить: ${item.title}`}
            >
              <span
                className={`vozhatifikator-checklist__checkbox ${isDone ? 'vozhatifikator-checklist__checkbox--done' : ''}`}
                aria-hidden="true"
              >
                {isDone ? '\u2713' : ''}
              </span>
              <span className={`vozhatifikator-checklist__label ${isDone ? 'vozhatifikator-checklist__label--done' : ''}`}>
                {item.title}
              </span>
              <span className="vozhatifikator-checklist__pts">+{item.points}</span>
            </li>
          );
        })}
      </ul>

      {/* ── Proof submission ── */}
      <div className="vozhatifikator-checklist__proof">
        <h3 className="vozhatifikator-checklist__proof-title">
          Отправить на проверку
        </h3>
        <p className="vozhatifikator-checklist__proof-desc">
          Приложите фото-доказательство и отправьте результат вожатому для подтверждения.
        </p>

        {/* Photo upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />
        <div className="vozhatifikator-checklist__proof-actions">
          <button
            type="button"
            className="vozhatifikator-checklist__photo-btn"
            onClick={() => fileRef.current?.click()}
          >
            📷 {proofPhoto ? 'Заменить фото' : 'Прикрепить фото'}
          </button>
          {proofPhoto && (
            <img
              src={proofPhoto}
              alt="Фото-доказательство"
              className="vozhatifikator-checklist__photo-preview"
            />
          )}
        </div>

        {/* Submit button */}
        <button
          type="button"
          className={`vozhatifikator-checklist__submit-btn ${completedIds.length > 0 ? 'vozhatifikator-checklist__submit-btn--active' : 'vozhatifikator-checklist__submit-btn--disabled'}`}
          onClick={() => void handleSubmitProof()}
          disabled={submitting || completedIds.length === 0}
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Отправка…' : `Отправить (${completedIds.length} пунктов, ${totalPoints.toFixed(1)} б.)`}
        </button>

        {/* Result toast */}
        {submitResult === 'ok' && (
          <div className="vozhatifikator-checklist__toast vozhatifikator-checklist__toast--ok">
            ✓ Отправлено на проверку вожатому!
          </div>
        )}
        {submitResult === 'error' && (
          <div className="vozhatifikator-checklist__toast vozhatifikator-checklist__toast--error">
            Ошибка отправки. Попробуйте ещё раз.
          </div>
        )}
      </div>
    </div>
  );
};
