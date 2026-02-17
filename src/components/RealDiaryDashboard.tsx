import React, { useMemo, useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import type { MyActivityKey, ShiftScheduleKey } from '../types/userProgress';
import { downloadBlob } from '../utils/socialGenerator';
import { ACTIVITY_ITEMS, hasValues, ScheduleCell, ScheduleItem, SHIFT_ITEMS } from '../utils/scheduleConstants';

const DIARY_ACCENT = 'var(--amber-500)';
const DIARY_ACCENT_LIGHT = 'rgba(199, 119, 48, 0.25)';
const DIARY_GRADIENT = 'linear-gradient(135deg, rgba(199, 119, 48, 0.12) 0%, rgba(120, 53, 15, 0.18) 100%)';
const EMOJI_OPTIONS = ['😊', '😢', '😤', '🌟', '🎉', '😴', '🤔', '💪', '❤️', '🔥', '👍', '😎'];

const text = (v?: string) => (v || '').trim();

const DiaryRow: React.FC<{ label: string; value: string; emoji?: string; onText: (v: string) => void; onEmoji: (v: string) => void }> = ({ label, value, emoji, onText, onEmoji }) => (
  <div style={{ display: 'grid', gap: 8 }}>
    <label style={{ fontSize: 12, fontWeight: 600 }}>{label}</label>
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <textarea className="w-input" value={value} onChange={(e) => onText(e.target.value)} rows={2} placeholder="Что было?" style={{ flex: 1, width: '100%', minHeight: 60 }} />
      <div style={{ width: 100, display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
        {EMOJI_OPTIONS.map((em) => (
          <button key={em} type="button" onClick={() => onEmoji(emoji === em ? '' : em)} style={{ width: 28, height: 28, borderRadius: 8, border: emoji === em ? `2px solid ${DIARY_ACCENT}` : '1px solid rgba(255,255,255,0.2)', background: emoji === em ? DIARY_ACCENT_LIGHT : 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
            {em}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export type RealDiaryTabId = 'diary' | 'reflection' | 'schedule' | 'diary-card';

interface RealDiaryDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: RealDiaryTabId;
  onTabChange?: (tab: RealDiaryTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
  onScrollToInspector?: () => void;
}

export const RealDiaryDashboard: React.FC<RealDiaryDashboardProps> = ({ variant = 'accordion', activeTab = 'diary', onTabChange, onNavigateToBadge, onScrollToInspector }) => {
  const { userData, updateDiaryEntry, updateDiaryShiftTemplates, setDiaryDay } = useUserProgress();
  const progress = userData.diaryProgress || { currentDay: 1, entries: {} };
  const entries = progress.entries;
  const currentDay = progress.currentDay;
  const currentEntry = entries[String(currentDay)] || {};

  const [isExpanded, setIsExpanded] = useState(false);
  const [presentationExpanded, setPresentationExpanded] = useState(false);
  const [presentationText, setPresentationText] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [telegramToast, setTelegramToast] = useState(false);
  const [scheduleSavedToast, setScheduleSavedToast] = useState(false);

  const [localMain, setLocalMain] = useState(currentEntry.mainMoments ?? '');
  const [localFriends, setLocalFriends] = useState(currentEntry.friends ?? '');
  const [localConclusions, setLocalConclusions] = useState(currentEntry.conclusions ?? '');
  const [localMorningText, setLocalMorningText] = useState(currentEntry.morningText ?? '');
  const [localMorningEmoji, setLocalMorningEmoji] = useState(currentEntry.morningEmoji ?? '');
  const [localDayText, setLocalDayText] = useState(currentEntry.dayText ?? '');
  const [localDayEmoji, setLocalDayEmoji] = useState(currentEntry.dayEmoji ?? '');
  const [localEveningText, setLocalEveningText] = useState(currentEntry.eveningText ?? '');
  const [localEveningEmoji, setLocalEveningEmoji] = useState(currentEntry.eveningEmoji ?? '');
  const [localMemorableText, setLocalMemorableText] = useState(currentEntry.memorableText ?? '');
  const [localMemorableEmoji, setLocalMemorableEmoji] = useState(currentEntry.memorableEmoji ?? '');

  const savedShift = progress.shiftSchedule ?? {};
  const savedActivities = progress.myActivities ?? {};
  const [localShift, setLocalShift] = useState<Partial<Record<ShiftScheduleKey, ScheduleCell>>>(() => savedShift);
  const [localActivities, setLocalActivities] = useState<Partial<Record<MyActivityKey, ScheduleCell>>>(() => savedActivities);
  const [editingShift, setEditingShift] = useState(!hasValues(savedShift, SHIFT_ITEMS));
  const [editingActivities, setEditingActivities] = useState(!hasValues(savedActivities, ACTIVITY_ITEMS));

  const savedShiftKey = useMemo(() => JSON.stringify(savedShift), [progress?.shiftSchedule]);
  const savedActivitiesKey = useMemo(() => JSON.stringify(savedActivities), [progress?.myActivities]);

  React.useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  React.useEffect(() => {
    const e = entries[String(currentDay)] || {};
    setLocalMain(e.mainMoments ?? '');
    setLocalFriends(e.friends ?? '');
    setLocalConclusions(e.conclusions ?? '');
    setLocalMorningText(e.morningText ?? '');
    setLocalMorningEmoji(e.morningEmoji ?? '');
    setLocalDayText(e.dayText ?? '');
    setLocalDayEmoji(e.dayEmoji ?? '');
    setLocalEveningText(e.eveningText ?? '');
    setLocalEveningEmoji(e.eveningEmoji ?? '');
    setLocalMemorableText(e.memorableText ?? '');
    setLocalMemorableEmoji(e.memorableEmoji ?? '');
  }, [currentDay, entries]);

  React.useEffect(() => {
    const s = progress.shiftSchedule ?? {};
    setLocalShift(s);
    if (!hasValues(s, SHIFT_ITEMS)) setEditingShift(true);
  }, [savedShiftKey]);

  React.useEffect(() => {
    const a = progress.myActivities ?? {};
    setLocalActivities(a);
    if (!hasValues(a, ACTIVITY_ITEMS)) setEditingActivities(true);
  }, [savedActivitiesKey]);

  const dayKeys = useMemo(() => {
    const keys = Object.keys(entries).map(Number).filter((n) => n >= 1);
    const max = keys.length ? Math.max(...keys, currentDay) : currentDay;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [entries, currentDay]);

  const saveDiary = () => updateDiaryEntry(currentDay, {
    mainMoments: text(localMain) || undefined,
    friends: text(localFriends) || undefined,
    conclusions: text(localConclusions) || undefined,
    morningText: text(localMorningText) || undefined,
    morningEmoji: text(localMorningEmoji) || undefined,
    dayText: text(localDayText) || undefined,
    dayEmoji: text(localDayEmoji) || undefined,
    eveningText: text(localEveningText) || undefined,
    eveningEmoji: text(localEveningEmoji) || undefined,
    memorableText: text(localMemorableText) || undefined,
    memorableEmoji: text(localMemorableEmoji) || undefined
  });

  const saveShift = () => {
    updateDiaryShiftTemplates({ shiftSchedule: localShift });
    setEditingShift(!hasValues(localShift, SHIFT_ITEMS));
  };

  const saveActivities = () => {
    updateDiaryShiftTemplates({ myActivities: localActivities });
    setEditingActivities(!hasValues(localActivities, ACTIVITY_ITEMS));
  };

  const patchCell = <K extends string>(setState: React.Dispatch<React.SetStateAction<Partial<Record<K, ScheduleCell>>>>, key: K, field: 'time' | 'note', value: string) => {
    setState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const buildPresentationText = () => {
    const e = entries[String(currentDay)] || {};
    const s = progress.squad || {};
    const lines: string[] = [`📖 Реальный Дневник - День ${currentDay}`];
    if (text(s.name)) lines.push(`Отряд: ${text(s.name)}`);
    if (text(e.morningText)) lines.push(`Утро: ${text(e.morningText)}${text(e.morningEmoji) ? ` ${text(e.morningEmoji)}` : ''}`);
    if (text(e.dayText)) lines.push(`День: ${text(e.dayText)}${text(e.dayEmoji) ? ` ${text(e.dayEmoji)}` : ''}`);
    if (text(e.eveningText)) lines.push(`Вечер: ${text(e.eveningText)}${text(e.eveningEmoji) ? ` ${text(e.eveningEmoji)}` : ''}`);
    if (text(e.memorableText)) lines.push(`Чем запомнился: ${text(e.memorableText)}${text(e.memorableEmoji) ? ` ${text(e.memorableEmoji)}` : ''}`);
    if (text(e.mainMoments)) lines.push('', 'Что было важным:', text(e.mainMoments));
    if (text(e.friends)) lines.push('', 'О друзьях:', text(e.friends));
    if (text(e.conclusions)) lines.push('', 'Выводы:', text(e.conclusions));
    const shiftLines = SHIFT_ITEMS.map(({ key, label }) => ({ label, time: text(savedShift[key]?.time), note: text(savedShift[key]?.note) })).filter((x) => x.time || x.note);
    const activityLines = ACTIVITY_ITEMS.map(({ key, label }) => ({ label, time: text(savedActivities[key]?.time), note: text(savedActivities[key]?.note) })).filter((x) => x.time || x.note);
    if (shiftLines.length) lines.push('', 'Распорядок смены:');
    shiftLines.forEach((x) => lines.push(`${x.label}: ${x.time && x.note ? `${x.time} - ${x.note}` : (x.time || x.note)}`));
    if (activityLines.length) lines.push('', 'Мои занятия (кружки/тренировки):');
    activityLines.forEach((x) => lines.push(`${x.label}: ${x.time && x.note ? `${x.time} - ${x.note}` : (x.time || x.note)}`));
    if (!shiftLines.length && text(e.schedule)) lines.push('', 'Беспорядок дня:', text(e.schedule));
    if (text(s.motto)) lines.push('', 'Девиз отряда:', text(s.motto));
    return lines.join('\n') || 'Заполни разделы дневника и сохрани, чтобы создать резюме.';
  };

  const onCopy = async () => {
    const body = presentationText || buildPresentationText();
    try {
      await navigator.clipboard.writeText(body);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch {
      alert('Не удалось скопировать');
    }
  };

  const onTelegram = () => {
    const body = presentationText || buildPresentationText();
    if (!body || body === 'Заполни разделы дневника и сохрани, чтобы создать резюме.') return;
    window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    setTelegramToast(true);
    setTimeout(() => setTelegramToast(false), 3000);
  };

  const saveSchedulesToDevice = async () => {
    const shiftRows = SHIFT_ITEMS.map(({ key, label }) => ({
      label,
      time: text(localShift[key]?.time) || '—',
      note: text(localShift[key]?.note) || '—'
    }));
    const activityRows = ACTIVITY_ITEMS.map(({ key, label }) => ({
      label,
      time: text(localActivities[key]?.time) || '—',
      note: text(localActivities[key]?.note) || '—'
    }));

    try {
      const width = 1660;
      const sidePadding = 56;
      const topBlockHeight = 144;
      const cardGap = 24;
      const cardWidth = (width - sidePadding * 2 - cardGap) / 2;
      const cardHeaderHeight = 86;
      const rowGap = 8;
      const rowMinHeight = 46;
      const noteLineHeight = 20;
      const cardBottomPadding = 18;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = 16;
      const measureCtx = tempCanvas.getContext('2d');
      if (!measureCtx) return;

      const wrapText = (value: string, maxWidth: number) => {
        const source = value || '—';
        const words = source.split(/\s+/).filter(Boolean);
        if (!words.length) return ['—'];
        const lines: string[] = [];
        let line = '';
        words.forEach((word) => {
          const probe = line ? `${line} ${word}` : word;
          if (measureCtx.measureText(probe).width <= maxWidth) {
            line = probe;
            return;
          }
          if (line) lines.push(line);
          line = word;
        });
        if (line) lines.push(line);
        return lines.slice(0, 4);
      };

      const prepareRows = (rows: Array<{ label: string; time: string; note: string }>) => {
        const innerWidth = cardWidth - 36;
        const labelWidth = Math.floor(innerWidth * 0.34);
        const timeWidth = Math.floor(innerWidth * 0.2);
        const noteWidth = innerWidth - labelWidth - timeWidth - 24;
        measureCtx.font = '500 16px "Montserrat", "Segoe UI", sans-serif';
        return rows.map((row) => {
          const noteLines = wrapText(row.note, noteWidth);
          const rowHeight = Math.max(rowMinHeight, noteLines.length * noteLineHeight + 14);
          return { ...row, noteLines, rowHeight };
        });
      };

      const preparedShiftRows = prepareRows(shiftRows);
      const preparedActivityRows = prepareRows(activityRows);
      const cardBodyHeight = (rows: Array<{ rowHeight: number }>) => rows.reduce((sum, row) => sum + row.rowHeight + rowGap, 0) - rowGap;
      const shiftCardHeight = cardHeaderHeight + cardBodyHeight(preparedShiftRows) + cardBottomPadding;
      const activityCardHeight = cardHeaderHeight + cardBodyHeight(preparedActivityRows) + cardBottomPadding;
      const cardsHeight = Math.max(shiftCardHeight, activityCardHeight);
      const height = Math.ceil(topBlockHeight + cardsHeight + 92);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      };

      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#071a33');
      bgGradient.addColorStop(0.5, '#10244a');
      bgGradient.addColorStop(1, '#2a163d');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const glowGradient = ctx.createRadialGradient(width * 0.82, height * 0.2, 20, width * 0.82, height * 0.2, width * 0.56);
      glowGradient.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
      glowGradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 21px "Montserrat", "Segoe UI", sans-serif';
      ctx.fillText('РЕАЛЬНЫЙ ДНЕВНИК', sidePadding, 46);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 42px "Montserrat", "Segoe UI", sans-serif';
      ctx.fillText('Беспорядок дня', sidePadding, 96);
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '500 20px "Montserrat", "Segoe UI", sans-serif';
      const dateText = `Сохранено: ${new Date().toLocaleDateString('ru-RU')}`;
      ctx.fillText(dateText, sidePadding, 126);

      const drawCard = (
        x: number,
        y: number,
        title: string,
        rows: Array<{ label: string; time: string; noteLines: string[]; rowHeight: number }>
      ) => {
        roundedRect(x, y, cardWidth, cardHeaderHeight + cardBodyHeight(rows) + cardBottomPadding, 20);
        ctx.fillStyle = 'rgba(7, 22, 42, 0.78)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 24px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText(title, x + 18, y + 36);

        const innerX = x + 18;
        const innerWidth = cardWidth - 36;
        const labelWidth = Math.floor(innerWidth * 0.34);
        const timeWidth = Math.floor(innerWidth * 0.2);
        const noteWidth = innerWidth - labelWidth - timeWidth - 24;
        const labelX = innerX;
        const timeX = labelX + labelWidth + 12;
        const noteX = timeX + timeWidth + 12;

        ctx.fillStyle = 'rgba(255,255,255,0.64)';
        ctx.font = '600 14px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText('Пункт', labelX, y + 62);
        ctx.fillText('Время', timeX, y + 62);
        ctx.fillText('Заметка', noteX, y + 62);

        let rowY = y + 72;
        rows.forEach((row, idx) => {
          roundedRect(innerX - 6, rowY, innerWidth + 12, row.rowHeight, 10);
          ctx.fillStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.02)';
          ctx.fill();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '600 16px "Montserrat", "Segoe UI", sans-serif';
          ctx.fillText(row.label, labelX, rowY + 28, labelWidth);

          ctx.fillStyle = '#fde68a';
          ctx.fillText(row.time, timeX, rowY + 28, timeWidth);

          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = '500 16px "Montserrat", "Segoe UI", sans-serif';
          row.noteLines.forEach((line, lineIndex) => {
            ctx.fillText(line, noteX, rowY + 24 + lineIndex * noteLineHeight, noteWidth);
          });
          rowY += row.rowHeight + rowGap;
        });
      };

      const cardsY = topBlockHeight;
      drawCard(sidePadding, cardsY, 'Распорядок смены', preparedShiftRows);
      drawCard(sidePadding + cardWidth + cardGap, cardsY, 'Мои занятия (кружки/тренировки)', preparedActivityRows);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error('PNG export failed'));
          },
          'image/png',
          0.94
        );
      });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `расписание-смены-${stamp}.png`);
      setScheduleSavedToast(true);
      setTimeout(() => setScheduleSavedToast(false), 2400);
    } catch {
      alert('Не удалось сохранить расписание на устройство');
    }
  };

  const entriesCountForPreview = Object.values(entries).filter((e) => e.mainMoments?.trim() || e.friends?.trim() || e.conclusions?.trim() || e.morningText?.trim() || e.dayText?.trim() || e.eveningText?.trim() || e.memorableText?.trim()).length;
  const mvpFilledCount = [localMain, localFriends, localConclusions].filter((value) => text(value)).length;
  const isShiftScheduleTab = variant === 'cabin' && activeTab === 'schedule';
  const canExportSchedules = !editingShift && !editingActivities && hasValues(localShift, SHIFT_ITEMS) && hasValues(localActivities, ACTIVITY_ITEMS);
  const sectionWrapStyle: React.CSSProperties = variant === 'cabin' ? {} : { padding: 16, background: 'rgba(0,0,0,0.15)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' };
  const sectionClass = variant === 'cabin' ? 'real-diary-cabin-section' : undefined;

  const scheduleCard = <K extends string>(title: string, items: Array<ScheduleItem<K>>, values: Partial<Record<K, ScheduleCell>>, editing: boolean, onEdit: () => void, onSave: () => void, onChange: (k: K, field: 'time' | 'note', value: string) => void) => (
    <article className="real-diary-schedule-card">
      <h4 className="real-diary-schedule-card__title">{title}</h4>
      {editing ? (
        <div className="real-diary-schedule-editor">
          {items.map(({ key, label }) => (
            <div key={String(key)} className="real-diary-schedule-editor__row">
              <div className="real-diary-schedule-editor__label">{label}</div>
              <input className="w-input real-diary-schedule-editor__time" placeholder="Время" value={values[key]?.time || ''} onChange={(e) => onChange(key, 'time', e.target.value)} />
              <input className="w-input real-diary-schedule-editor__note" placeholder="Заметка" value={values[key]?.note || ''} onChange={(e) => onChange(key, 'note', e.target.value)} />
            </div>
          ))}
          <div className="real-diary-schedule-actions"><button type="button" className="btn-primary-gold" onClick={onSave}>Сохранить</button></div>
        </div>
      ) : (
        <>
          <div className="real-diary-schedule-list">
            {items.map(({ key, label }) => (
              <div key={String(key)} className="real-diary-schedule-row">
                <div className="real-diary-schedule-label">{label}</div>
                <div className="real-diary-schedule-time">{text(values[key]?.time) || '—'}</div>
                <div className="real-diary-schedule-note">{text(values[key]?.note) || '—'}</div>
              </div>
            ))}
          </div>
          <div className="real-diary-schedule-actions"><button type="button" className="btn-secondary" onClick={onEdit}>Редактировать</button></div>
        </>
      )}
    </article>
  );

  const scheduleTab = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      <div className="real-diary-schedule-columns">
        {scheduleCard('Распорядок смены', SHIFT_ITEMS, localShift, editingShift, () => setEditingShift(true), saveShift, (k, f, v) => patchCell(setLocalShift, k, f, v))}
        {scheduleCard('Мои занятия (кружки/тренировки)', ACTIVITY_ITEMS, localActivities, editingActivities, () => setEditingActivities(true), saveActivities, (k, f, v) => patchCell(setLocalActivities, k, f, v))}
      </div>
      {canExportSchedules ? (
        <div className="real-diary-schedule-export">
          <button type="button" className="btn-secondary" onClick={saveSchedulesToDevice}>Сохранить на устройство</button>
          {scheduleSavedToast ? <span className="real-diary-schedule-export__hint">Картинка сохранена</span> : null}
        </div>
      ) : null}
    </div>
  );

  const diaryCard = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      {variant === 'accordion' ? <button type="button" onClick={() => setPresentationExpanded((v) => !v)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: DIARY_ACCENT, fontWeight: 700, cursor: 'pointer' }}>Карточка дневника ▾</button> : null}
      {(variant === 'cabin' || presentationExpanded) && (
        <div style={{ display: 'grid', gap: 12, marginTop: variant === 'accordion' ? 12 : 0 }}>
          <button type="button" onClick={() => setPresentationText(buildPresentationText())} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>Создать карточку дневника</button>
          {presentationText ? <textarea readOnly value={presentationText} rows={10} className="w-input" /> : null}
          {presentationText ? <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="button" className="btn-secondary" onClick={onCopy}>Копировать</button><button type="button" className="btn-secondary" onClick={onTelegram}>Отправить в Telegram</button>{copyToast ? <span style={{ fontSize: 12, color: 'var(--cabin-neon-purple)' }}>Скопировано!</span> : null}{telegramToast ? <span style={{ fontSize: 12, color: 'var(--cabin-neon-purple)' }}>Открыт Telegram для отправки</span> : null}</div> : null}
        </div>
      )}
    </div>
  );

  const daySwitcher = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {dayKeys.map((d) => <button key={d} type="button" onClick={() => setDiaryDay(d)} className="btn-secondary" style={{ border: currentDay === d ? `1px solid ${DIARY_ACCENT}` : undefined }}>День {d}</button>)}
        <button type="button" className="btn-secondary" onClick={() => setDiaryDay((dayKeys.length ? Math.max(...dayKeys) : 0) + 1)}>+ День</button>
      </div>
    </div>
  );

  const diaryTab = <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}><div style={{ display: 'grid', gap: 16 }}><DiaryRow label="Утро" value={localMorningText} emoji={localMorningEmoji} onText={setLocalMorningText} onEmoji={setLocalMorningEmoji} /><DiaryRow label="День" value={localDayText} emoji={localDayEmoji} onText={setLocalDayText} onEmoji={setLocalDayEmoji} /><DiaryRow label="Вечер" value={localEveningText} emoji={localEveningEmoji} onText={setLocalEveningText} onEmoji={setLocalEveningEmoji} /><DiaryRow label="Чем запомнился день" value={localMemorableText} emoji={localMemorableEmoji} onText={setLocalMemorableText} onEmoji={setLocalMemorableEmoji} /></div>{variant === 'cabin' ? <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="button" className="btn-primary-gold" onClick={saveDiary}>Сохранить</button>{onNavigateToBadge ? <button type="button" className="btn-secondary" onClick={() => onNavigateToBadge('2.6')}>Требования значка 2.6</button> : null}</div> : null}</div>;
  const reflectionTab = <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}><div style={{ display: 'grid', gap: 12 }}><textarea className="w-input" placeholder="Что было важным сегодня?" rows={3} value={localMain} onChange={(e) => setLocalMain(e.target.value)} /><textarea className="w-input" placeholder="О ком из друзей хочется записать?" rows={3} value={localFriends} onChange={(e) => setLocalFriends(e.target.value)} /><textarea className="w-input" placeholder="Какие выводы сделал за день?" rows={3} value={localConclusions} onChange={(e) => setLocalConclusions(e.target.value)} /><button type="button" className="btn-secondary" onClick={() => (onScrollToInspector ? onScrollToInspector() : onNavigateToBadge?.('14.1'))}>{onScrollToInspector ? 'К миссиям Инспектора ↑' : 'Перейти к миссиям Инспектора'}</button></div>{variant === 'cabin' ? <button type="button" className="btn-primary-gold" style={{ marginTop: 12 }} onClick={saveDiary}>Сохранить</button> : null}</div>;

  const summary = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: variant === 'accordion' && isExpanded ? 20 : 12 }}>
      <div onClick={variant === 'accordion' ? () => setIsExpanded((v) => !v) : undefined} style={{ cursor: variant === 'accordion' ? 'pointer' : 'default', flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: DIARY_ACCENT, letterSpacing: '0.1em', marginBottom: 4 }}>Реальный Дневник</div>
        <h3 style={{ margin: 0, fontSize: 18 }}>{isShiftScheduleTab ? 'Беспорядок дня' : `День ${currentDay}`}</h3>
        {!isShiftScheduleTab && (variant === 'cabin' || !isExpanded) ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>День {currentDay}, записей: {entriesCountForPreview}</div> : null}
      </div>
      {variant === 'accordion' ? <button type="button" onClick={() => setIsExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: DIARY_ACCENT, fontSize: 20, cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</button> : null}
    </div>
  );

  if (variant === 'accordion') {
    return (
      <div className="real-diary-dashboard" style={{ background: DIARY_GRADIENT, borderRadius: 24, padding: 20, border: `1px solid ${mvpFilledCount === 3 ? DIARY_ACCENT : DIARY_ACCENT_LIGHT}`, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {summary}
        {isExpanded ? <div className="fade-in" style={{ display: 'grid', gap: 20 }}>{diaryCard}{daySwitcher}{diaryTab}{reflectionTab}{scheduleTab}<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="button" className="btn-primary-gold" onClick={saveDiary}>Сохранить</button>{onNavigateToBadge ? <button type="button" className="btn-secondary" onClick={() => onNavigateToBadge('2.6')}>Требования значка 2.6</button> : null}</div></div> : null}
      </div>
    );
  }

  const tabContent = activeTab === 'diary' ? diaryTab : activeTab === 'reflection' ? reflectionTab : activeTab === 'schedule' ? scheduleTab : diaryCard;
  return <div className="fade-in real-diary-cabin-content" style={{ display: 'grid', gap: 16 }}>{summary}{isShiftScheduleTab ? null : daySwitcher}{tabContent}</div>;
};
