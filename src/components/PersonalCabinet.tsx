import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useDataLoader } from '../hooks/useDataLoader';
import { useUserProgress } from '../hooks/useUserProgress';
import type { UserRole } from '../types/authRole';
import { canModerateBadgeApprovals } from '../types/authRole';
import type { InspectorTabId } from '../types/inspector';
import { getRank } from '../types/userProgress';
import { syncAuthProfile } from '../utils/authProfileApi';
import { fetchMyPassport } from '../utils/broApi';
import { markdownToHtmlWithHeadingIds, parseMarkdownToc } from '../utils/markdown';
import { supabase } from '../utils/supabaseClient';
import { AdminDashboard } from './AdminDashboard';
import BadgeIcon from './BadgeIcon';
import { CampProgramByDays } from './CampProgramByDays';
import { CouncilDashboard, type CouncilTabId } from './CouncilDashboard';
import { CounselorSquadDashboard, type CounselorSquadTabId } from './CounselorSquadDashboard';
import { InspectorCabinetPanel } from './InspectorCabinetPanel';
import { InspectorDashboard } from './InspectorDashboard';
import { Profile4KDashboard, type Profile4KTabId } from './Profile4KDashboard';
import { BroDashboard } from './personal-cabinet/containers/BroDashboard';
import { EventsDashboard } from './personal-cabinet/containers/EventsDashboard';
import { ProfileSettingsContainer } from './personal-cabinet/containers/ProfileSettingsContainer';
import { ProgressionHubContainer } from './personal-cabinet/containers/ProgressionHubContainer';
import { SquadCornerContainer } from './personal-cabinet/containers/SquadCornerContainer';
import { VozhatifikatorDashboard } from './personal-cabinet/containers/VozhatifikatorDashboard';
import { WorkshopDashboard } from './personal-cabinet/containers/WorkshopDashboard';
import { ShareContainer } from './profile/containers/ShareContainer';
import { useSquadData } from './personal-cabinet/hooks/useSquadData';
import { RealDiaryDashboard, type RealDiaryTabId } from './RealDiaryDashboard';
import { type RoleFlowResult, RoleSelectionModal } from './RoleSelectionModal';
import { ShiftsAndSquadsDashboard } from './ShiftsAndSquadsDashboard';
import { TeamDashboard, type TeamTabId } from './TeamDashboard';
import '../styles/additional-material.css';
import '../styles/cabinet-carousel.css';
import '../styles/cabinet-tokens.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId =
  | 'home' // Главная (паспорт, путь)
  | 'squad-corner' // Отрядный уголок
  | 'diary' // Реальный дневник
  | 'engine' // Движок
  | 'council' // Совет лагеря
  | 'bro' // БРО
  | 'workshop' // Мастерская
  | 'counselor-squad' // Вожатский отряд
  | 'vozhatifikator' // Вожатификатор
  | 'profile4k' // 4К

  | 'admin' // Пульт управления
  | 'inspector' // Инспектор Пользы
  | 'shifts' // Смены и Отряды
  | 'share' // Поделиться
  | 'events' // События (подтверждения, планы)
  | 'parents'; // Для родителей

interface SidebarSection {
  id: SectionId;
  label: string;
  group: 'main' | 'staff' | 'system';
  roles?: UserRole[]; // if specified, only these roles see it
  minRole?: boolean; // requires non-traveler
}

type MobileDrawerLevel = 'sections' | 'tabs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

const SECTIONS: SidebarSection[] = [
  // Main sections
  { id: 'home', label: 'Главная', group: 'main' },
  { id: 'squad-corner', label: 'Мой отряд', group: 'main', minRole: true },
  { id: 'diary', label: 'Реальный дневник', group: 'main' },
  { id: 'engine', label: 'Движок', group: 'main' },
  { id: 'council', label: 'Совет лагеря', group: 'main' },
  { id: 'bro', label: 'БРО', group: 'main', minRole: true },
  { id: 'workshop', label: 'Мастерская', group: 'main' },
  { id: 'vozhatifikator', label: 'Вожатификатор', group: 'main' },
  { id: 'inspector', label: 'Инспектор Пользы', group: 'main' },
  { id: 'events', label: 'События', group: 'main' },
  { id: 'share', label: 'Поделиться', group: 'main' },
  // Staff sections
  {
    id: 'shifts',
    label: 'Смены и Отряды',
    group: 'staff',
    roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'],
  },
  {
    id: 'counselor-squad',
    label: 'Вожатский отряд',
    group: 'staff',
    roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'],
  },
  { id: 'profile4k', label: '4К', group: 'staff' },

  { id: 'parents', label: 'Для родителей', group: 'staff', roles: ['parent', 'developer'] },
  // System
  {
    id: 'admin',
    label: 'Пульт управления',
    group: 'system',
    roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'],
  },
];

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  traveler: { label: 'Путешественник', color: '#8B5CF6' },
  participant: { label: 'Участник', color: '#6B7280' },
  counselor: { label: 'Вожатый', color: '#22C55E' },
  educator: { label: 'Педагог', color: '#A855F7' },
  shift_leader: { label: 'Ст. Вожатый', color: '#F59E0B' },
  camp_director: { label: 'Директор', color: '#EF4444' },
  parent: { label: 'Родитель', color: '#3B82F6' },
  developer: { label: 'Разработчик', color: '#06B6D4' },
};

type TabDef = {
  id: string;
  label: string;
  icon?: string;
  isDivider?: boolean;
  editorOnly?: boolean;
  staffOnly?: boolean;
};
const SECTION_TABS: Partial<Record<SectionId, TabDef[]>> = {
  home: [
    { id: 'active', label: 'В пути' },
    { id: 'favorites', label: 'Избранное' },
    { id: 'collection', label: 'Коллекция' },
    { id: 'journal', label: 'Журнал' },
    { id: 'squads', label: 'Смены и отряды' },
  ],
  'squad-corner': [
    { id: 'squad', label: 'Отрядный Уголок' },
    { id: 'chat', label: 'Чат' },
    { id: 'schedule', label: 'Беспорядок дня' },
    { id: 'program', label: 'Программа смены' },
    { id: 'photos', label: 'Фото', editorOnly: true },
    { id: 'planner', label: 'Планёрка', editorOnly: true },
    { id: 'flag-badges', label: 'Значки на флаг' },
  ] as any,
  diary: [
    { id: 'diary', label: 'Дневник' },
    { id: 'reflection', label: 'Рефлексия' },
    { id: 'photos', label: 'Фото' },
    { id: 'calendar', label: 'Сторис' },
  ],
  engine: [
    { id: 'my-engines', label: 'Мои Движки' },
    { id: 'engine', label: 'Движок' },
    { id: 'engine-project', label: 'Проект' },
    { id: 'engine-plan', label: 'План' },
    { id: 'engine-path', label: 'Путь' },
    { id: 'engine-chat', label: 'Чат' },
    { id: 'camp-control', label: 'Инициативы' },
    { id: 'ode', label: 'ОДэ Генератор' },
    { id: 'engine-create', label: 'Создать' },
  ],
  council: [
    { id: 'council', label: 'Совет' },
    { id: 'camp-management', label: 'Инициативы' },
    { id: 'engines', label: 'Движки' },
    { id: 'management', label: 'Управление', staffOnly: true },
    { id: 'badge', label: 'Значок' },
  ] as any,
  bro: [
    { id: 'initiation', label: 'Бросвящение' },
    { id: 'wing', label: 'Крыло' },
    { id: 'brodela', label: 'Бродела' },
    { id: 'ode', label: 'ОДэ Генератор' },
    { id: 'brosquad', label: 'Броотряд' },
    { id: 'chat', label: 'Чат' },
    { id: 'constructor', label: 'Создать Посвящение' },
  ],
  workshop: [
    { id: 'constructor', label: 'Конструктор' },
    { id: 'arts', label: 'Арты' },
    { id: 'my', label: 'Мои проекты' },
    { id: 'community', label: 'Сообщество' },
  ],
  share: [
    { id: 'invite', label: 'Пригласить друзей' },
    { id: 'qr', label: 'QR-код путеводителя' },
    { id: 'progress', label: 'Карточки прогресса' },
  ],
  parents: [
    { id: 'program', label: 'Программа' },
    { id: 'squad', label: 'Отряд' },
    { id: 'child', label: 'Мой ребёнок' },
    { id: 'contacts', label: 'Контакты' },
  ],
  profile4k: [{ id: 'skills', label: 'Навыки' }],
  events: [
    { id: 'requests', label: 'Мои заявки' },
    { id: 'announcements', label: 'Объявления' },
    { id: 'tasks', label: 'Задания' },
  ],
  vozhatifikator: [
    { id: 'book', label: 'Книга (2013–19)' },
    { id: 'lights', label: 'Путеводные огни' },
    { id: 'era-19-21', label: 'Эпоха 2019–2021' },
    { id: 'era-21-23', label: 'Эпоха 2021–2023' },
    { id: 'era-23-26', label: 'Эпоха 2023–2026' },
    { id: 'bad-advice', label: 'Вредные советы директору лагеря' },
  ],
  inspector: [
    { id: 'cabinet', label: 'Кабинет' },
    { id: 'div-1', label: '', isDivider: true },
    { id: 'friendship', label: 'Дружба' },
    { id: 'politeness', label: 'Вежливость' },
    { id: 'comfort', label: 'Уют' },
    { id: 'help', label: 'Помощь' },
    { id: 'involvement', label: 'Вовлечение' },
    { id: 'peacemaker', label: 'Спокойствие' },
    { id: 'mood', label: 'Настроение' },
    { id: 'chief', label: 'Главный' },
    { id: 'div-2', label: '', isDivider: true },
    { id: 'badges', label: 'Линейка значков' },
    { id: 'intro-doc', label: 'Введение' },
    { id: 'methodology-doc', label: 'Методика' },
    { id: 'active-checklist-doc', label: 'Активный чек-лист' },
  ],
};

