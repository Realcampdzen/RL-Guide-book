import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserProgress } from '../hooks/useUserProgress';
import type { MyActivityKey, ShiftScheduleKey } from '../types/userProgress';
import { downloadBlob } from '../utils/socialGenerator';
import { ACTIVITY_ITEMS, hasValues, ScheduleCell, ScheduleItem, SHIFT_ITEMS } from '../utils/scheduleConstants';
import { ImageSourceBlock } from './ImageSourceBlock';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { useAuth } from '../context/AuthContext';

const DIARY_ACCENT = 'var(--amber-500)';
const DIARY_ACCENT_LIGHT = 'rgba(199, 119, 48, 0.25)';
const DIARY_GRADIENT = 'linear-gradient(135deg, rgba(199, 119, 48, 0.12) 0%, rgba(120, 53, 15, 0.18) 100%)';
const EMOJI_OPTIONS = [
  // Настроение
  '😊', '😁', '😂', '🥹', '😢', '😭', '😤', '😡', '🥺', '😩', '😪', '😴', '😌', '🤔', '🤩', '😎', '🥳', '🤗', '😶', '🙈',
  // Природа и погода
  '🌟', '⭐', '✨', '🌙', '☀️', '🌅', '🌈', '⚡', '🔥', '❄️', '🌊', '🌿', '🍃', '🌸', '🌺',
  // Активности
  '💪', '🏃', '🎯', '🏆', '🎉', '🎊', '🎶', '🎵', '🎸', '🎭', '🎨', '📚', '⚽', '🏊', '🤸',
  // Еда
  '🍕', '🍔', '🍦', '🍩', '🍫', '☕', '🧃', '🍉', '🍓', '🍒',
  // Сердца и жесты
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💝', '💫', '👍', '👏', '🙌', '🤝', '🫶',
  // Предметы и символы
  '📖', '✏️', '🎒', '🏕️', '🕯️', '🔑', '⚙️', '🧩', '💡', '🎁',
];

const DIARY_PLACEHOLDERS: Record<string, string> = {
  'Утро': 'Как проснулся? С кем начался день? Настрой на новый день…',
  'День': 'Что запомнилось днём? Интересные события, встречи, активности…',
  'Вечер': 'Как прошёл вечер? Чем завершился день? Огонёк, свечка, разговоры…',
  'Мем дня': 'Что тебя рассмешило или удивило? Смешной момент дня…',
  'Чем запомнился день': 'Один главный момент, который будешь помнить долго…',
};

const text = (v?: string) => (v || '').trim();

