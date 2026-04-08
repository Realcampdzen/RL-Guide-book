import React, { useState } from 'react';
import { fetchCouncilInitiative } from '../../../utils/aiService';

interface InitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  myTeam: any;
  showHint: (hint: { title: string; content: string }) => void;
  defaultDay: number;
}

export const InitiativeModal: React.FC<InitiativeModalProps> = ({
  isOpen,
  onClose,
  myTeam,
  showHint,
  defaultDay,
}) => {
  const [initiativeForm, setInitiativeForm] = useState({
    topicDraft: '',
    currentDay: 1,
    shiftLength: 21 as 9 | 21,
    campProgram3d: ''
  });
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [initiativeError, setInitiativeError] = useState<string | null>(null);
  const [initiativeResult, setInitiativeResult] = useState<{
    initiativeText: string;
    steps: string[];
  } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setInitiativeForm({
        topicDraft: '',
        currentDay: Math.min(21, Math.max(1, defaultDay)),
        shiftLength: 21 as 9 | 21,
        campProgram3d: '',
      });
      setInitiativeResult(null);
      setInitiativeError(null);
    }
  }, [isOpen, defaultDay]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setInitiativeResult(null);
    setInitiativeError(null);
  };

  const handleCopy = () => {
    if (!initiativeResult) return;
    const text = `💡 Инициатива в Совет Лагеря\n\n${
      initiativeResult.initiativeText
    }\n\nШаги:\n${initiativeResult.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')}`;
    navigator.clipboard.writeText(text).then(() =>
      showHint({
        title: 'Скопировано',
        content: 'Текст инициативы скопирован в буфер обмена.',
      })
    );
  };

  const handleSendTelegram = () => {
    if (!initiativeResult) return;
    const text = `💡 Инициатива в Совет Лагеря\n\n${
      initiativeResult.initiativeText
    }\n\nШаги:\n${initiativeResult.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')}`;
    window.open(
      `https://t.me/Stivanovv?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
    showHint({
      title: 'Открыто',
      content: 'Инициатива открыта в Telegram. Отправь в чат Совета или вожатым.',
    });
  };

  const generateInitiative = async () => {
    if (!initiativeForm.topicDraft.trim()) {
      showHint({
        title: 'Напиши идею',
        content: 'Опиши тему или идею инициативы в поле выше.',
      });
      return;
    }
    setInitiativeBusy(true);
    setInitiativeError(null);
    try {
      const res = await fetchCouncilInitiative({
        teamName: myTeam?.name,
        topicDraft: initiativeForm.topicDraft.trim(),
        currentDay: initiativeForm.currentDay,
        shiftLength: initiativeForm.shiftLength,
        campProgram3d: initiativeForm.campProgram3d.trim() || undefined,
      });
      if (res) {
        setInitiativeResult(res as any);
        setInitiativeError(null);
      } else {
        setInitiativeError(
          'Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend'
        );
        showHint({
          title: 'Ошибка API',
          content: 'Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend',
        });
      }
    } catch (e) {
      console.error('fetchCouncilInitiative:', e);
      setInitiativeError('Ошибка сети или backend не запущен. Запусти: npm run start:backend');
      showHint({
        title: 'Ошибка API',
        content: 'Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend',
      });
    } finally {
      setInitiativeBusy(false);
    }
  };

  return (
    <div
      className="proof-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="proof-modal proof-modal--mobile-sheet fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-initiative-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="profile-modal-initiative-title" style={{ marginTop: 0, marginBottom: 8 }}>
          💡 Предложить инициативу в совет лагеря
        </h3>
        
        {initiativeError && (
          <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
            {initiativeError}
            <button
              type="button"
              onClick={() => setInitiativeError(null)}
              style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
            >
              Скрыть
            </button>
          </div>
        )}

        {initiativeResult ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
              {initiativeResult.initiativeText}
            </div>
            {initiativeResult.steps.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {initiativeResult.steps.map((item, i) => (
                  <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    • {item}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={handleCopy} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }}>
              Скопировать
            </button>
            <button onClick={handleSendTelegram} className="btn-primary-gold" style={{ width: '100%' }}>
              Отправить в Telegram
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>
              Опиши идею — ИИ поможет оформить её в инициативу для Совета (суть + шаги).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>
                  Идея / тема инициативы
                </label>
                <textarea
                  placeholder="Новая игра, мероприятие, улучшение традиций, идея от Движка…"
                  className="w-input"
                  rows={3}
                  style={{ width: '100%', padding: 10, resize: 'vertical' }}
                  value={initiativeForm.topicDraft}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, topicDraft: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>
                    День смены
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={initiativeForm.shiftLength}
                    value={initiativeForm.currentDay}
                    onChange={(e) =>
                      setInitiativeForm({
                        ...initiativeForm,
                        currentDay: Math.min(initiativeForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)),
                      })
                    }
                    className="w-input"
                    style={{ width: '70px', padding: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>
                    Смена
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={initiativeForm.shiftLength === 21}
                        onChange={() => setInitiativeForm({ ...initiativeForm, shiftLength: 21, currentDay: Math.min(21, initiativeForm.currentDay) })}
                      />{' '}
                      21 дн.
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={initiativeForm.shiftLength === 9}
                        onChange={() => setInitiativeForm({ ...initiativeForm, shiftLength: 9, currentDay: Math.min(9, initiativeForm.currentDay) })}
                      />{' '}
                      9 дн.
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>
                  Программа лагеря на 3 дня (по желанию)
                </label>
                <textarea
                  placeholder="План-сетка лагеря на ближайшие дни…"
                  className="w-input"
                  rows={2}
                  style={{ width: '100%', padding: 10, resize: 'vertical' }}
                  value={initiativeForm.campProgram3d}
                  onChange={(e) => setInitiativeForm({ ...initiativeForm, campProgram3d: e.target.value })}
                />
              </div>
            </div>
            
            <button
              onClick={generateInitiative}
              disabled={initiativeBusy}
              className="btn-primary-gold"
              style={{ width: '100%', marginTop: 16 }}
            >
              {initiativeBusy ? 'Генерируем…' : 'Сгенерировать инициативу'}
            </button>
          </>
        )}
        
        <button
          onClick={handleClose}
          style={{ width: '100%', background: 'none', border: 'none', color: 'white', marginTop: 12, cursor: 'pointer', opacity: 0.5, fontSize: 13 }}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};