// ---------------------------------------------------------------------------
// Section content stub cards
// ---------------------------------------------------------------------------

const SECTION_INFO: Record<SectionId, { title: string; description: string; emoji: string }> = {
  home: {
    title: 'Главная',
    description: 'Паспорт значков, карта путешественника, избранное и коллекция',
    emoji: '',
  },
  'squad-corner': {
    title: 'Мой отряд',
    description: 'Кабинет отряда, фото, планёрка, значки на флаг',
    emoji: '',
  },
  diary: {
    title: 'Реальный дневник',
    description: 'Ежедневные записи, рефлексия, впечатления от лагеря',
    emoji: '',
  },
  engine: {
    title: 'Движок',
    description: 'Движки для развития — предлагай, голосуй, запускай!',
    emoji: '',
  },
  council: {
    title: 'Совет лагеря',
    description: 'Инициативы, голосования, решения совета',
    emoji: '',
  },
  bro: {
    title: 'БРО',
    description: 'Посвящение в БРО, крыло — сообщество активных участников',
    emoji: '',
  },
  workshop: {
    title: 'Мастерская',
    description: 'Кузница Смыслов, идеи значков, ревью, арты сообщества',
    emoji: '',
  },
  'counselor-squad': {
    title: 'Вожатский отряд',
    description: 'Управление отрядом, карточка, программа',
    emoji: '',
  },
  vozhatifikator: {
    title: 'Вожатификатор',
    description: 'Чек-лист подготовки вожатого, документы',
    emoji: '',
  },
  profile4k: {
    title: '4К',
    description:
      'Четыре ключевых компетенции: критическое мышление, коммуникация, коллаборация, креативность',
    emoji: '',
  },

  inspector: {
    title: 'Инспектор Пользы',
    description: 'Ежедневные миссии, продвижение по пути пользы',
    emoji: '',
  },
  shifts: {
    title: 'Смены и Отряды',
    description: 'Управление сменами, создание отрядов, коды вступления',
    emoji: '',
  },
  share: {
    title: 'Поделиться',
    description: 'Пригласи друзей, поделись QR-кодом путеводителя',
    emoji: '',
  },
  events: { title: 'События', description: 'Подтверждения значков, проверка планов', emoji: '' },
  parents: {
    title: 'Для родителей',
    description: 'Информация о смене, программа по дням',
    emoji: '',
  },
  admin: {
    title: 'Пульт управления',
    description: 'Входящие запросы, генерация кодов. Панель разработчика.',
    emoji: '',
  },
};

// ---------------------------------------------------------------------------
// Carousel constants (match production)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Markdown document tab viewer (for Inspector reference materials)
// ---------------------------------------------------------------------------

const MarkdownDocTab: React.FC<{ title: string; mdPath: string }> = ({ title, mdPath }) => {
  const [html, setHtml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(mdPath)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((md) => {
        if (cancelled) return;
        const toc = parseMarkdownToc(md);
        const rendered = markdownToHtmlWithHeadingIds(md, toc);
        setHtml(rendered);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mdPath]);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Glass card wrapper */}
      <div
        style={{
          background: 'rgba(8, 20, 40, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#e8f0ff',
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </h3>
        </div>

        {/* Content area */}
        <div style={{ padding: '4px 8px 16px' }}>
          {loading && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 13,
              }}
            >
              Загрузка документа…
            </div>
          )}
          {error && (
            <div style={{ padding: 28, textAlign: 'center', color: '#f87171', fontSize: 13 }}>
              Не удалось загрузить: {error}
            </div>
          )}
          {html && (
            <div
              className="additional-material-prose"
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                borderRadius: 0,
                padding: '16px 20px',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components for Parents section (М20-PARENT-SQUAD)
// ---------------------------------------------------------------------------

interface SquadJoinTabProps {
  accessToken: string;
  nickname: string;
}
const SquadJoinTab: React.FC<SquadJoinTabProps> = ({ accessToken, nickname }) => {
  const [squadCode, setSquadCode] = useState('');
  const [squadPreview, setSquadPreview] = useState<null | {
    squadId: string;
    squadName: string;
    shiftName?: string;
    shiftId?: string;
  }>(null);
  const [lookupErr, setLookupErr] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinResult, setJoinResult] = useState<null | string>(null);

  const apiBase =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? (
          (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') as string
        ).replace(/\/$/, '')
      : '';
  const authHeaders: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const lookupCode = async () => {
    const c = squadCode.trim().toUpperCase();
    if (!c) return;
    setLookupLoading(true);
    setLookupErr('');
    setSquadPreview(null);
    try {
      const r = await fetch(`${apiBase}/api/squads/by-invite-code?code=${encodeURIComponent(c)}`, {
        headers: authHeaders,
      });
      if (!r.ok) {
        setLookupErr('Код не найден или недействителен');
        return;
      }
      const d = await r.json();
      setSquadPreview({
        squadId: d.squadId,
        squadName: d.squadName,
        shiftId: d.shiftId,
        shiftName: d.shiftName,
      });
    } catch {
      setLookupErr('Ошибка соединения');
    } finally {
      setLookupLoading(false);
    }
  };

  const joinSquad = async () => {
    if (!squadPreview) return;
    setJoinLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/squads/join-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ code: squadCode.trim().toUpperCase(), nickname }),
      });
      const d = await r.json();
      if (!r.ok) {
        setLookupErr(d.error || 'Ошибка вступления');
      } else {
        setJoinResult(
          d.status === 'already_member'
            ? 'Вы уже состоите в этом отряде'
            : `Вы вступили в отряд «${squadPreview.squadName}»!`
        );
        setSquadPreview(null);
        setSquadCode('');
      }
    } catch {
      setLookupErr('Ошибка соединения');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        background: 'rgba(8, 20, 40, 0.15)',
        border: '1px solid rgba(93, 228, 255, 0.12)',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e8f0ff' }}>Вступить в отряд</h3>
      <p
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          margin: '0 0 20px',
          lineHeight: 1.6,
        }}
      >
        Введите код-приглашение, который вам дал вожатый или старший вожатый.
      </p>
      {joinResult && (
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#4ade80',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {joinResult}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={squadCode}
          onChange={(e) => setSquadCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && void lookupCode()}
          placeholder="Код-приглашение (8 символов)"
          maxLength={8}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: '#e8f0ff',
            fontSize: 14,
            fontFamily: 'inherit',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        />
        <button
          type="button"
          disabled={!squadCode.trim() || lookupLoading}
          onClick={() => void lookupCode()}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(93,228,255,0.15)',
            border: '1px solid rgba(93,228,255,0.25)',
            color: '#5de4ff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {lookupLoading ? '...' : 'Найти'}
        </button>
      </div>
      {lookupErr && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.2)',
            color: '#ff6b6b',
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {lookupErr}
        </div>
      )}
      {squadPreview && (
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            background: 'rgba(93,228,255,0.06)',
            border: '1px solid rgba(93,228,255,0.2)',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            Найден отряд
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8f0ff', marginBottom: 4 }}>
            {squadPreview.squadName}
          </div>
          {squadPreview.shiftName && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Смена: {squadPreview.shiftName}
            </div>
          )}
          <button
            type="button"
            disabled={joinLoading}
            onClick={() => void joinSquad()}
            style={{
              marginTop: 14,
              padding: '10px 20px',
              borderRadius: 10,
              background: 'rgba(93,228,255,0.18)',
              border: '1px solid rgba(93,228,255,0.3)',
              color: '#5de4ff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
            }}
          >
            {joinLoading ? 'Вступаем...' : `Вступить в отряд «${squadPreview.squadName}»`}
          </button>
        </div>
      )}
    </div>
  );
};