const DiaryRow: React.FC<{ label: string; value: string; emoji?: string; onText: (v: string) => void; onEmoji: (v: string) => void }> = ({ label, value, emoji, onText, onEmoji }) => {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const placeholder = DIARY_PLACEHOLDERS[label] ?? 'Что было?';
  const filteredEmoji = search.trim() ? EMOJI_OPTIONS.filter(em => em.includes(search)) : EMOJI_OPTIONS;

  return (
    <div style={{ display: 'grid', gap: 8, position: 'relative' }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</label>

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <textarea
          className="w-input real-diary-entry-textarea"
          value={value}
          onChange={(e) => onText(e.target.value)}
          rows={3}
          placeholder={placeholder}
          onClick={() => setPickerOpen(false)}
          style={{ flex: 1, minHeight: 80, borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(v => !v)}
          title="Выбрать эмодзи настроения"
          style={{
            width: 60, height: 'auto', minHeight: 80, borderRadius: 12, fontSize: 36,
            border: 'none', background: 'none',
            cursor: 'pointer', flexShrink: 0,
            transition: 'transform 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            filter: emoji ? 'none' : 'grayscale(0.3) opacity(0.5)',
          }}
        >
          {emoji || '🙂'}
        </button>
      </div>

      {pickerOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 300, marginTop: 4,
          background: 'rgba(6, 14, 30, 0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(93, 228, 255, 0.18)', borderRadius: 18,
          padding: 14, width: 280,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 24px rgba(93,228,255,0.08)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Настроение · {label}
          </div>
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%', marginBottom: 10, padding: '6px 12px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.07)', color: '#fff',
              fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {emoji && (
              <button type="button" onClick={() => { onEmoji(''); setPickerOpen(false); setSearch(''); }}
                style={{
                  width: '100%', padding: '4px 0', fontSize: 11,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >✕ Убрать эмодзи</button>
            )}
            {filteredEmoji.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => { onEmoji(emoji === em ? '' : em); setPickerOpen(false); setSearch(''); }}
                style={{
                  width: 38, height: 38, borderRadius: 10, fontSize: 22,
                  border: emoji === em ? `2px solid rgba(199,119,48,0.9)` : '1px solid rgba(255,255,255,0.1)',
                  background: emoji === em ? 'rgba(199,119,48,0.3)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'all 0.1s',
                  boxShadow: emoji === em ? '0 0 8px rgba(199,119,48,0.4)' : 'none',
                }}
              >{em}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export type RealDiaryTabId = 'diary' | 'reflection' | 'schedule' | 'diary-card' | 'photos';

interface RealDiaryDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: RealDiaryTabId;
  onTabChange?: (tab: RealDiaryTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
  onScrollToInspector?: () => void;
}

export const RealDiaryDashboard: React.FC<RealDiaryDashboardProps> = ({ variant = 'accordion', activeTab = 'diary', onTabChange, onNavigateToBadge, onScrollToInspector: _onScrollToInspector }) => {
  const { userData, updateDiaryEntry, updateDiaryShiftTemplates, setDiaryDay, updateDiaryPhotos } = useUserProgress();
  const { accessToken } = useAuth();
  const progress = userData.diaryProgress || { currentDay: 1, entries: {} };
  const entries = progress.entries;
  const currentDay = progress.currentDay;
  const currentEntry = entries[String(currentDay)] || {};

  const [isExpanded, setIsExpanded] = useState(false);
  const [localDayMoodEmoji, setLocalDayMoodEmoji] = useState((currentEntry as any).dayMoodEmoji ?? '');
  const [dayMoodPopover, setDayMoodPopover] = useState(false);
  const [presentationExpanded, setPresentationExpanded] = useState(false);
  const [_presentationText, setPresentationText] = useState('');
  // copyToast removed — was only used by deleted onCopy
  const [telegramToast, setTelegramToast] = useState(false);
  const [scheduleSavedToast, setScheduleSavedToast] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [cardSavedToast, setCardSavedToast] = useState(false);
  const [diarySavedToast, setDiarySavedToast] = useState<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [cardPhoto, setCardPhoto] = useState<string | null>(null);
  const [useCustomCardText, setUseCustomCardText] = useState(false);
  const [customMemorable, setCustomMemorable] = useState('');
  const [customConclusions, setCustomConclusions] = useState('');

  const [localMain, setLocalMain] = useState(currentEntry.mainMoments ?? '');
  const [localFriends, setLocalFriends] = useState(currentEntry.friends ?? '');
  const [localConclusions, setLocalConclusions] = useState(currentEntry.conclusions ?? '');
  const [localContribution, setLocalContribution] = useState((currentEntry as any).contribution ?? '');
  const [localMorningText, setLocalMorningText] = useState(currentEntry.morningText ?? '');
  const [localMorningEmoji, setLocalMorningEmoji] = useState(currentEntry.morningEmoji ?? '');
  const [localDayText, setLocalDayText] = useState(currentEntry.dayText ?? '');
  const [localDayEmoji, setLocalDayEmoji] = useState(currentEntry.dayEmoji ?? '');
  const [localEveningText, setLocalEveningText] = useState(currentEntry.eveningText ?? '');
  const [localEveningEmoji, setLocalEveningEmoji] = useState(currentEntry.eveningEmoji ?? '');
  const [localMemorableText, setLocalMemorableText] = useState(currentEntry.memorableText ?? '');
  const [localMemorableEmoji, setLocalMemorableEmoji] = useState(currentEntry.memorableEmoji ?? '');
  const [localMemeText, setLocalMemeText] = useState((currentEntry as any).memeText ?? '');
  const [localMemeEmoji, setLocalMemeEmoji] = useState((currentEntry as any).memeEmoji ?? '');

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
    setLocalContribution((e as any).contribution ?? '');
    setLocalMorningText(e.morningText ?? '');
    setLocalMorningEmoji(e.morningEmoji ?? '');
    setLocalDayText(e.dayText ?? '');
    setLocalDayEmoji(e.dayEmoji ?? '');
    setLocalEveningText(e.eveningText ?? '');
    setLocalEveningEmoji(e.eveningEmoji ?? '');
    setLocalMemorableText(e.memorableText ?? '');
    setLocalMemorableEmoji(e.memorableEmoji ?? '');
    setLocalMemeText((e as any).memeText ?? '');
    setLocalMemeEmoji((e as any).memeEmoji ?? '');
    setLocalDayMoodEmoji((e as any).dayMoodEmoji ?? '');
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

  const saveDiary = () => {
    updateDiaryEntry(currentDay, {
      mainMoments: text(localMain) || undefined,
      friends: text(localFriends) || undefined,
      conclusions: text(localConclusions) || undefined,
      contribution: text(localContribution) || undefined,
      morningText: text(localMorningText) || undefined,
      morningEmoji: text(localMorningEmoji) || undefined,
      dayText: text(localDayText) || undefined,
      dayEmoji: text(localDayEmoji) || undefined,
      eveningText: text(localEveningText) || undefined,
      eveningEmoji: text(localEveningEmoji) || undefined,
      memorableText: text(localMemorableText) || undefined,
      memorableEmoji: text(localMemorableEmoji) || undefined,
      memeText: text(localMemeText) || undefined,
      memeEmoji: text(localMemeEmoji) || undefined,
      dayMoodEmoji: text(localDayMoodEmoji) || undefined,
    });
    // Clear previous timers
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    // Show save confirmation
    const nextDay = currentDay + 1;
    setDiarySavedToast(nextDay);
    toastTimerRef.current = setTimeout(() => setDiarySavedToast(null), 4000);
    // Auto-advance to next day
    advanceTimerRef.current = setTimeout(() => setDiaryDay(nextDay), 600);
  };

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

  const generateDiaryCardImage = async () => {
    setGeneratingCard(true);
    try {
      const W = 1080;
      const H = 1920;
      const PAD = 56;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // --- load background image ---
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        const base = import.meta.env.BASE_URL || '/';
        img.src = `${base}realdiarypic.jpg`;
      });

      // --- draw background (cover-fit) ---
      const scale = Math.max(W / bgImg.width, H / bgImg.height);
      const sw = W / scale;
      const sh = H / scale;
      const sx = (bgImg.width - sw) / 2;
      const sy = (bgImg.height - sh) / 2;
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);

      // --- dark gradient overlay ---
      const overlay = ctx.createLinearGradient(0, 0, 0, H);
      overlay.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      overlay.addColorStop(0.35, 'rgba(0, 0, 0, 0.55)');
      overlay.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      // --- helpers ---
      const maxTextWidth = W - PAD * 2;
      const wrapLines = (txt: string, maxW: number): string[] => {
        const words = txt.split(/\s+/).filter(Boolean);
        if (!words.length) return [];
        const result: string[] = [];
        let line = '';
        for (const word of words) {
          const probe = line ? `${line} ${word}` : word;
          if (ctx.measureText(probe).width <= maxW) { line = probe; continue; }
          if (line) result.push(line);
          line = word;
        }
        if (line) result.push(line);
        return result;
      };
      const wrapTruncated = (txt: string, maxW: number, maxL: number): string[] => {
        const lines = wrapLines(txt, maxW);
        if (lines.length <= maxL) return lines;
        const truncated = lines.slice(0, maxL);
        truncated[maxL - 1] = truncated[maxL - 1].replace(/\s*\S*$/, '\u2026');
        return truncated;
      };

      // ===== LAYOUT =====
      let cursorY = 0;

      // --- user photo (upper ~50%) ---
      if (cardPhoto) {
        const userImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = cardPhoto;
        }).catch(() => null);

        if (userImg) {
          const photoH = Math.round(H * 0.50);
          const photoMargin = 40;
          const photoW = W - photoMargin * 2;
          const pScale = Math.max(photoW / userImg.width, photoH / userImg.height);
          const psw = photoW / pScale;
          const psh = photoH / pScale;
          const psx = (userImg.width - psw) / 2;
          const psy = (userImg.height - psh) / 2;

          // rounded clip
          const radius = 32;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(photoMargin + radius, photoMargin);
          ctx.arcTo(photoMargin + photoW, photoMargin, photoMargin + photoW, photoMargin + photoH, radius);
          ctx.arcTo(photoMargin + photoW, photoMargin + photoH, photoMargin, photoMargin + photoH, radius);
          ctx.arcTo(photoMargin, photoMargin + photoH, photoMargin, photoMargin, radius);
          ctx.arcTo(photoMargin, photoMargin, photoMargin + photoW, photoMargin, radius);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(userImg, psx, psy, psw, psh, photoMargin, photoMargin, photoW, photoH);
          ctx.restore();

          // subtle border
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(photoMargin + radius, photoMargin);
          ctx.arcTo(photoMargin + photoW, photoMargin, photoMargin + photoW, photoMargin + photoH, radius);
          ctx.arcTo(photoMargin + photoW, photoMargin + photoH, photoMargin, photoMargin + photoH, radius);
          ctx.arcTo(photoMargin, photoMargin + photoH, photoMargin, photoMargin, radius);
          ctx.arcTo(photoMargin, photoMargin, photoMargin + photoW, photoMargin, radius);
          ctx.closePath();
          ctx.stroke();

          cursorY = photoMargin + photoH + 80;
        }
      }

      // --- header ---
      if (cursorY === 0) cursorY = 120;
      ctx.fillStyle = '#f59e0b';
      ctx.font = '800 42px "Montserrat", "Segoe UI", sans-serif';
      ctx.fillText('\u0420\u0415\u0410\u041b\u042c\u041d\u042b\u0419 \u0414\u041d\u0415\u0412\u041d\u0418\u041a', PAD, cursorY);
      cursorY += 80;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 84px "Montserrat", "Segoe UI", sans-serif';
      ctx.fillText(`\u0414\u0435\u043d\u044c ${currentDay}`, PAD, cursorY);

      // --- squad name ---
      const squad = progress.squad || {};
      if (text(squad.name)) {
        cursorY += 56;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.font = '600 38px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText(`\u041e\u0442\u0440\u044f\u0434: ${text(squad.name)}`, PAD, cursorY);
      }

      // --- memorable moment ---
      const e = entries[String(currentDay)] || {};
      const valFont = '400 36px "Montserrat", "Segoe UI", sans-serif';
      const valLineH = 48;

      // Use custom text when toggle is on, otherwise diary data
      const cardMemorableText = useCustomCardText ? customMemorable.trim() : text(e.memorableText);
      const cardConclusionsText = useCustomCardText ? customConclusions.trim() : text(e.conclusions);

      if (cardMemorableText) {
        cursorY += 72;
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 40px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText('\u2b50 \u0427\u0435\u043c \u0437\u0430\u043f\u043e\u043c\u043d\u0438\u043b\u0441\u044f \u0434\u0435\u043d\u044c', PAD, cursorY);
        cursorY += 52;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = valFont;
        const memLines = wrapTruncated(cardMemorableText, maxTextWidth, 4);
        for (const ml of memLines) {
          ctx.fillText(ml, PAD, cursorY);
          cursorY += valLineH;
        }
      }

      // --- conclusions ---
      if (cardConclusionsText) {
        cursorY += 48;
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 40px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText('\ud83d\udca1 \u041a\u0430\u043a\u0438\u0435 \u0432\u044b\u0432\u043e\u0434\u044b \u0441\u0434\u0435\u043b\u0430\u043b', PAD, cursorY);
        cursorY += 52;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = valFont;
        const concLines = wrapTruncated(cardConclusionsText, maxTextWidth, 4);
        for (const cl of concLines) {
          ctx.fillText(cl, PAD, cursorY);
          cursorY += valLineH;
        }
      }

      // --- motto footer ---
      if (text(squad.motto)) {
        const mottoY = Math.max(cursorY + 56, H - 160);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(PAD, mottoY - 4, W - PAD * 2, 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.font = 'italic 600 34px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillText(`\u00ab${text(squad.motto)}\u00bb`, PAD, mottoY + 40);
      }

      // --- bottom branding ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '600 38px "Montserrat", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u0420\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u041b\u0430\u0433\u0435\u0440\u044c \u2022 \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0439\u043b\u0430\u0433\u0435\u0440\u044c.\u0440\u0444', W / 2, H - 50);
      ctx.textAlign = 'start';

      // --- export ---
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png', 0.95);
      });
      if (cardImageUrl) URL.revokeObjectURL(cardImageUrl);
      setCardImageUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Diary card generation failed', err);
      alert('Не удалось создать карточку');
    } finally {
      setGeneratingCard(false);
    }
  };


  const onTelegram = async () => {
    // Download the card image first
    if (cardImageUrl) {
      try {
        const res = await fetch(cardImageUrl);
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(0, 10);
        downloadBlob(blob, `дневник-день-${currentDay}-${stamp}.png`);
      } catch { /* ignore download error */ }
    }
    // Open Telegram with a short caption
    const caption = `📖 Реальный Дневник — День ${currentDay}`;
    window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(caption)}`, '_blank', 'noopener,noreferrer');
    setTelegramToast(true);
    setTimeout(() => setTelegramToast(false), 5000);
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
    <article className="cab-card fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{title}</h4>
        {editing ? (
          <button type="button" className="cab-btn-accent-sm" onClick={onSave} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
        ) : (
          <button type="button" className="cab-btn-glass" onClick={onEdit} style={{ padding: '8px 16px', fontSize: 13, minWidth: 'unset' }}>Изменить</button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 0 }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 100px 2fr', gap: 16, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 12 }}>
          <div>Пункт расписания</div>
          <div>Время</div>
          <div>Заметка</div>
        </div>

        {/* Rows */}
        <div style={{ display: 'grid', gap: 0 }}>
          {items.map(({ key, label }, index) => {
            const isLast = index === items.length - 1;
            return (
              <div key={String(key)} style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(120px, 1fr) 100px 2fr', 
                gap: 16, 
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
                {editing ? (
                  <>
                    <input className="cab-input" placeholder="00:00" style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center', background: 'rgba(255,255,255,0.03)' }} value={values[key]?.time || ''} onChange={(e) => onChange(key, 'time', e.target.value)} />
                    <input className="cab-input" placeholder="Что будем делать?" style={{ padding: '8px 12px', fontSize: 13, background: 'rgba(255,255,255,0.03)' }} value={values[key]?.note || ''} onChange={(e) => onChange(key, 'note', e.target.value)} />
                  </>
                ) : (
                  <>
                    <div style={{ color: 'var(--cabin-neon-cyan)', fontWeight: 600, fontSize: 14 }}>{text(values[key]?.time) || '—'}</div>
                    <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.4 }}>{text(values[key]?.note) || <span style={{ opacity: 0.3 }}>—</span>}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );

  const scheduleTab = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      <div style={{ display: 'grid', gap: 16 }}>
        {scheduleCard('План дня', SHIFT_ITEMS, localShift, editingShift, () => setEditingShift(true), saveShift, (k, f, v) => patchCell(setLocalShift, k, f, v))}
        {scheduleCard('Мои занятия (кружки/тренировки)', ACTIVITY_ITEMS, localActivities, editingActivities, () => setEditingActivities(true), saveActivities, (k, f, v) => patchCell(setLocalActivities, k, f, v))}
      </div>
      {canExportSchedules ? (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="cab-btn-glass" onClick={saveSchedulesToDevice} style={{ minWidth: 'unset', padding: '10px 20px' }}>Сохранить на устройство</button>
          {scheduleSavedToast ? <span style={{ fontSize: 13, color: 'var(--cabin-neon-cyan)' }}>Картинка сохранена</span> : null}
        </div>
      ) : null}
    </div>
  );

  const downloadCardImage = () => {
    if (!cardImageUrl) return;
    fetch(cardImageUrl).then(r => r.blob()).then(blob => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `дневник-день-${currentDay}-${stamp}.png`);
      setCardSavedToast(true);
      setTimeout(() => setCardSavedToast(false), 2400);
    });
  };

  const diaryCard = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      {variant === 'accordion' ? <button type="button" onClick={() => setPresentationExpanded((v) => !v)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: DIARY_ACCENT, fontWeight: 700, cursor: 'pointer' }}>Карточка дневника ▾</button> : null}
      {(variant === 'cabin' || presentationExpanded) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginTop: variant === 'accordion' ? 12 : 0,
        }}>
          {/* Cell A — Photo (left, may span rows if grid allows) */}
          <div className="cab-card fade-in" style={{
            gridRow: 'span 2',
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Фото для карточки</span>
            <ImageSourceBlock
              className="squad-corner-image-source-block"
              context="diary_photo"
              value={cardPhoto}
              onChange={(url) => setCardPhoto(url)}
              aspect="9:16"
              buttonLayout="bento"
              labels={{ placeholder: 'Сэлфи или фото дня', upload: 'Загрузить фото', uploadReplace: 'Изменить фото', generate: 'Сгенерировать с ИИ', process: 'Обработать с ИИ', generateModalTitle: 'Сгенерировать фото для карточки', generateModalDescription: 'ИИ создаст изображение для твоей карточки дневника.' }}
              onGenerate={async (o) => requestImageGenerate({ mode: 'generate', context: 'diary_card', prompt: o.prompt ?? '' }, accessToken ?? null)}
              onProcess={async (imageBase64, o) => requestImageGenerate({ mode: 'process', context: 'diary_card', imageBase64, prompt: o?.prompt ?? '' }, accessToken ?? null)}
            />
          </div>

          {/* Cell B — Custom text toggle (right top) */}
          <div className="cab-card fade-in" style={{
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#fff' }}>
              <span
                role="switch"
                aria-checked={useCustomCardText}
                onClick={() => setUseCustomCardText(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
                  background: useCustomCardText ? 'var(--cabin-neon-cyan)' : 'rgba(255,255,255,0.15)',
                  transition: 'background .2s', cursor: 'pointer',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: useCustomCardText ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </span>
              Свой текст
            </label>
            {!useCustomCardText && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Тексты из дневника и рефлексии
              </span>
            )}
            {useCustomCardText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                  className="cab-input"
                  placeholder="Чем запомнился день"
                  value={customMemorable}
                  onChange={(ev) => setCustomMemorable(ev.target.value)}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
                <textarea
                  className="cab-input"
                  placeholder="Какие выводы сделал"
                  value={customConclusions}
                  onChange={(ev) => setCustomConclusions(ev.target.value)}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}
          </div>

          {/* Cell C — Generate button (right bottom) */}
          <div className="cab-card fade-in" style={{
            padding: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <button
              type="button"
              onClick={() => { generateDiaryCardImage(); setPresentationText(buildPresentationText()); }}
              className="cab-btn-accent"
              disabled={generatingCard}
              style={{ width: '100%', opacity: generatingCard ? 0.6 : 1, padding: '14px 24px', fontSize: 14 }}
            >
              {generatingCard ? 'Генерация...' : 'Создать карточку'}
            </button>
          </div>

          {/* Cell D — Result preview (full width) */}
          {cardImageUrl && (
            <div className="cab-card fade-in" style={{
              gridColumn: '1 / -1',
              padding: 24,
              display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center',
            }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: 320, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <img src={cardImageUrl} alt="Карточка дневника" style={{ width: '100%', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="cab-btn-glass" onClick={downloadCardImage} style={{ minWidth: 'unset', padding: '10px 20px' }}>Сохранить на устройство</button>
                <button type="button" className="cab-btn-glass" onClick={onTelegram} style={{ minWidth: 'unset', padding: '10px 20px', color: '#c4b5fd', borderColor: 'rgba(196, 181, 253, 0.3)' }}>Отправить в Telegram</button>
                {cardSavedToast && <span style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--cabin-neon-cyan)', marginTop: 8 }}>Картинка сохранена!</span>}
                {telegramToast && <span style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--cabin-neon-purple)', marginTop: 8 }}>Картинка скачана — прикрепи в чат</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const daySwitcher = (
    <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}>
      <div className="real-diary-day-switcher" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        {dayKeys.map((d) => {
          const dayEntry = entries[String(d)] || {};
          const moodEmoji = (dayEntry as any).dayMoodEmoji || '';
          const hasContent = dayEntry.morningText || dayEntry.dayText || dayEntry.eveningText || dayEntry.memorableText;
          const isActive = currentDay === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDiaryDay(d)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '8px 14px 6px',
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                minWidth: 54, cursor: 'pointer', fontFamily: 'inherit',
                border: isActive
                  ? `2px solid rgba(199, 119, 48, 0.8)`
                  : '1.5px solid rgba(255,255,255,0.18)',
                borderBottom: 'none',
                borderRadius: '10px 10px 0 0',
                background: isActive
                  ? 'linear-gradient(160deg, rgba(199, 119, 48, 0.4) 0%, rgba(120, 53, 15, 0.5) 100%)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: isActive ? '#fde68a' : 'rgba(255,255,255,0.75)',
                boxShadow: isActive ? '0 -4px 12px rgba(199,119,48,0.2)' : 'none',
                transition: 'all 0.15s',
                position: 'relative',
                marginBottom: isActive ? -1 : 0,
              }}
            >
              {moodEmoji ? <span style={{ fontSize: 16, lineHeight: 1 }}>{moodEmoji}</span> : hasContent ? <span style={{ fontSize: 10, opacity: 0.6, color: '#fde68a' }}>●</span> : null}
              <span>День {d}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setDiaryDay((dayKeys.length ? Math.max(...dayKeys) : 0) + 1)}
          style={{
            padding: '8px 14px 6px',
            fontSize: 12, fontWeight: 500, minWidth: 54, cursor: 'pointer', fontFamily: 'inherit',
            border: '1.5px dashed rgba(255,255,255,0.2)', borderBottom: 'none',
            borderRadius: '10px 10px 0 0',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.45)', transition: 'all 0.15s',
          }}
        >+ День</button>
      </div>
      <div style={{ height: 2, background: `linear-gradient(to right, ${DIARY_ACCENT_LIGHT}, transparent 80%)`, marginBottom: 12, borderRadius: 2, marginTop: -14 }} />
    </div>
  );

  const floatingToast = diarySavedToast !== null ? createPortal(
    <div key="diary-save-toast" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10200, pointerEvents: 'none', opacity: 1, animation: 'diary-toast-fade 4s ease-out forwards' }}>
      <style>{`@keyframes diary-toast-fade { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }`}</style>
      <div style={{ padding: '18px 36px', borderRadius: 20, background: 'rgba(8, 20, 40, 0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(93, 228, 255, 0.25)', boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(93, 228, 255, 0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#4ade80', fontSize: 22 }}>✓</span>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>Сохранено!</span>
      </div>
    </div>,
    document.body
  ) : null;

  const diaryTab = <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}><article className="cab-card fade-in" style={{ padding: 24 }}><div style={{ display: 'grid', gap: 16 }}><DiaryRow label="Утро" value={localMorningText} emoji={localMorningEmoji} onText={setLocalMorningText} onEmoji={setLocalMorningEmoji} /><DiaryRow label="День" value={localDayText} emoji={localDayEmoji} onText={setLocalDayText} onEmoji={setLocalDayEmoji} /><DiaryRow label="Вечер" value={localEveningText} emoji={localEveningEmoji} onText={setLocalEveningText} onEmoji={setLocalEveningEmoji} /><DiaryRow label="Мем дня" value={localMemeText} emoji={localMemeEmoji} onText={setLocalMemeText} onEmoji={setLocalMemeEmoji} /><DiaryRow label="Чем запомнился день" value={localMemorableText} emoji={localMemorableEmoji} onText={setLocalMemorableText} onEmoji={setLocalMemorableEmoji} /></div>{variant === 'cabin' ? <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="button" className="cab-btn-accent" onClick={saveDiary} style={{ padding: '12px 32px' }}>Сохранить</button></div> : null}</article></div>;
  const reflectionTab = <div className={sectionClass} style={variant === 'accordion' ? sectionWrapStyle : {}}><article className="cab-card fade-in" style={{ padding: 24 }}><div style={{ display: 'grid', gap: 20 }}><div style={{ display: 'grid', gap: 8 }}><label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>Что хорошего я сделал(а) сегодня?</label><textarea className="cab-input" placeholder="Любое доброе дело, помощь, поступок…" rows={3} style={{ resize: 'vertical' }} value={localMain} onChange={(e) => setLocalMain(e.target.value)} /></div><div style={{ display: 'grid', gap: 8 }}><label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>За что я могу себя похвалить?</label><textarea className="cab-input" placeholder="Чем ты можешь гордиться — пусть даже мелочью…" rows={3} style={{ resize: 'vertical' }} value={localFriends} onChange={(e) => setLocalFriends(e.target.value)} /></div><div style={{ display: 'grid', gap: 8 }}><label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>Чем я горжусь сегодня?</label><textarea className="cab-input" placeholder="Момент, достижение или решение, которым гордишься…" rows={3} style={{ resize: 'vertical' }} value={localConclusions} onChange={(e) => setLocalConclusions(e.target.value)} /></div><div style={{ display: 'grid', gap: 8 }}><label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>Мой вклад в наш отряд сегодня</label><textarea className="cab-input" placeholder="Что я сделал(а) для ребят, для нашей команды…" rows={3} style={{ resize: 'vertical' }} value={localContribution} onChange={(e) => setLocalContribution(e.target.value)} /></div></div>{variant === 'cabin' ? <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}><button type="button" className="cab-btn-accent" onClick={saveDiary} style={{ padding: '12px 32px' }}>Сохранить</button></div> : null}</article></div>;

  const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const campStartDate = new Date('2026-06-01'); // placeholder; diary days are relative
  const dayDate = new Date(campStartDate.getTime() + (currentDay - 1) * 86400000);
  const weekday = weekdayNames[dayDate.getDay()];

  const summary = isShiftScheduleTab ? null : (
    <div style={{ marginBottom: variant === 'accordion' && isExpanded ? 20 : 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div onClick={variant === 'accordion' ? () => setIsExpanded((v) => !v) : undefined} style={{ cursor: variant === 'accordion' ? 'pointer' : 'default', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: DIARY_ACCENT, letterSpacing: '0.1em', marginBottom: 4 }}>Реальный Дневник</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{`День ${currentDay}`}</h3>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{weekday} · {entriesCountForPreview > 0 ? `${entriesCountForPreview} ${entriesCountForPreview === 1 ? 'запись' : 'записей'}` : 'пусто'}</span>
          </div>
        </div>
        {/* Day mood picker */}
        {variant === 'cabin' && (
          <div style={{ position: 'relative', flexShrink: 0, marginLeft: 12 }}>
            <button
              type="button"
              onClick={() => setDayMoodPopover(v => !v)}
              title="Настроение дня"
              style={{
                width: 52, height: 52, borderRadius: 16, fontSize: 28,
                border: localDayMoodEmoji ? `2px solid ${DIARY_ACCENT}` : '1.5px solid rgba(255,255,255,0.15)',
                background: localDayMoodEmoji ? DIARY_ACCENT_LIGHT : 'rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {localDayMoodEmoji || '☀️'}
            </button>
            {dayMoodPopover && (
              <div style={{
                position: 'absolute', top: 58, right: 0, zIndex: 300,
                background: 'rgba(8, 20, 40, 0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(93, 228, 255, 0.2)', borderRadius: 16,
                padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6, width: 220,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}>
                <div style={{ width: '100%', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Настроение дня</div>
                {localDayMoodEmoji && (
                  <button type="button" onClick={() => { setLocalDayMoodEmoji(''); setDayMoodPopover(false); }}
                    style={{ width: '100%', padding: '4px 0', fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >Убрать</button>
                )}
                {EMOJI_OPTIONS.map((em) => (
                  <button key={em} type="button"
                    onClick={() => { setLocalDayMoodEmoji(em); setDayMoodPopover(false); }}
                    style={{
                      width: 38, height: 38, borderRadius: 10, fontSize: 22,
                      border: localDayMoodEmoji === em ? `2px solid ${DIARY_ACCENT}` : '1px solid rgba(255,255,255,0.1)',
                      background: localDayMoodEmoji === em ? DIARY_ACCENT_LIGHT : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                    }}
                  >{em}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {variant === 'accordion' ? <button type="button" onClick={() => setIsExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: DIARY_ACCENT, fontSize: 20, cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</button> : null}
      </div>
    </div>
  );

  if (variant === 'accordion') {
    return (
      <div className="real-diary-dashboard" style={{ background: DIARY_GRADIENT, borderRadius: 24, padding: 20, border: `1px solid ${mvpFilledCount === 3 ? DIARY_ACCENT : DIARY_ACCENT_LIGHT}`, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {summary}
        {isExpanded ? <div className="fade-in" style={{ display: 'grid', gap: 20 }}>{diaryCard}{daySwitcher}{diaryTab}{reflectionTab}{scheduleTab}<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}><button type="button" className="cab-btn-accent" onClick={saveDiary} style={{ padding: '12px 32px' }}>Сохранить</button>{onNavigateToBadge ? <button type="button" className="cab-btn-glass" onClick={() => onNavigateToBadge('2.6')} style={{ padding: '12px 24px', minWidth: 'unset' }}>Требования значка 2.6</button> : null}</div></div> : null}
        {floatingToast}
      </div>
    );
  }

  const DIARY_PHOTO_SLOTS = [
    { key: 'topMoment', label: 'Топ момент', description: 'Лучший момент смены — то, что запомнилось больше всего' },
    { key: 'ourSquad', label: 'Наш Отряд', description: 'Общее фото вашего отряда' },
    { key: 'withCounselors', label: 'Фото с Вожатыми', description: 'Фото с вашими вожатыми' },
    { key: 'withFriends', label: 'Фото с друзьями', description: 'Фото с друзьями из лагеря' },
  ];
  const diaryPhotos = progress.photos || {};

  const photosTab = (
    <div className={sectionClass}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {DIARY_PHOTO_SLOTS.map(({ key, label, description }) => {
          const photoUrl = diaryPhotos[key];
          return (
            <article key={key} className="cab-card fade-in" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image Preview Block - Premium 4:3 Aspect Ratio */}
              <div style={{
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.2)',
                border: '1px dashed rgba(255,255,255,0.15)',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {photoUrl ? (
                  <img src={photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.35 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C18.5304 20 19.0391 19.7893 19.4142 19.4142C19.7893 19.0391 20 18.5304 20 18V6C20 5.46957 19.7893 4.96086 19.4142 4.58579C19.0391 4.21071 18.5304 4 18 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20Z"/></svg>
                    <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>{label}</h4>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>{description}</p>
              </div>

              {/* Upload Button */}
              <div style={{ marginTop: 'auto' }}>
                <ImageSourceBlock
                  className="squad-corner-image-source-block"
                  context="diary_photo"
                  value={photoUrl || null}
                  onChange={(url) => updateDiaryPhotos({ [key]: url || undefined })}
                  hidePreview={true}
                  buttonLayout="column"
                  labels={{ placeholder: label, upload: 'Добавить фото', uploadReplace: 'Изменить фото' }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const tabContent = activeTab === 'diary' ? diaryTab : activeTab === 'reflection' ? reflectionTab : activeTab === 'schedule' ? scheduleTab : activeTab === 'photos' ? photosTab : diaryCard;
  const wrappedTab = <div key={activeTab}>{tabContent}</div>;
  return <div className="real-diary-cabin-content" style={{ display: 'grid', gap: 16, paddingBottom: 120 }}>{summary}{isShiftScheduleTab ? null : daySwitcher}{wrappedTab}{floatingToast}</div>;
};
