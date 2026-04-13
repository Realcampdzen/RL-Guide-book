import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserProgress } from '../hooks/useUserProgress';
import { lockScroll, unlockScroll } from '../utils/scrollLock';
import '../styles/bro-bonfire.css';

interface BroBonfireProps {
  onComplete: () => void;
  onCancel?: () => void;
  usePortal?: boolean;
}

export const BroBonfire: React.FC<BroBonfireProps> = ({
  onComplete,
  onCancel,
  usePortal = false,
}) => {
  const { selectWingMentor } = useUserProgress();
  const [step, setStep] = useState<'intro' | 'recipe' | 'words' | 'wing'>('intro');
  const [wingName, setWingName] = useState('');
  const [wingNameError, setWingNameError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const mentors = useMemo(() => ['Степан И.', 'Максим В.', 'Анна К.'], []);

  useEffect(() => {
    if (!usePortal || typeof document === 'undefined') return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [usePortal]);

  useEffect(() => {
    if (!usePortal || typeof document === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, usePortal]);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const submitMentor = (mentor: string) => {
    const trimmedWingName = wingName.trim();
    if (!trimmedWingName) {
      setWingNameError('Сначала придумай название Крыла.');
      return;
    }
    setWingNameError(null);
    selectWingMentor(mentor, trimmedWingName);
    onComplete();
  };

  const content = (
    <div
      ref={overlayRef}
      className="bro-bonfire-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="БРО-костер"
      tabIndex={-1}
    >
      <div className="bro-bonfire-glow" />
      <div className="bro-bonfire-shell">
        <div className="bro-bonfire-actions">
          {onCancel && (
            <button
              type="button"
              className="bro-bonfire-btn bro-bonfire-btn--ghost"
              onClick={onCancel}
            >
              Вернуться к Бропаспорту
            </button>
          )}
        </div>

        {step === 'intro' && (
          <div className="bro-bonfire-card bro-bonfire-fade-in">
            <div className="bro-bonfire-emoji bro-bonfire-emoji--intro" aria-hidden>
              🔥
            </div>
            <h2 className="bro-bonfire-title">БРО-КОСТЕР</h2>
            <p className="bro-bonfire-text">
              Время финала. Самый теплый момент Бросвящения. Собираемся в круг...
            </p>
            <button
              type="button"
              className="bro-bonfire-btn bro-bonfire-btn--orange"
              onClick={() => setStep('recipe')}
            >
              ГОТОВИТЬ БРОТЕРБРОДЫ
            </button>
          </div>
        )}

        {step === 'recipe' && (
          <div className="bro-bonfire-card bro-bonfire-fade-in">
            <div className="bro-bonfire-emoji" aria-hidden>
              🍞🧂🌻
            </div>
            <h2 className="bro-bonfire-title bro-bonfire-title--orange">ОСОБЫЙ РЕЦЕПТ</h2>
            <ul className="bro-bonfire-list">
              <li>Нарежь хлеб аккуратными кусочками</li>
              <li>Посыпь крупной солью с любовью</li>
              <li>Сбрызни подсолнечным маслом</li>
              <li>Жарь на костре как шашлычок до хруста</li>
            </ul>
            <button
              type="button"
              className="bro-bonfire-btn bro-bonfire-btn--purple"
              onClick={() => setStep('words')}
            >
              СЛУШАТЬ НАПУТСТВИЯ
            </button>
          </div>
        )}

        {step === 'words' && (
          <div className="bro-bonfire-card bro-bonfire-fade-in">
            <div className="bro-bonfire-emoji" aria-hidden>
              📢
            </div>
            <h2 className="bro-bonfire-title bro-bonfire-title--lavender">СЛОВА СТАРШИХ</h2>
            <p className="bro-bonfire-text bro-bonfire-text--quote">
              "Бро - это не просто статус. Это ответственность за младших, за лагерь и за самих
              себя. Помни традиции, храни огонь."
            </p>
            <button
              type="button"
              className="bro-bonfire-btn bro-bonfire-btn--gold"
              onClick={() => setStep('wing')}
            >
              СФОРМИРОВАТЬ КРЫЛО
            </button>
          </div>
        )}

        {step === 'wing' && (
          <div className="bro-bonfire-card bro-bonfire-fade-in">
            <div className="bro-bonfire-emoji" aria-hidden>
              🦅
            </div>
            <h2 className="bro-bonfire-title">ТВОЕ КРЫЛО</h2>
            <p className="bro-bonfire-text bro-bonfire-text--small">
              Объединитесь и выберите своего Наставника
            </p>

            <input
              className="bro-bonfire-input"
              placeholder="Название вашего Крыла"
              value={wingName}
              onChange={(event) => {
                setWingName(event.target.value);
                if (wingNameError) setWingNameError(null);
              }}
              aria-label="Название Крыла"
            />
            {wingNameError && <div className="bro-bonfire-error">{wingNameError}</div>}

            <div className="bro-bonfire-caption">ВЫБЕРИТЕ НАСТАВНИКА ИЗ ОПЫТНЫХ БРО:</div>
            <div className="bro-bonfire-mentor-grid">
              {mentors.map((mentor) => (
                <button
                  key={mentor}
                  type="button"
                  className="bro-bonfire-btn bro-bonfire-btn--mentor"
                  onClick={() => submitMentor(mentor)}
                >
                  {mentor}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (usePortal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