interface ChildLinksTabProps {
  accessToken: string;
}
const ChildLinksTab: React.FC<ChildLinksTabProps> = ({ accessToken }) => {
  const [childLinks, setChildLinks] = useState<
    Array<{
      id: string;
      childDeviceId: string;
      parentDeviceId: string;
      label?: string;
      createdAt: string;
    }>
  >([]);
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [childIdInput, setChildIdInput] = useState('');
  const [childLabelInput, setChildLabelInput] = useState('');
  const [linkErr, setLinkErr] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [childSnapshot, setChildSnapshot] = useState<null | {
    progress: Record<string, { status: string }>;
    exportedAt: string;
  }>(null);
  const [snapshotErr, setSnapshotErr] = useState('');

  const apiBase =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? (
          (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') as string
        ).replace(/\/$/, '')
      : '';
  const authHeaders: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  useEffect(() => {
    if (linksLoaded || !accessToken) return;
    setLinksLoaded(true);
    fetch(`${apiBase}/api/family/links`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((d: { links: typeof childLinks }) => setChildLinks(d.links || []))
      .catch(() => {});
  }, [linksLoaded, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChildSnapshot = async (cid: string) => {
    setChildSnapshot(null);
    setSnapshotErr('');
    try {
      const r = await fetch(`${apiBase}/api/family/child-snapshot/${encodeURIComponent(cid)}`, {
        headers: authHeaders,
      });
      if (!r.ok) {
        const d = await r.json();
        setSnapshotErr(
          d.hint === 'child_must_share'
            ? 'Попросите ребёнка поделиться прогрессом через раздел «Профиль → Поделиться»'
            : d.error || 'Снэпшот не найден'
        );
      } else {
        setChildSnapshot(await r.json());
      }
    } catch {
      setSnapshotErr('Ошибка соединения');
    }
  };

  const addLink = async () => {
    const cid = childIdInput.trim();
    if (!cid) return;
    setLinkLoading(true);
    setLinkErr('');
    try {
      const r = await fetch(`${apiBase}/api/family/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ childDeviceId: cid, label: childLabelInput.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok && r.status !== 200) {
        setLinkErr(d.error || 'Ошибка');
        return;
      }
      const link: (typeof childLinks)[0] = d.link;
      setChildLinks((prev) => (prev.find((l) => l.childDeviceId === cid) ? prev : [...prev, link]));
      setChildIdInput('');
      setChildLabelInput('');
    } catch {
      setLinkErr('Ошибка соединения');
    } finally {
      setLinkLoading(false);
    }
  };

  const removeLink = async (cid: string) => {
    try {
      await fetch(`${apiBase}/api/family/links/${encodeURIComponent(cid)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      setChildLinks((prev) => prev.filter((l) => l.childDeviceId !== cid));
      setChildSnapshot(null);
      setSnapshotErr('');
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: 'rgba(8, 20, 40, 0.15)',
          border: '1px solid rgba(93, 228, 255, 0.12)',
        }}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 17, color: '#e8f0ff' }}>Связать с ребёнком</h3>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            margin: '0 0 14px',
            lineHeight: 1.6,
          }}
        >
          Попросите ребёнка открыть Личный кабинет → Профиль → скопировать свой Device ID и передать
          вам.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input
            value={childIdInput}
            onChange={(e) => setChildIdInput(e.target.value)}
            placeholder="Device ID ребёнка"
            style={{
              padding: '9px 13px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e8f0ff',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <input
            value={childLabelInput}
            onChange={(e) => setChildLabelInput(e.target.value)}
            placeholder="Имя или пометка (необязательно)"
            style={{
              padding: '9px 13px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e8f0ff',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
        </div>
        {linkErr && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'rgba(255,107,107,0.1)',
              color: '#ff6b6b',
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            {linkErr}
          </div>
        )}
        <button
          type="button"
          disabled={!childIdInput.trim() || linkLoading}
          onClick={() => void addLink()}
          style={{
            padding: '9px 18px',
            borderRadius: 9,
            background: 'rgba(93,228,255,0.15)',
            border: '1px solid rgba(93,228,255,0.25)',
            color: '#5de4ff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {linkLoading ? 'Сохраняем...' : 'Добавить связь'}
        </button>
      </div>

      {childLinks.length > 0 && (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: 'rgba(8, 20, 40, 0.15)',
            border: '1px solid rgba(93, 228, 255, 0.12)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f0ff', marginBottom: 12 }}>
            Мои дети
          </div>
          {childLinks.map((lnk) => (
            <div key={lnk.childDeviceId} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff' }}>
                    {lnk.label || 'Ребёнок'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.35)',
                      marginTop: 2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {lnk.childDeviceId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadChildSnapshot(lnk.childDeviceId)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 7,
                    background: 'rgba(93,228,255,0.1)',
                    border: '1px solid rgba(93,228,255,0.2)',
                    color: '#5de4ff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Прогресс
                </button>
                <button
                  type="button"
                  onClick={() => void removeLink(lnk.childDeviceId)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid rgba(255,107,107,0.2)',
                    color: '#ff6b6b',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ×
                </button>
              </div>
              {snapshotErr && !childSnapshot && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,215,0,0.07)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    fontSize: 12,
                    color: 'rgba(255,215,0,0.8)',
                    lineHeight: 1.5,
                  }}
                >
                  {snapshotErr}
                </div>
              )}
              {childSnapshot &&
                (() => {
                  const prog = childSnapshot.progress || {};
                  const done = Object.values(prog).filter((p) => p.status === 'achieved').length;
                  const inProg = Object.values(prog).filter(
                    (p) => p.status === 'in_progress'
                  ).length;
                  return (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(34,197,94,0.07)',
                        border: '1px solid rgba(34,197,94,0.18)',
                      }}
                    >
                      <div
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}
                      >
                        Обновлено:{' '}
                        {childSnapshot.exportedAt
                          ? new Date(childSnapshot.exportedAt).toLocaleDateString('ru-RU')
                          : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>
                            {done}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            Завершено
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: '#5de4ff' }}>
                            {inProg}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>В пути</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          ))}
        </div>
      )}
      {childLinks.length === 0 && linksLoaded && (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: 'rgba(8,20,40,0.15)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
          }}
        >
          Нет связей. Добавьте Device ID ребёнка выше.
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PersonalCabinet: React.FC<{
  onBack?: () => void;
  communityBadges?: any[];
  customBadges?: any[];
}> = ({ onBack, communityBadges = [], customBadges = [] }) => {
  const { userData, updateVozhatifikatorChecklist, toggleFavorite, removeRoute } =
    useUserProgress();
  const { role, accessToken, deviceId, baseDeviceId, legacyRoleOwner, setAuth, clearAuth } =
    useAuth();
  const { myTeam, generateInviteUrl } = useTeam();
  const { badges: allBadges, ensureBadgeLoaded, ensureCategoryBadgesLoaded } = useDataLoader();

  // Sandbox / dev mode helpers — use X-Device-Id when no real JWT
  const isDev = import.meta.env.DEV;
  const hasAuth = !!accessToken || (isDev && !!deviceId);
  const devHeaders: Record<string, string> = React.useMemo(() => {
    if (accessToken) return {} as Record<string, string>; // real token — API functions handle it
    if (isDev && deviceId) return { 'X-Device-Id': deviceId } as Record<string, string>;
    return {} as Record<string, string>;
  }, [accessToken, deviceId, isDev]);
  const effectiveToken = accessToken || ''; // pass empty to API fns when in sandbox

  // Badge lookup map for image resolution (matches production pattern)
  const badgeLookupMap = React.useMemo(() => {
    const map = new Map<
      string,
      { title: string; emoji: string; category_id: string; level?: string }
    >();
    allBadges.forEach((b: any) => {
      map.set(String(b.id), {
        title: b.title || '',
        emoji: b.emoji || '',
        category_id: b.category_id || '',
        level: b.level,
      });
    });
    return map;
  }, [allBadges]);

  const [activeSection, setActiveSection] = useState<SectionId>('home');

  // Tab states for dashboard components
  const [diaryTab, setDiaryTab] = useState<RealDiaryTabId>('diary');
  const [teamTab, setTeamTab] = useState<TeamTabId>('engine');
  const [councilTab, setCouncilTab] = useState<CouncilTabId>('camp-management');
  const [profile4kTab, setProfile4kTab] = useState<Profile4KTabId>('skills');
  const [counselorTab, setCounselorTab] = useState<CounselorSquadTabId>('squad');
  const [broTab, setBroTab] = useState<
    'initiation' | 'wing' | 'constructor' | 'chat' | 'brodela' | 'brosquad' | 'ode'
  >('initiation');
  const [broPassportComplete, setBroPassportComplete] = useState(false);
  const [squadCornerTab, setSquadCornerTab] = useState<string>('squad');
  const [workshopTab, setWorkshopTab] = useState<string>('constructor');
  const [pathCarouselSteps, setPathCarouselSteps] = useState(0);
  const [favCarouselSteps, setFavCarouselSteps] = useState(0);
  const [vozhatifikatorTab, setVozhatifikatorTab] = useState<string>('book');
  const [inspectorTab, setInspectorTab] = useState<string>('cabinet');
  const [shareTab, setShareTab] = useState<'invite' | 'qr' | 'progress'>('invite');
  const [parentsTab, setParentsTab] = useState<'program' | 'squad' | 'child' | 'contacts'>(
    'program'
  );
  const [eventsTab, setEventsTab] = useState<'requests' | 'announcements' | 'tasks'>('requests');
  const [homeTab, setHomeTab] = useState<
    'active' | 'favorites' | 'collection' | 'journal' | 'squads'
  >('active');
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [mobileDrawerLevel, setMobileDrawerLevel] = useState<MobileDrawerLevel | null>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Listen to Tour navigation events
  useEffect(() => {
    const handleTourNav = (e: any) => {
      if (e.detail?.section) {
        setActiveSection(e.detail.section);
      }
      if (e.detail?.shareTab) {
        setShareTab(e.detail.shareTab);
      }
    };
    window.addEventListener('tour-nav-cabinet-section', handleTourNav);
    return () => window.removeEventListener('tour-nav-cabinet-section', handleTourNav);
  }, []);

  const profile = userData?.profile || {};
  const nickname = (profile as any)?.nickname || 'Искатель';
  const avatar = (profile as any)?.avatar || '';

  const {
    mySquadInfo,
    loadSquadInfo,
    hasSquadMembership,
    canEditSquadCorner,
    squadChatMembers,
    defaultShiftLength,
  } = useSquadData({
    accessToken: accessToken || undefined,
    deviceId: deviceId || undefined,
    userData,
    currentRole: role || undefined,
    nickname,
  });
  // Fetch BRO passport completion status from server
  useEffect(() => {
    if (!deviceId) return;
    fetchMyPassport(deviceId)
      .then((p) => {
        setBroPassportComplete(p?.status === 'completed');
      })
      .catch(() => setBroPassportComplete(false));
  }, [deviceId]);

  // Profile editing state
  const [profileEditing, setProfileEditing] = useState(false);

  // Signal to hide AuthFloatingButton while cabinet is open
  useEffect(() => {
    document.body.setAttribute('data-cabinet-open', '1');
    return () => {
      document.body.removeAttribute('data-cabinet-open');
    };
  }, []);

  // Expose active section/tab context for ChatBot via CustomEvent
  const activeCabinetTab = useMemo(() => {
    const tabMap: Record<string, string> = {
      home: homeTab,
      diary: diaryTab,
      engine: teamTab,
      council: councilTab,
      bro: broTab,
      workshop: workshopTab,
      'counselor-squad': counselorTab,
      profile4k: profile4kTab,
      'squad-corner': squadCornerTab,
      share: shareTab,
      parents: parentsTab,
      events: eventsTab,
      vozhatifikator: vozhatifikatorTab,
      inspector: inspectorTab,
    };
    return tabMap[activeSection] || '';
  }, [
    activeSection,
    homeTab,
    diaryTab,
    teamTab,
    councilTab,
    broTab,
    workshopTab,
    counselorTab,
    profile4kTab,
    squadCornerTab,
    shareTab,
    parentsTab,
    eventsTab,
    vozhatifikatorTab,
    inspectorTab,
  ]);

  useEffect(() => {
    const sectionInfo = SECTION_INFO[activeSection];
    const tabDefs = SECTION_TABS[activeSection];
    const tabDef = tabDefs?.find((t) => t.id === activeCabinetTab && !t.isDivider);

    window.dispatchEvent(
      new CustomEvent('cabinet-context', {
        detail: {
          section: activeSection,
          sectionLabel: sectionInfo?.title || activeSection,
          tab: activeCabinetTab,
          tabLabel: tabDef?.label || activeCabinetTab,
        },
      })
    );

    return () => {
      window.dispatchEvent(new CustomEvent('cabinet-context', { detail: null }));
    };
  }, [activeSection, activeCabinetTab]);

  const navigateToBadge = useCallback(
    async (badgeId: string, _action?: 'plan' | 'confirm') => {
      // Ensure badge & category data is loaded
      await ensureBadgeLoaded(badgeId);
      const categoryId = String(badgeId).split('.')[0];
      if (categoryId) await ensureCategoryBadgesLoaded(categoryId);
      // Wait for state updates
      await new Promise((r) => setTimeout(r, 300));
      // Try the global function first
      const openBadge = (window as any).openBadgeById;
      if (typeof openBadge === 'function') {
        openBadge(badgeId, { origin: 'cabinet' });
      }
      // Fallback: navigate via URL (forces deep-link handler on reload)
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'badge');
      url.searchParams.set('badgeId', badgeId);
      window.location.href = url.toString();
    },
    [ensureBadgeLoaded, ensureCategoryBadgesLoaded]
  );

  const profileSyncRef = React.useRef<{ nickname: string; avatar: string }>({
    nickname: '',
    avatar: '',
  });
  const currentRole = role || 'traveler';
  const roleInfo = ROLE_DISPLAY[currentRole] || ROLE_DISPLAY.traveler;

  const handleRoleResult = useCallback(
    (result: RoleFlowResult) => {
      switch (result.type) {
        case 'code-redeemed':
          setAuth({ role: result.role as UserRole, accessToken: result.accessToken });
          setShowRoleModal(false);
          break;
        case 'request-approved':
          setAuth({ role: result.role as UserRole, accessToken: result.accessToken || undefined });
          setShowRoleModal(false);
          break;
        case 'dev-pin-ok':
          setAuth({ role: 'developer' as UserRole });
          setShowRoleModal(false);
          break;
        case 'request-sent':
        case 'developer-oauth':
        case 'oauth-started':
        case 'cancelled':
          setShowRoleModal(false);
          break;
      }
    },
    [setAuth]
  );
  const handleSidebarSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    clearAuth();
    setShowRoleModal(false);
    setHamburgerOpen(false);
  }, [clearAuth]);
  useEffect(() => {
    if (!accessToken) {
      profileSyncRef.current = { nickname: '', avatar: '' };
      return;
    }
    const nextNickname = String(nickname || '').trim();
    const nextAvatar = String(avatar || '').trim();
    if (!nextNickname && !nextAvatar) return;
    if (
      profileSyncRef.current.nickname === nextNickname &&
      profileSyncRef.current.avatar === nextAvatar
    )
      return;
    profileSyncRef.current = { nickname: nextNickname, avatar: nextAvatar };
    void syncAuthProfile(accessToken, { nickname: nextNickname, avatar_url: nextAvatar }).catch(
      () => {}
    );
  }, [accessToken, nickname, avatar]);

  // Rank/progress calculation
  const progress = userData?.progress || {};
  const favorites: string[] = (userData as any)?.favorites || [];
  const currentLevels = Object.values(progress).filter((p: any) => p.status === 'achieved').length;
  // Use production getRank when possible
  const prodRank = getRank(profile?.stats?.totalLevelsAchieved || currentLevels);

  // Compute badgeTitlesInPath / favoriteBadgeTitles (matches ProfileView production logic)
  const getBaseId = (rawId: string) => {
    const clean = String(rawId || '').trim();
    if (!clean) return '';
    const parts = clean.split('.').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : clean;
  };

  const { badgeTitlesInPath, favoriteBadgeTitles, badgeCarouselItems } = useMemo(() => {
    const pathTitles = new Set<string>();
    const favTitles = new Set<string>();
    const resolveTitle = (baseId: string): string | null => {
      const b = badgeLookupMap.get(baseId);
      if (b?.title) return b.title;
      const found = allBadges.find(
        (b: any) => b.id === baseId || String(b.id).startsWith(baseId + '.')
      );
      return found?.title ?? null;
    };
    Object.keys(progress || {}).forEach((id) => {
      const baseId = getBaseId(id);
      const title = resolveTitle(baseId);
      if (title) pathTitles.add(title);
    });
    (favorites || []).forEach((favId: string) => {
      const baseId = getBaseId(favId);
      const title = resolveTitle(baseId);
      if (title) favTitles.add(title);
      if (title) favTitles.add(title);
    });
    const carouselBaseIds = new Map<
      string,
      { baseId: string; title: string; categoryId: string; emoji?: string }
    >();
    const resolveBadge = (
      baseId: string
    ): { baseId: string; title: string; categoryId: string; emoji?: string } | null => {
      const b = badgeLookupMap.get(baseId);
      if (b?.title && b?.category_id)
        return { baseId, title: b.title, categoryId: b.category_id, emoji: b.emoji };
      const found = allBadges.find(
        (badgeItem: any) => badgeItem.id === baseId || String(badgeItem.id).startsWith(baseId + '.')
      );
      if (found?.title && found?.category_id)
        return { baseId, title: found.title, categoryId: found.category_id, emoji: found.emoji };
      return null;
    };
    Object.keys(progress || {}).forEach((id) => {
      const baseId = getBaseId(id);
      if (carouselBaseIds.has(baseId)) return;
      const item = resolveBadge(baseId);
      if (item) carouselBaseIds.set(baseId, item);
    });
    (favorites || []).forEach((favId: string) => {
      const baseId = getBaseId(favId);
      if (carouselBaseIds.has(baseId)) return;
      const item = resolveBadge(baseId);
      if (item) carouselBaseIds.set(baseId, item);
    });
    return {
      badgeTitlesInPath: Array.from(pathTitles).slice(0, 10),
      favoriteBadgeTitles: Array.from(favTitles).slice(0, 10),
      badgeCarouselItems: Array.from(carouselBaseIds.values()).slice(0, 8),
    };
  }, [progress, favorites, badgeLookupMap, allBadges]);

  const openProfileEditor = () => {
    setProfileEditing(true);
    setActiveSection('home'); // profile renders in home content area
  };
  // Filter sections by role
  const visibleSections = useMemo(() => {
    return SECTIONS.filter((s) => {
      if (s.roles && !s.roles.includes(currentRole as UserRole)) return false;
      if (s.minRole && (currentRole === 'traveler' || !currentRole)) return false;
      return true;
    });
  }, [currentRole]);

  const mainSections = visibleSections.filter((s) => s.group === 'main');
  const staffSections = visibleSections.filter((s) => s.group === 'staff');
  const systemSections = visibleSections.filter((s) => s.group === 'system');

  const currentInfo = SECTION_INFO[activeSection];
  const getVisibleTabs = useCallback(
    (sectionId: SectionId) => {
      const tabs = SECTION_TABS[sectionId];
      if (!tabs) return null;
      const isStaff = canModerateBadgeApprovals(currentRole as UserRole);
      if (sectionId === 'squad-corner')
        return tabs.filter((t) => !t.editorOnly || canEditSquadCorner);
      if (sectionId === 'council') return tabs.filter((t) => !t.staffOnly || isStaff);
      return tabs;
    },
    [canEditSquadCorner, currentRole]
  );
  const visibleTabs = useMemo(() => getVisibleTabs(activeSection), [activeSection, getVisibleTabs]);
  const activeTabId = useMemo((): string => {
    switch (activeSection) {
      case 'home':
        return homeTab;
      case 'squad-corner':
        return squadCornerTab;
      case 'diary':
        return diaryTab;
      case 'engine':
        return teamTab;
      case 'council':
        return councilTab;
      case 'bro':
        return broTab;
      case 'workshop':
        return workshopTab;
      case 'share':
        return shareTab;
      case 'parents':
        return parentsTab;
      case 'events':
        return eventsTab as string;
      case 'profile4k':
        return profile4kTab;
      case 'vozhatifikator':
        return vozhatifikatorTab;
      case 'inspector':
        return inspectorTab;
      default:
        return visibleTabs?.[0]?.id || '';
    }
  }, [
    activeSection,
    broTab,
    councilTab,
    diaryTab,
    eventsTab,
    homeTab,
    inspectorTab,
    parentsTab,
    profile4kTab,
    shareTab,
    squadCornerTab,
    teamTab,
    visibleTabs,
    vozhatifikatorTab,
    workshopTab,
  ]);
  const setSectionTab = useCallback(
    (sectionId: SectionId, tabId: string) => {
      switch (sectionId) {
        case 'home':
          setHomeTab(tabId as typeof homeTab);
          break;
        case 'squad-corner':
          setSquadCornerTab(tabId);
          break;
        case 'diary':
          setDiaryTab(tabId as typeof diaryTab);
          break;
        case 'engine':
          setTeamTab(tabId as typeof teamTab);
          break;
        case 'council':
          setCouncilTab(tabId as typeof councilTab);
          break;
        case 'bro':
          setBroTab(tabId as typeof broTab);
          break;
        case 'workshop':
          setWorkshopTab(tabId);
          break;
        case 'share':
          setShareTab(tabId as typeof shareTab);
          break;
        case 'parents':
          setParentsTab(tabId as typeof parentsTab);
          break;
        case 'events':
          setEventsTab(tabId as typeof eventsTab);
          break;
        case 'profile4k':
          setProfile4kTab(tabId as typeof profile4kTab);
          break;
        case 'vozhatifikator':
          setVozhatifikatorTab(tabId as typeof vozhatifikatorTab);
          break;
        case 'inspector':
          setInspectorTab(tabId);
          break;
      }
    },
    [
      broTab,
      councilTab,
      diaryTab,
      eventsTab,
      homeTab,
      parentsTab,
      profile4kTab,
      shareTab,
      teamTab,
      vozhatifikatorTab,
    ]
  );
  const closeMobileDrawer = useCallback(() => setMobileDrawerLevel(null), []);
  const openMobileDrawer = useCallback(() => {
    setHamburgerOpen(false);
    setMobileDrawerLevel('sections');
  }, []);
  const handleMobileSectionSelect = useCallback(
    (sectionId: SectionId) => {
      setActiveSection(sectionId);
      setHamburgerOpen(false);
      setMobileDrawerLevel(getVisibleTabs(sectionId) ? 'tabs' : null);
    },
    [getVisibleTabs]
  );
  const handleMobileTabSelect = useCallback(
    (tabId: string) => {
      setSectionTab(activeSection, tabId);
    },
    [activeSection, setSectionTab]
  );

  useEffect(() => {
    if (!isMobile) setMobileDrawerLevel(null);
  }, [isMobile]);

  useEffect(() => {
    if (mobileDrawerLevel === 'tabs' && !visibleTabs) {
      setMobileDrawerLevel('sections');
    }
  }, [mobileDrawerLevel, visibleTabs]);

  // ── Deep linking: ?openPanel=section&join_squad=squadId or #hash ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    // openPanel deep link — navigate to specific section
    const panel = params.get('openPanel');
    if (panel && SECTION_INFO[panel as SectionId]) {
      setActiveSection(panel as SectionId);
      params.delete('openPanel');
    }

    // join_squad deep link — just navigate to squad-corner, actual join happens in prod
    const squadId = params.get('join_squad');
    if (squadId) {
      setActiveSection('squad-corner');
      params.delete('join_squad');
    }

    // Handle #workshop hash from BadgeView/CategoryView
    if (window.location.hash.startsWith('#workshop')) {
      setActiveSection('workshop');
      setWorkshopTab('constructor');
    }

    // Clean up URL parameters
    const remaining = params.toString();
    if (panel || squadId) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${remaining ? `?${remaining}` : ''}${window.location.hash || ''}`
      );
    }
  }, []); // run once on mount

  return (
    <>
      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes profile-fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes profile-slideUp { from { transform: translateY(14px); } to { transform: translateY(0); } }
.fade-in { animation: profile-fadeIn 0.4s ease-out backwards; }
.slide-up { animation: profile-slideUp 0.35s ease-out; }
.cabinet-sidebar-btn:active { transform: scale(0.95) !important; }
.cabinet-sidebar-btn:hover { background: rgba(93,228,255,0.08) !important; }`}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: '#0a1628',
          display: 'flex',
          fontFamily: FONT,
          color: '#e8f0ff',
        }}
      >
        {/* Фоновый слой, зафиксированный через 100lvh для фикса прыжка/растяжения на iOS/Android при скролле браузерных шторок */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100lvh',
            backgroundImage: `url('/RL-Guide-book/фон кабина.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
        {/* ═══ Колонка 1: Навигация разделов ═══ */}
        {/* DESKTOP: обычный flex-child */}
        {!isMobile && (
          <div
            className="cabinet-col1"
            style={{
              width: 180,
              flexShrink: 0,
              background:
                'linear-gradient(180deg, rgba(120,80,255,0.04) 0%, transparent 40%), linear-gradient(270deg, rgba(80,140,255,0.05) 0%, transparent 40%), linear-gradient(180deg, #111827 0%, #0B1020 100%)',
              backgroundColor: '#111827',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 6px',
              gap: 1,
              overflowY: 'auto',
            }}
          >
            {/* Hamburger button */}
            <button
              type="button"
              onClick={() => setHamburgerOpen(!hamburgerOpen)}
              style={{
                width: '100%',
                height: 40,
                border: 'none',
                borderRadius: 10,
                background: hamburgerOpen ? 'rgba(93,228,255,0.15)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                fontFamily: FONT,
                color: hamburgerOpen ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>☰</span>
              Профиль
            </button>

            {/* Section buttons — main */}
            {mainSections.map((s) => (
              <button
                key={s.id}
                type="button"
                className="cabinet-sidebar-btn"
                data-tour={`sidebar-${s.id}`}
                onClick={() => {
                  setActiveSection(s.id);
                  setHamburgerOpen(false);
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 12px',
                  textAlign: 'left',
                  background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeSection === s.id ? 600 : 400,
                  fontFamily: FONT,
                  color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {s.label}
              </button>
            ))}

            {/* Separator + label */}
            {staffSections.length > 0 && (
              <>
                <div
                  style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 10px' }}
                />
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Инструменты
                </div>
              </>
            )}

            {/* Section buttons — staff */}
            {staffSections.map((s) => (
              <button
                key={s.id}
                type="button"
                className="cabinet-sidebar-btn"
                data-tour={`sidebar-${s.id}`}
                onClick={() => {
                  setActiveSection(s.id);
                  setHamburgerOpen(false);
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 12px',
                  textAlign: 'left',
                  background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeSection === s.id ? 600 : 400,
                  fontFamily: FONT,
                  color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {s.label}
              </button>
            ))}

            {/* System sections at bottom */}
            {systemSections.length > 0 && (
              <>
                <div style={{ flex: 1 }} />
                <div
                  style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 10px' }}
                />
                {systemSections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="cabinet-sidebar-btn"
                    data-tour={`sidebar-${s.id}`}
                    onClick={() => {
                      setActiveSection(s.id);
                      setHamburgerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 8,
                      padding: '9px 12px',
                      textAlign: 'left',
                      background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: activeSection === s.id ? 600 : 400,
                      fontFamily: FONT,
                      color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.15s',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* MOBILE: кнопка-гамбургер — НЕ занимает место (position:fixed через CSS) */}
        {isMobile && (
          <button
            type="button"
            onClick={openMobileDrawer}
            className="cabinet-mobile-hamburger-btn"
            aria-label="Открыть меню"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect y="0" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="6" width="14" height="2" rx="1" fill="currentColor" />
              <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* MOBILE: единый drawer навигации */}
        {isMobile && mobileDrawerLevel && (
          <>
            <div onClick={closeMobileDrawer} className="cabinet-mobile-sidebar-backdrop" />
            <div className="cabinet-mobile-sidebar-overlay">
              {/* ── Header: зависит от уровня ── */}
              {mobileDrawerLevel === 'sections' ? (
                /* Sections: аватар + имя + кнопка закрыть */
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 12px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 4,
                  }}
                >
                  {/* Avatar — клик открывает профиль */}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileDrawer();
                      setHamburgerOpen(true);
                    }}
                    style={{
                      flexShrink: 0,
                      border: 'none',
                      padding: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '50%',
                    }}
                    aria-label="Открыть профиль"
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'rgba(93,228,255,0.12)',
                        border: '1.5px solid rgba(93,228,255,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: avatar.length <= 2 ? 16 : 11,
                        fontWeight: 600,
                        color: '#5de4ff',
                        overflow: 'hidden',
                      }}
                    >
                      {avatar.startsWith('http') ||
                      avatar.startsWith('/') ||
                      avatar.startsWith('data:') ? (
                        <img
                          src={avatar}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        avatar || nickname.charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>
                  {/* Name + role */}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileDrawer();
                      setHamburgerOpen(true);
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#e8f0ff',
                        fontFamily: FONT,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {nickname}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: FONT,
                        marginTop: 1,
                      }}
                    >
                      {roleInfo.label}
                    </div>
                  </button>
                  {/* Close */}
                  <button
                    type="button"
                    onClick={closeMobileDrawer}
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      border: 'none',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontFamily: FONT,
                    }}
                    aria-label="Закрыть"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                /* Tabs: ← Назад + заголовок раздела + ✕ */
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 10px 8px',
                    borderBottom: '1px solid rgba(93,228,255,0.1)',
                    marginBottom: 4,
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMobileDrawerLevel('sections')}
                    style={{
                      flexShrink: 0,
                      height: 32,
                      border: 'none',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '0 10px',
                      fontFamily: FONT,
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    <span style={{ fontSize: 15 }}>←</span>
                  </button>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#5de4ff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentInfo.title}
                  </div>
                  <button
                    type="button"
                    onClick={closeMobileDrawer}
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      border: 'none',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontFamily: FONT,
                    }}
                    aria-label="Закрыть"
                  >
                    ✕
                  </button>
                </div>
              )}

              {mobileDrawerLevel === 'sections' ? (
                <>
                  {mainSections.map((s) => {
                    const hasTabs = !!getVisibleTabs(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="cabinet-sidebar-btn"
                        onClick={() => handleMobileSectionSelect(s.id)}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderRadius: 8,
                          padding: '11px 14px',
                          textAlign: 'left',
                          background:
                            activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: activeSection === s.id ? 600 : 400,
                          fontFamily: FONT,
                          color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.75)',
                          transition: 'all 0.15s',
                          letterSpacing: '-0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <span>{s.label}</span>
                        {hasTabs && (
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>›</span>
                        )}
                      </button>
                    );
                  })}

                  {staffSections.length > 0 && (
                    <>
                      <div
                        style={{
                          height: 1,
                          background: 'rgba(255,255,255,0.1)',
                          margin: '8px 10px',
                        }}
                      />
                      <div
                        style={{
                          padding: '4px 14px',
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Инструменты
                      </div>
                    </>
                  )}

                  {staffSections.map((s) => {
                    const hasTabs = !!getVisibleTabs(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="cabinet-sidebar-btn"
                        onClick={() => handleMobileSectionSelect(s.id)}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderRadius: 8,
                          padding: '11px 14px',
                          textAlign: 'left',
                          background:
                            activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: activeSection === s.id ? 600 : 400,
                          fontFamily: FONT,
                          color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.75)',
                          transition: 'all 0.15s',
                          letterSpacing: '-0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <span>{s.label}</span>
                        {hasTabs && (
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>›</span>
                        )}
                      </button>
                    );
                  })}

                  {systemSections.length > 0 && (
                    <>
                      <div style={{ flex: 1 }} />
                      <div
                        style={{
                          height: 1,
                          background: 'rgba(255,255,255,0.08)',
                          margin: '6px 10px',
                        }}
                      />
                      {systemSections.map((s) => {
                        const hasTabs = !!getVisibleTabs(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className="cabinet-sidebar-btn"
                            onClick={() => handleMobileSectionSelect(s.id)}
                            style={{
                              width: '100%',
                              border: 'none',
                              borderRadius: 8,
                              padding: '11px 14px',
                              textAlign: 'left',
                              background:
                                activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: activeSection === s.id ? 600 : 400,
                              fontFamily: FONT,
                              color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.75)',
                              transition: 'all 0.15s',
                              letterSpacing: '-0.01em',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <span>{s.label}</span>
                            {hasTabs && (
                              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>
                                ›
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              ) : (
                <>
                  {visibleTabs ? (
                    visibleTabs.map((tab) => {
                      if (tab.isDivider) {
                        return (
                          <div
                            key={tab.id}
                            style={{
                              height: 1,
                              background: 'rgba(255,255,255,0.06)',
                              margin: '8px 16px',
                            }}
                          />
                        );
                      }
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleMobileTabSelect(tab.id)}
                          style={{
                            padding: '12px 16px',
                            border: 'none',
                            textAlign: 'left',
                            width: '100%',
                            background:
                              activeTabId === tab.id ? 'rgba(93,228,255,0.12)' : 'transparent',
                            borderLeft:
                              activeTabId === tab.id
                                ? '3px solid #5de4ff'
                                : '3px solid transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            color: activeTabId === tab.id ? '#fff' : 'rgba(255,255,255,0.75)',
                            fontSize: 15,
                            fontWeight: activeTabId === tab.id ? 600 : 400,
                            fontFamily: FONT,
                            transition: 'all 0.15s',
                          }}
                        >
                          {tab.icon && <span style={{ fontSize: 16 }}>{tab.icon}</span>}
                          {tab.label}
                        </button>
                      );
                    })
                  ) : (
                    <div
                      style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
                    >
                      {currentInfo.description}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ═══ Гармошка: панель профиля (выезжает поверх Колонки 1) ═══ */}
        {hamburgerOpen && (
          <>
            {/* Backdrop — клик мимо закрывает */}
            <div
              onClick={() => setHamburgerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                background: 'rgba(0,0,0,0.3)',
              }}
            />
            {/* Slide-over panel */}
            {/* Slide-over panel */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                zIndex: 101,
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderRight: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '32px 24px',
                boxShadow: '8px 0 40px rgba(0,0,0,0.08)',
                animation: 'slideInLeft 0.2s ease-out',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              }}
            >
              {/* Avatar */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: avatar.length <= 2 ? 56 : 32,
                    fontWeight: 500,
                    color: '#0f172a',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  {avatar.startsWith('http') ||
                  avatar.startsWith('/') ||
                  avatar.startsWith('data:') ? (
                    <img
                      src={avatar}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    avatar || nickname.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              {/* Name + Role */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>{nickname}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#3390ec' }}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 0 12px' }} />
              {/* Menu items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  {
                    label: 'Мой профиль',
                    action: () => {
                      openProfileEditor();
                      setHamburgerOpen(false);
                    },
                  },
                  {
                    label: 'Инспектор Пользы',
                    action: () => {
                      setActiveSection('inspector');
                      setHamburgerOpen(false);
                    },
                  },
                  {
                    label: 'Войти в аккаунт',
                    action: () => {
                      setShowRoleModal(true);
                      setHamburgerOpen(false);
                    },
                  },
                  {
                    label: 'Выйти из аккаунта',
                    action: () => {
                      void handleSidebarSignOut();
                    },
                  },
                  ...(onBack
                    ? [
                        {
                          label: 'Переключить на демо-кабину',
                          action: () => {
                            setHamburgerOpen(false);
                            onBack();
                          },
                        },
                      ]
                    : []),
                ].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: '#111827',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ Колонка 2: Список табов (160px) — только десктоп ═══ */}
        {/* On mobile this column is rendered as a fixed overlay (see below) */}
        {!isMobile && (
          <div
            style={{
              width: 160,
              flexShrink: 0,
              background: 'rgba(8, 20, 40, 0.12)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRight: '1px solid rgba(93,228,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Section title */}
            <div
              style={{
                padding: '14px 16px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {currentInfo.title}
            </div>

            {/* Tab list items */}
            {(() => {
              if (!visibleTabs)
                return (
                  <div
                    style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
                  >
                    {currentInfo.description}
                  </div>
                );
              return visibleTabs.map((tab) => {
                if (tab.isDivider) {
                  return (
                    <div
                      key={tab.id}
                      style={{
                        height: 1,
                        background: 'rgba(255,255,255,0.06)',
                        margin: '8px 16px',
                      }}
                    />
                  );
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSectionTab(activeSection, tab.id)}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      textAlign: 'left',
                      background: activeTabId === tab.id ? 'rgba(93,228,255,0.12)' : 'transparent',
                      borderLeft:
                        activeTabId === tab.id ? '3px solid #5de4ff' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: activeTabId === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontSize: 14,
                      fontWeight: activeTabId === tab.id ? 600 : 400,
                      fontFamily: FONT,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTabId !== tab.id)
                        (e.currentTarget as HTMLElement).style.background =
                          'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTabId !== tab.id)
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {tab.icon && <span style={{ fontSize: 16 }}>{tab.icon}</span>}
                    {tab.label}
                  </button>
                );
              });
            })()}
          </div>
        )}

        <div
          className="cabinet-content-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '56px 20px 120px' : '24px 32px 120px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth:
                activeSection === 'council' &&
                (councilTab === 'camp-management' || councilTab === 'management')
                  ? 'none'
                  : 680,
              margin: '0 auto',
            }}
          >
            {/* ── Profile Editor (when profileEditing is true) ── */}
            {profileEditing ? (
              <ProfileSettingsContainer onClose={() => setProfileEditing(false)} />
            ) : activeSection === 'home' ? (
              <ProgressionHubContainer
                userData={userData}
                badgeLookupMap={badgeLookupMap}
                homeTab={homeTab}
                pathCarouselSteps={pathCarouselSteps}
                setPathCarouselSteps={setPathCarouselSteps}
                favCarouselSteps={favCarouselSteps}
                setFavCarouselSteps={setFavCarouselSteps}
                removeRoute={removeRoute}
                toggleFavorite={toggleFavorite}
                navigateToBadge={navigateToBadge}
                isMobile={isMobile}
                loadSquadInfo={loadSquadInfo}
                setActiveSection={setActiveSection}
                setShowRoleModal={setShowRoleModal}
                accessToken={accessToken || ''}
              />
            ) : activeSection === 'admin' ? (
              <AdminDashboard
                accessToken={accessToken || ''}
                onClose={() => setActiveSection('home')}
                embedded
                role={currentRole}
              />
            ) : activeSection === 'diary' ? (
              <RealDiaryDashboard
                variant="cabin"
                activeTab={diaryTab}
                onTabChange={setDiaryTab}
                onNavigateToBadge={navigateToBadge}
                onScrollToInspector={() => setActiveSection('home')}
              />
            ) : activeSection === 'engine' ? (
              <TeamDashboard
                variant="cabin"
                activeTab={teamTab}
                onTabChange={setTeamTab}
                onNavigateToBadge={navigateToBadge}
              />
            ) : activeSection === 'council' ? (
              <CouncilDashboard
                variant="cabin"
                activeTab={councilTab}
                onTabChange={setCouncilTab}
                onNavigateToBadge={navigateToBadge}
                onOpenTeamPanel={() => setActiveSection('engine')}
                accessToken={accessToken}
                canModerate={
                  role === 'counselor' ||
                  role === 'educator' ||
                  role === 'shift_leader' ||
                  role === 'camp_director' ||
                  role === 'developer'
                }
              />
            ) : activeSection === 'bro' ? (
              <BroDashboard
                broTab={broTab}
                setBroTab={setBroTab}
                broPassportComplete={broPassportComplete}
                userData={userData}
                deviceId={deviceId || ''}
                accessToken={accessToken || ''}
                role={role}
                mySquadInfo={mySquadInfo}
              />
            ) : activeSection === 'squad-corner' ? (
              <SquadCornerContainer
                squadCornerTab={squadCornerTab}
                setSquadCornerTab={setSquadCornerTab}
                currentRole={currentRole}
                hasSquadMembership={hasSquadMembership}
                mySquadInfo={mySquadInfo}
                userData={userData}
                deviceId={deviceId || ''}
                accessToken={accessToken || null}
                canEditSquadCorner={canEditSquadCorner}
                loadSquadInfo={loadSquadInfo}
                navigateToBadge={navigateToBadge}
                defaultShiftLength={defaultShiftLength}
                nickname={nickname}
                squadChatMembers={squadChatMembers}
                hasAuth={hasAuth}
                setActiveSection={setActiveSection}
              />
            ) : activeSection === 'vozhatifikator' ? (
              <VozhatifikatorDashboard
                vozhatifikatorTab={vozhatifikatorTab}
                userData={userData}
                updateVozhatifikatorChecklist={updateVozhatifikatorChecklist}
                role={currentRole}
                deviceId={deviceId || ''}
                isMobile={isMobile}
              />
            ) : activeSection === 'workshop' ? (
              <WorkshopDashboard
                workshopTab={workshopTab}
                effectiveToken={effectiveToken}
                customBadges={customBadges}
                communityBadges={communityBadges}
                navigateToBadge={navigateToBadge}
              />
            ) : activeSection === 'share' ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {shareTab === 'invite' && (
                  <div
                    key="share-invite"
                    className="fade-in cab-card"
                    style={{
                      padding: '28px 32px',
                      borderRadius: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#e8f0ff',
                          letterSpacing: '-0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        Пригласить друзей
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.6)',
                          lineHeight: 1.5,
                        }}
                      >
                        {myTeam
                          ? 'Скопируй ссылку и отправь друзьям.'
                          : 'Скопируй ссылку на путеводитель и отправь друзьям.'}
                      </p>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const url = myTeam ? generateInviteUrl() : window.location.href;
                          navigator.clipboard
                            .writeText(url)
                            .then(() => alert('Ссылка скопирована!'));
                        }}
                        className="cab-btn-accent"
                      >
                        Скопировать ссылку
                      </button>
                    </div>
                  </div>
                )}
                {shareTab === 'qr' && (
                  <div
                    key="share-qr"
                    className="fade-in cab-card"
                    style={{
                      padding: '28px 32px',
                      borderRadius: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#e8f0ff',
                          letterSpacing: '-0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        QR-код путеводителя
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.6)',
                          lineHeight: 1.5,
                        }}
                      >
                        Наведи камеру телефона для перехода на путеводитель
                      </p>
                    </div>
                    <div
                      style={{
                        padding: 24,
                        borderRadius: 16,
                        background: '#ffffff',
                        display: 'flex',
                        width: 'fit-content',
                      }}
                    >
                      <QRCodeSVG
                        value={window.location.origin + (import.meta.env.BASE_URL || '/')}
                        size={180}
                      />
                    </div>
                  </div>
                )}
                {shareTab === 'progress' && (
                  <div
                    key="progress"
                    className="fade-in"
                    style={{
                      maxWidth: 720,
                      margin: '0 auto',
                      width: '100%',
                    }}
                  >
                    <ShareContainer
                      shareActiveTab="create-card"
                      nickname={profile?.nickname}
                      avatar={profile?.avatar}
                      rank={prodRank}
                      totalLevelsAchieved={profile?.stats?.totalLevelsAchieved ?? 0}
                      totalBadgesStarted={profile?.stats?.totalBadgesStarted ?? 0}
                      badgeTitlesInPath={badgeTitlesInPath}
                      favoriteBadgeTitles={favoriteBadgeTitles}
                      badgeCarouselItems={badgeCarouselItems}
                    />
                  </div>
                )}
              </div>
            ) : activeSection === 'events' ? (
              <EventsDashboard
                eventsTab={eventsTab}
                effectiveToken={effectiveToken}
                devHeaders={devHeaders}
                hasAuth={hasAuth}
                userData={userData}
              />

            ) : activeSection === 'shifts' ? (
              <div
                key="shifts"
                className="fade-in"
                style={{
                  background: 'rgba(8, 20, 40, 0.45)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  borderRadius: 18,
                  border: '1px solid rgba(93, 228, 255, 0.12)',
                  padding: '24px 28px',
                }}
              >
                <ShiftsAndSquadsDashboard
                  onRequestJoinSquad={async (squad) => {
                    const hn = window.location.hostname;
                    const base =
                      import.meta.env.DEV || hn === 'localhost' || hn === '127.0.0.1'
                        ? ''
                        : (
                            (import.meta.env.VITE_API_URL ||
                              import.meta.env.VITE_BACKEND_URL ||
                              '') as string
                          ).replace(/\/$/, '');
                    const h: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
                    else {
                      try {
                        const pin = localStorage.getItem('rl-dev-pin');
                        if (pin) h['X-Dev-Pin'] = pin;
                      } catch {}
                    }
                    const res = await fetch(`${base}/api/squads/${squad.id}/join-requests`, {
                      method: 'POST',
                      headers: h,
                      body: JSON.stringify({ nickname: userData?.profile?.nickname || '' }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (data.status === 'already_member') {
                      alert('Вы уже в этом отряде!');
                    } else if (data.status === 'duplicate') {
                      alert('Заявка уже отправлена, ожидайте ответа.');
                    } else if (res.ok) {
                      alert('Заявка на вступление отправлена!');
                    } else {
                      alert(`Ошибка: ${data.error || res.status}`);
                    }
                  }}
                  onRequestLogin={() => setShowRoleModal(true)}
                  onNavigateToSquadCorner={() => setActiveSection('squad-corner')}
                  onSquadCreated={async () => {
                    await loadSquadInfo();
                    setActiveSection('squad-corner');
                  }}
                />
              </div>
            ) : activeSection === 'parents' ? (
              <div
                key="parents"
                className="fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 16,
                  background: 'rgba(8, 20, 40, 0.15)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 18,
                  border: '1px solid rgba(93, 228, 255, 0.12)',
                  padding: '24px 28px',
                }}
              >
                {parentsTab === 'program' && (
                  <div
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      background: 'rgba(8, 20, 40, 0.15)',
                      border: '1px solid rgba(93, 228, 255, 0.12)',
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e8f0ff' }}>
                      Программа смены
                    </h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>
                      Режим ребёнка в этом разделе всегда read-only.
                    </p>
                    <CampProgramByDays defaultShiftLength={defaultShiftLength} />
                  </div>
                )}
                {parentsTab === 'squad' &&
                  (!(mySquadInfo?.membership?.squadId || userData?.diaryProgress?.squad?.name) ? (
                    <SquadJoinTab accessToken={accessToken || ''} nickname={nickname} />
                  ) : (
                    <div
                      style={{
                        padding: 32,
                        borderRadius: 16,
                        background: 'rgba(8, 20, 40, 0.15)',
                        border: '1px solid rgba(93, 228, 255, 0.12)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🏕️</div>
                      <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e8f0ff' }}>
                        Вы уже состоите в отряде
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.6)',
                          margin: '0 auto 24px',
                          lineHeight: 1.6,
                          maxWidth: 400,
                        }}
                      >
                        Отрядный уголок, чат участников и расписание доступны в специальном разделе
                        главного меню.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection('squad-corner')}
                        style={{
                          padding: '12px 24px',
                          borderRadius: 12,
                          background: 'rgba(93,228,255,0.15)',
                          border: '1px solid rgba(93,228,255,0.3)',
                          color: '#5de4ff',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Перейти в «Мой отряд»
                      </button>
                    </div>
                  ))}
                {parentsTab === 'child' && <ChildLinksTab accessToken={accessToken || ''} />}

                {parentsTab === 'contacts' && (
                  <div
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      background: 'rgba(8, 20, 40, 0.15)',
                      border: '1px solid rgba(93, 228, 255, 0.12)',
                    }}
                  >
                    <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#e8f0ff' }}>
                      Контакты смены
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Начальник лагеря', value: 'Свяжитесь через канал лагеря' },
                        { label: 'Старший вожатый', value: 'См. раздел «Вожатский отряд»' },
                        { label: 'Вожатый отряда', value: 'См. раздел «Отрядный уголок»' },
                      ].map((c) => (
                        <div
                          key={c.label}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.5)',
                              marginBottom: 4,
                            }}
                          >
                            {c.label}
                          </div>
                          <div style={{ fontSize: 13, color: '#e8f0ff' }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeSection === 'inspector' ? (
              <div
                key="inspector"
                className="fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 16,
                }}
              >
                {inspectorTab === 'cabinet' && (
                  <InspectorCabinetPanel
                    accessToken={accessToken}
                    deviceId={deviceId}
                    onOpenDiary={() => setActiveSection('diary')}
                    onNavigateToBadge={navigateToBadge}
                  />
                )}
                {(
                  [
                    'friendship',
                    'politeness',
                    'comfort',
                    'help',
                    'involvement',
                    'peacemaker',
                    'mood',
                    'chief',
                  ] as InspectorTabId[]
                ).includes(inspectorTab as InspectorTabId) && (
                  <InspectorDashboard
                    variant="cabin"
                    activeTab={inspectorTab as InspectorTabId}
                    onTabChange={(tab) => setInspectorTab(tab)}
                    onOpenDiary={() => setActiveSection('diary')}
                    onNavigateToBadge={navigateToBadge}
                    accessToken={accessToken}
                    deviceId={deviceId}
                  />
                )}
                {inspectorTab === 'badges' &&
                  (() => {
                    // Trigger lazy load of category 14
                    void ensureCategoryBadgesLoaded('14');
                    const cat14Badges = allBadges.filter(
                      (b: any) => String(b.category_id) === '14'
                    );
                    return (
                      <div
                        style={{
                          background: 'rgba(5, 12, 28, 0.4)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 24,
                          padding: 24,
                          boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
                        }}
                      >
                        <h3
                          style={{
                            margin: '0 0 16px',
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#e8f0ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span>🔍</span> Линейка значков Инспектора Пользы
                        </h3>
                        <p
                          style={{
                            margin: '0 0 20px',
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.5,
                          }}
                        >
                          Все значки категории «Инспектор Пользы». Кликни для перехода к значку.
                        </p>
                        {cat14Badges.length > 0 ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: 12,
                            }}
                          >
                            {cat14Badges.map((b: any) => (
                              <div
                                key={b.id}
                                onClick={() => navigateToBadge(String(b.id))}
                                style={{
                                  padding: 16,
                                  borderRadius: 14,
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                              >
                                <div style={{ width: 56, height: 56, margin: '0 auto 8px' }}>
                                  <BadgeIcon
                                    badgeId={String(b.id)}
                                    badgeTitle={b.title || ''}
                                    categoryId="14"
                                    emoji={b.emoji || ''}
                                    size="responsive"
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#e8f0ff',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {b.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.4)',
                                    marginTop: 4,
                                  }}
                                >
                                  ID: {b.id}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: 32,
                              textAlign: 'center',
                              color: 'rgba(255,255,255,0.4)',
                              fontSize: 13,
                            }}
                          >
                            Значки категории 14 загружаются…
                          </div>
                        )}
                      </div>
                    );
                  })()}
                {['intro-doc', 'methodology-doc', 'active-checklist-doc'].includes(inspectorTab) &&
                  (() => {
                    const DOC_CONFIG: Record<string, { title: string; path: string }> = {
                      'intro-doc': {
                        title: '📖 Введение в Инспектора Пользы',
                        path: `${import.meta.env.VITE_AI_DATA_URL || '/RL-Guide-book/ai-data'}/category-14/introduction.md`,
                      },
                      'methodology-doc': {
                        title: '📘 Методика «Инспектор Пользы»',
                        path: `${import.meta.env.VITE_AI_DATA_URL || '/RL-Guide-book/ai-data'}/category-14/methodology/inspector-methodology.md`,
                      },
                      'active-checklist-doc': {
                        title: '✅ Активный чек-лист',
                        path: `${import.meta.env.VITE_AI_DATA_URL || '/RL-Guide-book/ai-data'}/category-14/checklists/active-checklist.md`,
                      },
                    };
                    const cfg = DOC_CONFIG[inspectorTab];
                    return (
                      <MarkdownDocTab key={inspectorTab} title={cfg.title} mdPath={cfg.path} />
                    );
                  })()}
              </div>
            ) : activeSection === 'counselor-squad' ? (
              <CounselorSquadDashboard
                key="counselor-squad"
                variant="cabin"
                activeTab={counselorTab}
                onTabChange={setCounselorTab}
                onNavigateToBadge={navigateToBadge}
              />
            ) : activeSection === 'profile4k' ? (
              <Profile4KDashboard
                key="profile4k"
                variant="cabin"
                activeTab={profile4kTab}
                onTabChange={setProfile4kTab}
                userData={userData}
                badges={allBadges}
                badgeTitlesInPath={badgeTitlesInPath}
                favoriteBadgeTitles={favoriteBadgeTitles}
                rank={prodRank}
                nickname={(profile as any)?.nickname}
              />
            ) : (
              <div
                key="fallback"
                className="fade-in"
                style={{
                  padding: 32,
                  borderRadius: 16,
                  background: 'rgba(8, 20, 40, 0.15)',
                  border: '1px solid rgba(93, 228, 255, 0.12)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  minHeight: 300,
                }}
              >
                <SectionStub sectionId={activeSection} />
              </div>
            )}
          </div>
          {/* close maxWidth wrapper */}
        </div>
        {/* close content column */}
      </div>
      {/* close root layout */}

      {showRoleModal && (
        <RoleSelectionModal
          onResult={handleRoleResult}
          deviceId={baseDeviceId || deviceId}
          legacyRoleOwner={legacyRoleOwner}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Section stubs (placeholder until real components are wired)
// ---------------------------------------------------------------------------

const SectionStub: React.FC<{ sectionId: SectionId }> = ({ sectionId }) => {
  const stubData: Record<SectionId, { features: string[] }> = {
    home: {
      features: [
        'Паспорт значков',
        'Путь значков (активные)',
        'Избранное',
        'Коллекция',
        'Поиск по всем значкам',
      ],
    },
    'squad-corner': {
      features: ['Кабинет отряда', 'Фотоальбом', 'Планер дня', 'Флаговые значки'],
    },
    diary: {
      features: ['Ежедневные записи', 'Рефлексия дня', 'Впечатления', 'Анализ смены'],
    },
    engine: {
      features: ['Мои движки', 'Предложить движок', 'Голосование', 'Реализованные'],
    },
    council: {
      features: ['Инициативы', 'Голосования', 'Решения совета', 'Мои предложения'],
    },
    bro: {
      features: ['Посвящение', 'Крыло БРО', 'Участники', 'Традиции'],
    },
    workshop: {
      features: ['Кузница Смыслов', 'Мои значки', 'Идеи', 'Ревью', 'Арты', 'Задания'],
    },
    'counselor-squad': {
      features: ['Карточка отряда', 'Участники', 'Программа дня', 'Активности'],
    },
    vozhatifikator: {
      features: ['Чек-лист', 'Методическая часть', 'Документы', 'Скачать DOCX'],
    },
    profile4k: {
      features: ['Критическое мышление', 'Коммуникация', 'Коллаборация', 'Креативность'],
    },

    inspector: {
      features: ['Миссии дня', 'Путь пользы', 'Достижения', 'Рефлексия'],
    },
    shifts: {
      features: ['Создание смен', 'Добавление отрядов', 'Коды вступления', 'Кабинет отряда'],
    },
    share: {
      features: ['Приглашение друзей', 'QR-код путеводителя', 'Социальные карточки'],
    },
    events: {
      features: ['Подтверждения значков', 'Проверка планов', 'Запросы модерации'],
    },
    parents: {
      features: ['Информация о смене', 'Программа по дням', 'Контакты', 'Объявления'],
    },
    admin: {
      features: ['Входящие запросы', 'Генерация кодов', 'Модерация', 'Аналитика'],
    },
  };

  const data = stubData[sectionId] || { features: [] };

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {data.features.map((feat, i) => (
          <div
            key={i}
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(93, 228, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(93, 228, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 10,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e8f0ff',
              }}
            >
              {feat}
            </div>
          </div>
        ))}
      </div>

      {/* Integration hint */}
      <div
        style={{
          marginTop: 24,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(93, 228, 255, 0.05)',
          border: '1px dashed rgba(93, 228, 255, 0.2)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.5,
        }}
      >
        Здесь будет контент раздела «{SECTION_INFO[sectionId].title}». Компоненты будут
        интегрированы из существующего ProfileView.
      </div>
    </div>
  );
};

export default PersonalCabinet;
