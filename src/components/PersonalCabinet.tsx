import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/authRole';
import { canModerateBadgeApprovals } from '../types/authRole';
import type { InspectorTabId } from '../types/inspector';

import { getRank } from '../types/userProgress';
import {
    loadMyBadgeRequests,
    type BadgeRequestItem,
} from '../utils/badgeApprovalApi';
import { fetchMyProposals, createWorkshopProposal, type WorkshopProposal } from '../utils/workshopProposalsApi';

import { AdminDashboard } from './AdminDashboard';
import { RealDiaryDashboard, type RealDiaryTabId } from './RealDiaryDashboard';
import BadgeIcon from './BadgeIcon';
import { TeamDashboard, type TeamTabId } from './TeamDashboard';
import { CouncilDashboard, type CouncilTabId } from './CouncilDashboard';
import { InspectorDashboard } from './InspectorDashboard';
import { InspectorCabinetPanel } from './InspectorCabinetPanel';
import { useDataLoader } from '../hooks/useDataLoader';
import { Profile4KDashboard, type Profile4KTabId } from './Profile4KDashboard';
import { CounselorSquadDashboard, type CounselorSquadTabId } from './CounselorSquadDashboard';
// BroInitiation removed — server-backed BroPassportPanel is the single source of truth
import { BroPassportPanel } from './BroPassportPanel';
import { fetchMyPassport } from '../utils/broApi';
import { WingDashboard } from './WingDashboard';
import { InitiationConstructor } from './InitiationConstructor';
import { BroDelaPanel } from './BroDelaPanel';
import { BroSquadPanel } from './BroSquadPanel';
import { ODeConstructorPanel } from './ODeConstructorPanel';
import { SquadCornerDashboard } from './SquadCornerDashboard';
import { SquadCabinetPanel } from './SquadCabinetPanel';
import { SquadChat } from './SquadChat';

import { loadMySquad, type SquadMineResponse } from '../utils/badgeApprovalApi';
import { VozhatifikatorChecklist } from './VozhatifikatorChecklist';

import { CommunityRankingPanel } from './CommunityRankingPanel';
import { ArtInboxTab } from './ArtInboxTab';
import { ImageSourceBlock } from './ImageSourceBlock';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { useTeam } from '../context/TeamContext';
import { CampProgramByDays } from './CampProgramByDays';

import { ShiftsAndSquadsDashboard } from './ShiftsAndSquadsDashboard';
import { QRCodeSVG } from 'qrcode.react';
import { parseMarkdownToc, markdownToHtmlWithHeadingIds } from '../utils/markdown';
import '../styles/cabinet-carousel.css';
import '../styles/cabinet-tokens.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId =
    | 'home'          // Главная (паспорт, путь)
    | 'squad-corner'  // Отрядный уголок
    | 'diary'         // Реальный дневник
    | 'engine'        // Движок
    | 'council'       // Совет лагеря
    | 'bro'           // БРО
    | 'workshop'      // Мастерская
    | 'counselor-squad' // Вожатский отряд
    | 'vozhatifikator'  // Вожатификатор
    | 'profile4k'     // 4К
    | 'progress'      // Карточки прогресса
    | 'admin'         // Пульт управления
    | 'inspector'     // Инспектор Пользы
    | 'shifts'        // Смены и Отряды
    | 'share'         // Поделиться
    | 'events'        // События (подтверждения, планы)
    | 'parents';      // Для родителей

interface SidebarSection {
    id: SectionId;
    label: string;
    group: 'main' | 'staff' | 'system';
    roles?: UserRole[];  // if specified, only these roles see it
    minRole?: boolean;    // requires non-traveler
}

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
    { id: 'shifts', label: 'Смены и Отряды', group: 'staff', roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'] },
    { id: 'counselor-squad', label: 'Вожатский отряд', group: 'staff', roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'] },
    { id: 'profile4k', label: '4К', group: 'staff' },
    { id: 'progress', label: 'Карточки прогресса', group: 'staff' },
    { id: 'parents', label: 'Для родителей', group: 'staff', roles: ['parent', 'developer'] },
    // System
    { id: 'admin', label: 'Пульт управления', group: 'system', roles: ['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'] },
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


type TabDef = { id: string; label: string; icon?: string; isDivider?: boolean; editorOnly?: boolean; staffOnly?: boolean };
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
    ],
    parents: [
        { id: 'program', label: 'Программа' },
        { id: 'child', label: 'Прогресс ребёнка' },
        { id: 'contacts', label: 'Контакты' },
    ],
    profile4k: [
        { id: 'skills', label: 'Навыки' },
    ],
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
    home: { title: 'Главная', description: 'Паспорт значков, карта путешественника, избранное и коллекция', emoji: '' },
    'squad-corner': { title: 'Мой отряд', description: 'Кабинет отряда, фото, планёрка, значки на флаг', emoji: '' },
    diary: { title: 'Реальный дневник', description: 'Ежедневные записи, рефлексия, впечатления от лагеря', emoji: '' },
    engine: { title: 'Движок', description: 'Движки для развития — предлагай, голосуй, запускай!', emoji: '' },
    council: { title: 'Совет лагеря', description: 'Инициативы, голосования, решения совета', emoji: '' },
    bro: { title: 'БРО', description: 'Посвящение в БРО, крыло — сообщество активных участников', emoji: '' },
    workshop: { title: 'Мастерская', description: 'Кузница Смыслов, идеи значков, ревью, арты сообщества', emoji: '' },
    'counselor-squad': { title: 'Вожатский отряд', description: 'Управление отрядом, карточка, программа', emoji: '' },
    vozhatifikator: { title: 'Вожатификатор', description: 'Чек-лист подготовки вожатого, документы', emoji: '' },
    profile4k: { title: '4К', description: 'Четыре ключевых компетенции: критическое мышление, коммуникация, коллаборация, креативность', emoji: '' },
    progress: { title: 'Карточки прогресса', description: 'Прогресс-карты значков, текущие цели, уровни', emoji: '' },
    inspector: { title: 'Инспектор Пользы', description: 'Ежедневные миссии, продвижение по пути пользы', emoji: '' },
    shifts: { title: 'Смены и Отряды', description: 'Управление сменами, создание отрядов, коды вступления', emoji: '' },
    share: { title: 'Поделиться', description: 'Пригласи друзей, поделись QR-кодом путеводителя', emoji: '' },
    events: { title: 'События', description: 'Подтверждения значков, проверка планов', emoji: '' },
    parents: { title: 'Для родителей', description: 'Информация о смене, программа по дням', emoji: '' },
    admin: { title: 'Пульт управления', description: 'Входящие запросы, генерация кодов. Панель разработчика.', emoji: '' },
};

// ---------------------------------------------------------------------------
// Carousel constants (match production)
// ---------------------------------------------------------------------------
const CAROUSEL_STATIC_MAX = 5;

// ---------------------------------------------------------------------------
// Markdown document tab viewer (for Inspector reference materials)
// ---------------------------------------------------------------------------

const MarkdownDocTab: React.FC<{ mdPath: string }> = ({ mdPath }) => {
    const [html, setHtml] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(mdPath)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
            .then(md => {
                if (cancelled) return;
                const toc = parseMarkdownToc(md);
                const rendered = markdownToHtmlWithHeadingIds(md, toc);
                setHtml(rendered);
            })
            .catch(e => { if (!cancelled) setError(String(e)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [mdPath]);

    return (
        <div style={{
            position: 'relative',
            marginTop: 16,
            minHeight: '200px', // Fallback for very short content to still have a glassy frame
            color: '#e8f0ff'
        }}>
            {/* 
              This is the secret sauce: a sticky glass pane inside an absolute wrapper.
              It visually sticks to the screen while you scroll native long text, 
              preventing Chromium backdrop-filter crash on 4000px+ height elements.
            */}
            <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                pointerEvents: 'none', zIndex: 0
            }}>
                <div style={{
                    position: 'sticky',
                    top: 16,
                    height: '100%', 
                    maxHeight: '120vh', // Extends far below the screen so the bottom edge is hidden while scrolling long text!
                    background: 'rgba(8, 20, 40, 0.15)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 24,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 16px 40px rgba(0,0,0,0.3)',
                }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px', paddingBottom: 64 }}>
                {loading && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Загрузка документа...</div>}
                {error && <div style={{ padding: 32, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>Не удалось загрузить: {error}</div>}
                {html && (
                    <div
                        className="markdown-body inspector-doc"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )}
            </div>
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
    const { userData, updateVozhatifikatorChecklist, toggleFavorite, removeRoute, setNickname, setAvatar, setProfileStatus, setProfileBio } = useUserProgress();
    const { role, accessToken, deviceId } = useAuth();
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

    // Workshop proposals from API (used in "Мои проекты" tab)
    const [cabinetProposals, setCabinetProposals] = useState<WorkshopProposal[]>([]);
    useEffect(() => {
        if (!effectiveToken) return;
        let cancelled = false;
        fetchMyProposals(effectiveToken).then(rows => { if (!cancelled) setCabinetProposals(rows); }).catch(() => {});
        return () => { cancelled = true; };
    }, [effectiveToken]);

    // Badge lookup map for image resolution (matches production pattern)
    const badgeLookupMap = React.useMemo(() => {
        const map = new Map<string, { title: string; emoji: string; category_id: string; level?: string }>();
        allBadges.forEach((b: any) => {
            map.set(String(b.id), { title: b.title || '', emoji: b.emoji || '', category_id: b.category_id || '', level: b.level });
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
    const [broTab, setBroTab] = useState<'initiation' | 'wing' | 'constructor' | 'chat' | 'brodela' | 'brosquad' | 'ode'>('initiation');
    const [broPassportComplete, setBroPassportComplete] = useState(false);
    const [squadCornerTab, setSquadCornerTab] = useState<string>('squad');
    const [workshopTab, setWorkshopTab] = useState<string>('constructor');
    const [wsProposalType, setWsProposalType] = useState<'badge' | 'category' | 'version'>('badge');
    const [wsTitle, setWsTitle] = useState('');
    const [wsDescription, setWsDescription] = useState('');
    const [wsEmoji, setWsEmoji] = useState('');
    const [wsBadgeId, setWsBadgeId] = useState('');
    const [wsImage, setWsImage] = useState<string | null>(null);
    const [wsBusy, setWsBusy] = useState(false);

    const handleWsSubmit = async () => {
        if (!wsTitle.trim() || !effectiveToken) return;
        if (wsProposalType === 'version' && !wsBadgeId.trim()) return;
        setWsBusy(true);
        try {
            const created = await createWorkshopProposal(effectiveToken, {
                type: wsProposalType,
                title: wsTitle.trim(),
                description: wsDescription.trim() || undefined,
                emoji: wsProposalType === 'category' ? (wsEmoji.trim() || '📁') : undefined,
                badgeId: wsProposalType === 'version' ? wsBadgeId.trim() : undefined,
                image: wsImage || undefined,
            });
            setCabinetProposals(prev => [created, ...prev]);
            setWsTitle(''); setWsDescription(''); setWsEmoji(''); setWsBadgeId(''); setWsImage(null);
        } catch (_) { /* handled silently */ }
        setWsBusy(false);
    };
    const [shareTab, setShareTab] = useState<'invite' | 'qr'>('invite');
    const [parentsTab, setParentsTab] = useState<'program' | 'child' | 'contacts'>('program');
    const [eventsTab, setEventsTab] = useState<'requests' | 'announcements' | 'tasks'>('requests');
    const [myRequests, setMyRequests] = useState<BadgeRequestItem[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [homeTab, setHomeTab] = useState<'active' | 'favorites' | 'collection' | 'journal' | 'squads'>('active');
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    const [pathCarouselSteps, setPathCarouselSteps] = useState(0);
    const [favCarouselSteps, setFavCarouselSteps] = useState(0);
    const [vozhatifikatorTab, setVozhatifikatorTab] = useState<string>('book');
    const [inspectorTab, setInspectorTab] = useState<string>('missions');
    const [vozhatifikatorHtml, setVozhatifikatorHtml] = useState<string | null>(null);
    const [vozhatifikatorToc, setVozhatifikatorToc] = useState<Array<{ id: string; title: string }>>([]);
    const [vozhatifikatorLoading, setVozhatifikatorLoading] = useState(false);
    const [vozhatifikatorError, setVozhatifikatorError] = useState<string | null>(null);
    const vozhatifikatorBookRef = React.useRef<HTMLDivElement | null>(null);

    // Squad cabinet state (mirrors production: loadMySquad -> SquadCabinetPanel)
    const [mySquadInfoApi, setMySquadInfoApi] = useState<SquadMineResponse | null>(null);
    const loadSquadInfo = useCallback(async () => {
        if (!accessToken && !deviceId) return;
        try {
            const info = await loadMySquad(accessToken || '', deviceId);
            setMySquadInfoApi(info);
        } catch {
            setMySquadInfoApi(null);
        }
    }, [accessToken, deviceId]);
    useEffect(() => { void loadSquadInfo(); }, [loadSquadInfo]);

    // Load Вожатификатор book (markdown → HTML + TOC)
    useEffect(() => {
        if (activeSection !== 'vozhatifikator' || vozhatifikatorTab !== 'book' || vozhatifikatorHtml !== null) return;
        const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
        const url = `${base}${base ? '/' : ''}vozhatifikator.md`;
        let cancelled = false;
        setVozhatifikatorLoading(true);
        setVozhatifikatorError(null);
        fetch(url)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
            .then(md => {
                if (cancelled) return;
                const toc = parseMarkdownToc(md);
                const html = markdownToHtmlWithHeadingIds(md, toc);
                setVozhatifikatorToc(toc);
                setVozhatifikatorHtml(html);
            })
            .catch(e => { if (!cancelled) setVozhatifikatorError(e instanceof Error ? e.message : 'Ошибка загрузки'); })
            .finally(() => { if (!cancelled) setVozhatifikatorLoading(false); });
        return () => { cancelled = true; };
    }, [activeSection, vozhatifikatorTab, vozhatifikatorHtml]);

    // Fetch BRO passport completion status from server
    useEffect(() => {
        if (!deviceId) return;
        fetchMyPassport(deviceId).then(p => {
            setBroPassportComplete(p?.status === 'completed');
        }).catch(() => setBroPassportComplete(false));
    }, [deviceId]);

    // Profile editing state
    const [profileEditing, setProfileEditing] = useState(false);
    const [nicknameInput, setNicknameInput] = useState('');
    const [avatarInput, setAvatarInput] = useState('');
    const [statusInput, setStatusInput] = useState('');
    const [bioInput, setBioInput] = useState('');
    const avatarFileRef = React.useRef<HTMLInputElement | null>(null);

    // Signal to hide AuthFloatingButton while cabinet is open
    useEffect(() => {
        document.body.setAttribute('data-cabinet-open', '1');
        return () => { document.body.removeAttribute('data-cabinet-open'); };
    }, []);

    const navigateToBadge = useCallback(async (badgeId: string, _action?: 'plan' | 'confirm') => {
        // Ensure badge & category data is loaded
        await ensureBadgeLoaded(badgeId);
        const categoryId = String(badgeId).split('.')[0];
        if (categoryId) await ensureCategoryBadgesLoaded(categoryId);
        // Wait for state updates
        await new Promise(r => setTimeout(r, 300));
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
    }, [ensureBadgeLoaded, ensureCategoryBadgesLoaded]);

    const profile = userData?.profile || {};
    const nickname = (profile as any)?.nickname || 'Искатель';
    const avatar = (profile as any)?.avatar || '';
    const profileStatus = (profile as any)?.status || '';
    const profileBio = (profile as any)?.bio || '';
    const currentRole = role || 'traveler';
    const roleInfo = ROLE_DISPLAY[currentRole] || ROLE_DISPLAY.traveler;

    // Rank/progress calculation
    const progress = userData?.progress || {};
    const favorites: string[] = (userData as any)?.favorites || [];
    const currentLevels = Object.values(progress).filter((p: any) => p.status === 'achieved').length;
    const rankThresholds = [0, 5, 15, 30, 50, 75, 100];
    const currentRankIdx = rankThresholds.findIndex((_, i) => (rankThresholds[i + 1] ?? Infinity) > currentLevels);
    const nextRankAt = rankThresholds[currentRankIdx + 1] ?? rankThresholds[rankThresholds.length - 1];
    const prevRankAt = rankThresholds[currentRankIdx] ?? 0;
    const xpPercent = nextRankAt > prevRankAt ? Math.min(100, ((currentLevels - prevRankAt) / (nextRankAt - prevRankAt)) * 100) : 100;
    const rankNames = ['Новичок', 'Исследователь', 'Путешественник', 'Мастер', 'Легенда', 'Хранитель', 'Архитектор'];
    const rank = rankNames[currentRankIdx] || 'Новичок';
    // Use production getRank when possible
    const prodRank = getRank(profile?.stats?.totalLevelsAchieved || currentLevels);

    // Compute badgeTitlesInPath / favoriteBadgeTitles (matches ProfileView production logic)
    const getBaseId = (rawId: string) => {
        const clean = String(rawId || '').trim();
        if (!clean) return '';
        const parts = clean.split('.').filter(Boolean);
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : clean;
    };

    const { badgeTitlesInPath, favoriteBadgeTitles } = useMemo(() => {
        const pathTitles = new Set<string>();
        const favTitles = new Set<string>();
        const resolveTitle = (baseId: string): string | null => {
            const b = badgeLookupMap.get(baseId);
            if (b?.title) return b.title;
            const found = allBadges.find((b: any) => b.id === baseId || String(b.id).startsWith(baseId + '.'));
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
        });
        return {
            badgeTitlesInPath: Array.from(pathTitles).slice(0, 10),
            favoriteBadgeTitles: Array.from(favTitles).slice(0, 10),
        };
    }, [progress, favorites, badgeLookupMap, allBadges]);

    // Squad membership & role-based permissions (matches ProfileView)
    const hasSquadMembership = Boolean(mySquadInfoApi?.membership?.squadId || userData?.diaryProgress?.squad?.name);
    const canEditSquadCorner = currentRole === 'counselor' || currentRole === 'developer';

    // Fallback: build mySquadInfo from local diary when API unavailable
    const mySquadInfo: SquadMineResponse | null = mySquadInfoApi ?? (
        hasSquadMembership ? {
            membership: {
                deviceId: deviceId || 'local-device',
                campId: 'local-camp',
                squadId: userData?.diaryProgress?.squad?.name || 'local-squad',
                role: currentRole,
                joinedAt: new Date().toISOString(),
                nickname: nickname,
            },
            squad: {
                id: userData?.diaryProgress?.squad?.name || 'local-squad',
                shiftId: 'local-shift',
                name: userData?.diaryProgress?.squad?.name || 'Отряд',
            },
            shift: { id: 'local-shift', name: 'Тестовая смена' },
            participants: [],
        } : null
    );

    // Derive default shift length (9 or 21 days) from the user's shift data
    const defaultShiftLength: 9 | 21 = (() => {
        const shift = mySquadInfo?.shift;
        if (!shift) return 21;
        if (shift.durationDays === 9 || shift.durationDays === 21) return shift.durationDays;
        // Infer from name: летняя = 21 days, everything else (весенняя/осенняя/зимняя) = 9 days
        if (shift.name) return shift.name.toLowerCase().includes('лет') ? 21 : 9;
        return 21;
    })();


    const openProfileEditor = () => {
        setNicknameInput(nickname);
        setAvatarInput(avatar);
        setStatusInput(profileStatus);
        setBioInput(profileBio);
        setProfileEditing(true);
        setActiveSection('home'); // profile renders in home content area
    };

    const cancelProfileEditor = () => {
        setProfileEditing(false);
    };

    const saveProfile = () => {
        setNickname(nicknameInput);
        setAvatar(avatarInput);
        setProfileStatus(statusInput);
        setProfileBio(bioInput.trim().slice(0, 160));
        setProfileEditing(false);
    };

    const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { setAvatarInput(reader.result as string); };
        reader.readAsDataURL(file);
    };

    const isImageAvatar = (v: any) => typeof v === 'string' && (v.startsWith('data:') || v.startsWith('http') || v.startsWith('/'));

    // Filter sections by role
    const visibleSections = useMemo(() => {
        return SECTIONS.filter(s => {
            if (s.roles && !s.roles.includes(currentRole as UserRole)) return false;
            if (s.minRole && (currentRole === 'traveler' || !currentRole)) return false;
            return true;
        });
    }, [currentRole]);

    const mainSections = visibleSections.filter(s => s.group === 'main');
    const staffSections = visibleSections.filter(s => s.group === 'staff');
    const systemSections = visibleSections.filter(s => s.group === 'system');

    const currentInfo = SECTION_INFO[activeSection];

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
            setWsProposalType('badge'); // Default to creating a badge when coming from category
        }

        // Clean up URL parameters
        const remaining = params.toString();
        if (panel || squadId) {
            window.history.replaceState(null, '',
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
            <div style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                backgroundImage: `url('/RL-Guide-book/фон кабина.png')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                backgroundColor: '#0a1628',
                display: 'flex', fontFamily: FONT, color: '#e8f0ff',
            }}>
                {/* ═══ Колонка 1: Навигация разделов ═══ */}
                <div style={{
                    width: 180, flexShrink: 0,
                    background: 'linear-gradient(180deg, rgba(120,80,255,0.04) 0%, transparent 40%), linear-gradient(270deg, rgba(80,140,255,0.05) 0%, transparent 40%), linear-gradient(180deg, #111827 0%, #0B1020 100%)',
                    backgroundColor: '#111827',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', flexDirection: 'column',
                    padding: '8px 6px', gap: 1, overflowY: 'auto',
                }}>
                    {/* Hamburger button */}
                    <button type="button" onClick={() => setHamburgerOpen(!hamburgerOpen)}
                        style={{
                            width: '100%', height: 40, border: 'none', borderRadius: 10,
                            background: hamburgerOpen ? 'rgba(93,228,255,0.15)' : 'transparent',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '0 12px', fontFamily: FONT,
                            color: hamburgerOpen ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                            transition: 'all 0.15s', marginBottom: 6,
                        }}>
                        <span style={{ fontSize: 16 }}>☰</span>
                        Профиль
                    </button>

                    {/* Section buttons — main */}
                    {mainSections.map(s => (
                        <button key={s.id} type="button" className="cabinet-sidebar-btn"
                            onClick={() => { setActiveSection(s.id); setHamburgerOpen(false); }}
                            style={{
                                width: '100%', border: 'none', borderRadius: 8,
                                padding: '9px 12px', textAlign: 'left',
                                background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                                cursor: 'pointer', fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400,
                                fontFamily: FONT,
                                color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                                transition: 'all 0.15s', letterSpacing: '-0.01em',
                            }}>
                            {s.label}
                        </button>
                    ))}

                    {/* Separator + label */}
                    {staffSections.length > 0 && (
                        <>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 10px' }} />
                            <div style={{
                                padding: '4px 12px', fontSize: 10, fontWeight: 600,
                                color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Инструменты
                            </div>
                        </>
                    )}

                    {/* Section buttons — staff */}
                    {staffSections.map(s => (
                        <button key={s.id} type="button" className="cabinet-sidebar-btn"
                            onClick={() => { setActiveSection(s.id); setHamburgerOpen(false); }}
                            style={{
                                width: '100%', border: 'none', borderRadius: 8,
                                padding: '9px 12px', textAlign: 'left',
                                background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                                cursor: 'pointer', fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400,
                                fontFamily: FONT,
                                color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                                transition: 'all 0.15s', letterSpacing: '-0.01em',
                            }}>
                            {s.label}
                        </button>
                    ))}

                    {/* System sections at bottom */}
                    {systemSections.length > 0 && (
                        <>
                            <div style={{ flex: 1 }} />
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 10px' }} />
                            {systemSections.map(s => (
                                <button key={s.id} type="button" className="cabinet-sidebar-btn"
                                    onClick={() => { setActiveSection(s.id); setHamburgerOpen(false); }}
                                    style={{
                                        width: '100%', border: 'none', borderRadius: 8,
                                        padding: '9px 12px', textAlign: 'left',
                                        background: activeSection === s.id ? 'rgba(93,228,255,0.15)' : 'transparent',
                                        cursor: 'pointer', fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400,
                                        fontFamily: FONT,
                                        color: activeSection === s.id ? '#5de4ff' : 'rgba(255,255,255,0.6)',
                                        transition: 'all 0.15s', letterSpacing: '-0.01em',
                                    }}>
                                    {s.label}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* ═══ Гармошка: панель профиля (выезжает поверх Колонки 1) ═══ */}
                {hamburgerOpen && (
                    <>
                        {/* Backdrop — клик мимо закрывает */}
                        <div
                            onClick={() => setHamburgerOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 100,
                                background: 'rgba(0,0,0,0.3)',
                            }}
                        />
                        {/* Slide-over panel */}
                        {/* Slide-over panel */}
                        <div style={{
                            position: 'fixed', top: 0, left: 0, bottom: 0,
                            width: 280, zIndex: 101,
                            background: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                            borderRight: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column',
                            padding: '32px 24px',
                            boxShadow: '8px 0 40px rgba(0,0,0,0.08)',
                            animation: 'slideInLeft 0.2s ease-out',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        }}>
                            {/* Avatar */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                <div style={{
                                    width: 140, height: 140, borderRadius: '50%',
                                    background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: avatar.length <= 2 ? 56 : 32, fontWeight: 500, color: '#0f172a',
                                    overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                                }}>
                                    {avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:') ? (
                                        <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (avatar || nickname.charAt(0).toUpperCase())}
                                </div>
                            </div>
                            {/* Name + Role */}
                            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>{nickname}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 400, color: '#3390ec' }}>{roleInfo.label}</span>
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 0 12px' }} />
                            {/* Menu items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[
                                    { label: 'Мой профиль', action: () => { openProfileEditor(); setHamburgerOpen(false); } },
                                    { label: 'Инспектор Пользы', action: () => { setActiveSection('inspector'); setHamburgerOpen(false); } },
                                    ...(onBack ? [{ label: 'Выйти из кабинета', action: () => { setHamburgerOpen(false); onBack(); } }] : []),
                                ].map((item, i) => (
                                    <button key={i} type="button" onClick={item.action}
                                        style={{
                                            padding: '12px 14px', borderRadius: 8, border: 'none',
                                            background: 'transparent', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            color: '#111827', fontSize: 14, fontWeight: 500,
                                            fontFamily: 'inherit', transition: 'background 0.15s', textAlign: 'left',
                                            width: '100%'
                                        }}
                                        onMouseEnter={e => { 
                                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; 
                                        }}
                                        onMouseLeave={e => { 
                                            e.currentTarget.style.background = 'transparent'; 
                                        }}>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ═══ Колонка 2: Список табов (160px) ═══ */}
                <div style={{
                    width: 160, flexShrink: 0,
                    background: 'rgba(8, 20, 40, 0.12)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    borderRight: '1px solid rgba(93,228,255,0.08)',
                    display: 'flex', flexDirection: 'column',
                    overflowY: 'auto',
                }}>

                    {/* Section title */}
                    <div style={{
                        padding: '14px 16px 10px', fontSize: 12, fontWeight: 700,
                        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}>
                        {currentInfo.title}
                    </div>

                    {/* Tab list items */}
                    {(() => {
                        const tabs = SECTION_TABS[activeSection];
                        if (!tabs) return (
                            <div style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                                {currentInfo.description}
                            </div>
                        );

                        // Determine current active tab for this section
                        const getActiveTabId = (): string => {
                            switch (activeSection) {
                                case 'home': return homeTab;
                                case 'squad-corner': return squadCornerTab;
                                case 'diary': return diaryTab;
                                case 'engine': return teamTab;
                                case 'council': return councilTab;
                                case 'bro': return broTab;
                                case 'workshop': return workshopTab;
                                case 'share': return shareTab;
                                case 'parents': return parentsTab;
                                case 'events': return eventsTab as string;
                                case 'profile4k': return profile4kTab;
                                case 'vozhatifikator': return vozhatifikatorTab;
                                case 'inspector': return inspectorTab;
                                default: return tabs[0]?.id || '';
                            }
                        };
                        const setActiveTabId = (tabId: string) => {
                            switch (activeSection) {
                                case 'home': setHomeTab(tabId as any); break;
                                case 'squad-corner': setSquadCornerTab(tabId); break;
                                case 'diary': setDiaryTab(tabId as any); break;
                                case 'engine': setTeamTab(tabId as any); break;
                                case 'council': setCouncilTab(tabId as any); break;
                                case 'bro': setBroTab(tabId as any); break;
                                case 'workshop': setWorkshopTab(tabId); break;
                                case 'share': setShareTab(tabId as any); break;
                                case 'parents': setParentsTab(tabId as any); break;
                                case 'events': setEventsTab(tabId as 'requests' | 'announcements' | 'tasks'); break;
                                case 'profile4k': setProfile4kTab(tabId as any); break;
                                case 'vozhatifikator': setVozhatifikatorTab(tabId as any); break;
                                case 'inspector': setInspectorTab(tabId); break;
                            }
                        };
                        const activeTabId = getActiveTabId();

                        const isStaff = canModerateBadgeApprovals(currentRole as UserRole);
                        const visibleTabs = activeSection === 'squad-corner'
                            ? tabs.filter(t => !t.editorOnly || canEditSquadCorner)
                            : activeSection === 'council'
                              ? tabs.filter(t => !t.staffOnly || isStaff)
                              : tabs;
                        return visibleTabs.map(tab => {
                            if (tab.isDivider) {
                                return (
                                    <div key={tab.id} style={{
                                        height: 1,
                                        background: 'rgba(255,255,255,0.06)',
                                        margin: '8px 16px'
                                    }} />
                                );
                            }
                            return (
                                <button key={tab.id} type="button"
                                    onClick={() => setActiveTabId(tab.id)}
                                    style={{
                                        padding: '10px 16px', border: 'none', textAlign: 'left',
                                        background: activeTabId === tab.id ? 'rgba(93,228,255,0.12)' : 'transparent',
                                        borderLeft: activeTabId === tab.id ? '3px solid #5de4ff' : '3px solid transparent',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        color: activeTabId === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                                        fontSize: 14, fontWeight: activeTabId === tab.id ? 600 : 400,
                                        fontFamily: FONT, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { if (activeTabId !== tab.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { if (activeTabId !== tab.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    {tab.icon && <span style={{ fontSize: 16 }}>{tab.icon}</span>}
                                    {tab.label}
                                </button>
                            );
                        });
                    })()}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 120px' }}>
                    <div style={{ width: '100%', maxWidth: (activeSection === 'council' && (councilTab === 'camp-management' || councilTab === 'management')) ? 'none' : 680, margin: '0 auto' }}>


                        {/* ── Profile Editor (when profileEditing is true) ── */}
                        {profileEditing ? (
                            <div className="fade-in" style={{
                                maxWidth: 520, margin: '0 auto',
                                background: 'rgba(8, 20, 40, 0.15)',
                                borderRadius: 20, border: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '32px 28px',
                                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.25)'
                            }}>
                                <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#e8f0ff', textAlign: 'center' }}>
                                    Профиль
                                </h2>

                                {/* Avatar */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                                    <div style={{
                                        width: 160, height: 160, borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.04)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)',
                                        marginBottom: 16, cursor: 'pointer',
                                    }} onClick={() => avatarFileRef.current?.click()}>
                                        {isImageAvatar(avatarInput) ? (
                                            <img src={avatarInput} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: 64, opacity: 0.8 }}>{avatarInput || nickname.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                                    <button type="button" onClick={() => avatarFileRef.current?.click()}
                                        style={{ 
                                            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                            background: 'rgba(255,255,255,0.04)', border: 'none',
                                            color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: FONT,
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                    >
                                        Загрузить фото
                                    </button>
                                </div>

                                {/* Fields */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Ник
                                        </span>
                                        <input className="cab-input" value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} placeholder="Никнейм" />
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Направление
                                        </span>
                                        <input className="cab-input" value={statusInput} onChange={e => setStatusInput(e.target.value)} maxLength={80} placeholder="Направление" />
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Сейчас делаю
                                        </span>
                                        <textarea className="cab-input" value={bioInput} onChange={e => setBioInput(e.target.value)} maxLength={160} placeholder="Коротко. Одна мысль." style={{ minHeight: 80, resize: 'vertical' }} />
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: -2 }}>
                                            {bioInput.length}/160
                                        </span>
                                    </label>
                                </div>

                                {/* Rank */}
                                <div style={{ margin: '24px 0 12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Ранг</span>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{rank} · Уровень {currentLevels}</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${xpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #8B00FF, #FFD700)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{prevRankAt} ур.</span>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                    <button type="button" className="cab-btn-glass" onClick={cancelProfileEditor} style={{ flex: 1, padding: '12px 20px', fontSize: 14 }}>
                                        Отмена
                                    </button>
                                    <button type="button" onClick={saveProfile}
                                        style={{
                                            flex: 1, padding: '12px 20px', borderRadius: 12,
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #8B00FF, #FFD700)',
                                            color: '#fff', fontSize: 14, fontWeight: 700,
                                            cursor: 'pointer', fontFamily: FONT,
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                            boxShadow: '0 4px 16px rgba(139,0,255,0.3)',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139,0,255,0.45)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,0,255,0.3)'; }}
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        ) :

                            activeSection === 'home' ? (() => {
                                const progress = userData?.progress || {};
                                const favorites: string[] = (userData as any)?.favorites || [];

                                const pathItems = Object.entries(progress)
                                    .filter(([, p]) => p.status === 'in_progress')
                                    .map(([levelId]) => {
                                        const parts = levelId.split('.');
                                        return { baseId: parts.length >= 3 ? `${parts[0]}.${parts[1]}` : levelId, levelId, categoryId: parts[0] || '1' };
                                    });
                                const seenP = new Set<string>();
                                const uniquePath = pathItems.filter(p => { if (seenP.has(p.baseId)) return false; seenP.add(p.baseId); return true; });

                                const favoriteItems = favorites.map(id => {
                                    const parts = id.split('.');
                                    return { baseId: parts.length >= 3 ? `${parts[0]}.${parts[1]}` : id, levelId: id, categoryId: parts[0] || '1' };
                                });
                                const seenF = new Set<string>();
                                const uniqueFav = favoriteItems.filter(p => { if (seenF.has(p.baseId)) return false; seenF.add(p.baseId); return true; });



                                // ── SVG icons (same as production ProfileView.tsx) ──
                                const CabIcons = {
                                    Star: ({ filled }: { filled?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"} stroke={filled ? "#FFD700" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 12.27 17 17.14 18.18 21.02 12 17.77 5.82 21.02 7 17.14 2 12.27 8.91 8.26 12 2" /></svg>,
                                    Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
                                    Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
                                    ArrowRight: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
                                    ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
                                };

                                // ── Path card (production-matching structure from ProfileView.tsx) ──
                                const renderPathCard = (
                                    { baseId, levelId, categoryId }: { baseId: string; levelId: string; categoryId: string },
                                    isPath: boolean,
                                ) => {
                                    const isFav = favorites.some(f => f === baseId || f.startsWith(baseId + '.'));
                                    const badgeMeta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
                                    const badgeTitle = badgeMeta?.title || '';
                                    const badgeEmoji = badgeMeta?.emoji || '';
                                    return (
                                        <div className="path-card path-card--vertical">
                                            <div className="path-card__avatar-wrap">
                                                <div className="path-card__avatar" onClick={() => navigateToBadge(baseId)}>
                                                    <BadgeIcon badgeId={baseId} badgeTitle={badgeTitle} categoryId={categoryId} emoji={badgeEmoji} size="responsive" levelId={levelId !== baseId ? levelId : undefined} levelTitle={badgeMeta?.level} />
                                                </div>
                                            </div>
                                            <div className="path-card__actions">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); const fn = (window as any).__openBadgePlan__; if (typeof fn === 'function') { fn({ id: levelId, title: badgeTitle, level: badgeMeta?.level, criteria: (badgeMeta as any)?.criteria || (badgeMeta as any)?.howToBecome, nameExplanation: (badgeMeta as any)?.nameExplanation, skillTips: (badgeMeta as any)?.skillTips, confirmation: (badgeMeta as any)?.confirmation }); } else { navigateToBadge(baseId); } }} className="btn-pill btn-pill--secondary">Составить план</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); const fn = (window as any).__openBadgeProof__; if (typeof fn === 'function') { fn({ id: levelId, title: badgeTitle }); } else { navigateToBadge(baseId); } }} className="btn-pill btn-pill--primary">Подтвердить <CabIcons.Send /></button>
                                            </div>
                                            <div className="path-card__footer">
                                                {isPath ? (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm('Удалить?')) removeRoute(baseId); }} className="btn-action-round trash" aria-label="Удалить из пути"><CabIcons.Trash /></button>
                                                ) : (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }} className="btn-action-round trash" aria-label="Убрать из избранного"><CabIcons.Trash /></button>
                                                )}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }} className={`path-card__star ${isFav ? 'fav' : ''}`} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}><CabIcons.Star filled={isFav} /></button>
                                                <button type="button" className="btn-action-round btn-go-badge" onClick={(e) => { e.stopPropagation(); navigateToBadge(baseId); }} title="Перейти к значку" aria-label="Перейти к значку"><CabIcons.ArrowRight /></button>
                                            </div>
                                        </div>
                                    );
                                };

                                const renderCarousel = (
                                    items: typeof uniquePath,
                                    isPath: boolean,
                                    rotationSteps: number,
                                    setRotationSteps: React.Dispatch<React.SetStateAction<number>>,
                                ) => {
                                    if (items.length <= CAROUSEL_STATIC_MAX) {
                                        return (
                                            <div className="cabinet-carousel">
                                                <div className="path-carousel path-carousel--static">
                                                    <div className="path-carousel__static-track">
                                                        {items.map((item, idx) => (
                                                            <div key={`static-${idx}-${item.baseId}`} className="path-carousel__item path-carousel__item--static">
                                                                {renderPathCard(item, isPath)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const n = items.length;
                                    const stepDeg = `${360 / Math.max(1, n)}deg`;
                                    const radius = `${(180 + 20) / (2 * Math.sin(Math.PI / Math.max(1, n)))}px`;
                                    return (
                                        <div className="cabinet-carousel">
                                            <div className="path-carousel path-carousel--cylinder">
                                                <button type="button" className="path-carousel__btn path-carousel__btn--prev"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRotationSteps(s => s - 1); }}
                                                    aria-label="Вращать влево"><CabIcons.ArrowLeft /></button>
                                                <div className="path-carousel__viewport path-carousel__viewport--cylinder">
                                                    <div className="path-carousel__track path-carousel__track--cylinder"
                                                        style={{
                                                            ['--path-rotation-steps' as string]: rotationSteps,
                                                            ['--step-deg' as string]: stepDeg,
                                                            ['--radius' as string]: radius,
                                                        }}>
                                                        {items.map((item, idx) => (
                                                            <div key={`cyl-${idx}-${item.baseId}`}
                                                                className="path-carousel__item path-carousel__item--cylinder"
                                                                style={{ ['--slot-offset' as string]: idx }}>
                                                                {renderPathCard(item, isPath)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button type="button" className="path-carousel__btn path-carousel__btn--next"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRotationSteps(s => s + 1); }}
                                                    aria-label="Вращать вправо"><CabIcons.ArrowRight /></button>
                                            </div>
                                        </div>
                                    );
                                };

                                const svgIcons: Record<string, React.ReactNode> = {
                                    compass: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" opacity=".3" /></svg>,
                                    star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
                                    medal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="6" /><path d="M8.21 3.32L7 8h10l-1.21-4.68A2 2 0 0 0 13.85 2h-3.7a2 2 0 0 0-1.94 1.32z" /><line x1="12" y1="11" x2="12" y2="17" /></svg>,
                                    book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
                                };

                                const emptyState = (iconKey: string, title: string, desc: string) => (
                                    <div className="cab-empty-state fade-in">
                                        <div className="cab-empty-state__icon">{svgIcons[iconKey] || svgIcons.star}</div>
                                        <div className="cab-empty-state__title">{title}</div>
                                        <div className="cab-empty-state__desc">{desc}</div>
                                    </div>
                                );

                                return (
                                    <div>
                                        {/* В пути */}
                                        {homeTab === 'active' && (
                                            <div key="home-active">
                                            {uniquePath.length > 0
                                                ? <div className="fade-in" style={{ borderRadius: 16, padding: 20, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>{renderCarousel(uniquePath, true, pathCarouselSteps, setPathCarouselSteps)}</div>
                                                : emptyState('compass', 'Здесь будут значки, которые ты взял в путь', 'Открой любой значок в каталоге и нажми «В путь» — или добавь в избранное, чтобы быстро возвращаться к ним.')}
                                            </div>
                                        )}
                                        {/* Избранное */}
                                        {homeTab === 'favorites' && (
                                            <div key="home-favorites">
                                            {uniqueFav.length > 0
                                                ? <div className="fade-in" style={{ borderRadius: 16, padding: 20, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>{renderCarousel(uniqueFav, false, favCarouselSteps, setFavCarouselSteps)}</div>
                                                : emptyState('star', 'Нет избранных значков', 'Отмечай значки звёздочкой, чтобы они появились здесь.')}
                                            </div>
                                        )}
                                        {/* Коллекция */}
                                        {homeTab === 'collection' && (
                                            <div key="home-collection" style={{
                                                maxWidth: 720, margin: '0 auto', width: '100%',
                                            }}>
                                                {(() => {
                                                    const achievedItems = Object.entries(progress)
                                                        .filter(([, p]) => p.status === 'achieved')
                                                        .map(([levelId, p]) => {
                                                            const parts = levelId.split('.');
                                                            const baseId = parts.length >= 3 ? `${parts[0]}.${parts[1]}` : levelId;
                                                            const meta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
                                                            return { baseId, levelId, categoryId: parts[0] || '1', title: meta?.title || baseId, emoji: meta?.emoji || '', achievedAt: (p as any)?.achievedAt || '' };
                                                        });
                                                    const seen = new Set<string>();
                                                    const unique = achievedItems.filter(a => { if (seen.has(a.baseId)) return false; seen.add(a.baseId); return true; });

                                                    return unique.length > 0 ? (
                                                        <>
                                                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                                                                Собрано {unique.length} {unique.length === 1 ? 'значок' : unique.length < 5 ? 'значка' : 'значков'}
                                                            </div>
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                                gap: 12,
                                                            }}>
                                                                {unique.map(a => (
                                                                    <div key={a.baseId}
                                                                        className="fade-in"
                                                                        onClick={() => navigateToBadge(a.baseId)}
                                                                        style={{
                                                                            padding: 16, borderRadius: 14,
                                                                            background: 'rgba(15, 10, 42, 0.12)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                            cursor: 'pointer', textAlign: 'center',
                                                                            transition: 'all 0.15s',
                                                                            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                                        }}>
                                                                        <div style={{ width: 64, height: 64, margin: '0 auto 8px' }}>
                                                                            <BadgeIcon badgeId={a.baseId} badgeTitle={a.title} categoryId={a.categoryId} emoji={a.emoji} size="responsive" />
                                                                        </div>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f0ff', lineHeight: 1.3 }}>{a.title}</div>
                                                                        {a.achievedAt && (
                                                                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                                                                                {new Date(a.achievedAt).toLocaleDateString('ru-RU')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    ) : emptyState('medal', 'Коллекция пуста', 'Завершай значки, чтобы они появлялись здесь.');
                                                })()}
                                            </div>
                                        )}
                                        {/* Журнал */}
                                        {homeTab === 'journal' && (() => {
                                            // Build per-badge progress cards from userData.progress
                                            const progressEntries = Object.entries(progress);
                                            const badgeProgress = new Map<string, { baseId: string; title: string; categoryId: string; emoji: string; levels: { id: string; status: string }[] }>();
                                            progressEntries.forEach(([levelId, p]) => {
                                                const parts = levelId.split('.');
                                                const baseId = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : levelId;
                                                const meta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
                                                if (!badgeProgress.has(baseId)) {
                                                    badgeProgress.set(baseId, {
                                                        baseId,
                                                        title: meta?.title || baseId,
                                                        categoryId: parts[0] || '1',
                                                        emoji: meta?.emoji || '',
                                                        levels: [],
                                                    });
                                                }
                                                badgeProgress.get(baseId)!.levels.push({ id: levelId, status: p.status || 'locked' });
                                            });
                                            const cards = Array.from(badgeProgress.values());

                                            // Build achievement timeline (right column)
                                            const achievedItems = progressEntries
                                                .filter(([, p]) => (p as any)?.achievedAt)
                                                .map(([levelId, p]) => {
                                                    const parts = levelId.split('.');
                                                    const baseId = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : levelId;
                                                    const levelNum = parts.length >= 3 ? parts[2] : '1';
                                                    const meta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
                                                    return {
                                                        levelId,
                                                        baseId,
                                                        title: meta?.title || baseId,
                                                        categoryId: parts[0] || '1',
                                                        emoji: meta?.emoji || '',
                                                        levelNum,
                                                        achievedAt: (p as any).achievedAt as string,
                                                    };
                                                })
                                                .sort((a, b) => (a.achievedAt || '').localeCompare(b.achievedAt || ''));

                                            return (
                                                <div key="home-journal" style={{ display: 'flex', gap: 20, maxWidth: 1100, margin: '0 auto', width: '100%', flexWrap: 'wrap' }}>
                                                    {/* Left column: Progress cards */}
                                                    <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#c97730', marginBottom: 8, textAlign: 'center' }}>
                                                            Значки в пути
                                                        </div>
                                                        {cards.length > 0 ? cards.map(card => {
                                                            const achieved = card.levels.filter(l => l.status === 'achieved').length;
                                                            const total = Math.max(card.levels.length, 3);
                                                            const pct = Math.round((achieved / total) * 100);
                                                            return (
                                                                <div key={card.baseId}
                                                                    className="fade-in"
                                                                    onClick={() => navigateToBadge(card.baseId)}
                                                                    style={{
                                                                        padding: 14, borderRadius: 14,
                                                                        background: 'rgba(15, 10, 42, 0.12)',
                                                                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                        cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
                                                                        transition: 'background 0.15s',
                                                                    }}>
                                                                    <div style={{ width: 42, height: 42, flexShrink: 0 }}>
                                                                        <BadgeIcon badgeId={card.baseId} badgeTitle={card.title} categoryId={card.categoryId} emoji={card.emoji} size="responsive" />
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f0ff', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {card.title}
                                                                        </div>
                                                                        <div style={{
                                                                            height: 5, borderRadius: 3,
                                                                            background: 'rgba(255,255,255,0.08)',
                                                                            overflow: 'hidden',
                                                                        }}>
                                                                            <div style={{
                                                                                height: '100%', borderRadius: 3,
                                                                                width: `${pct}%`,
                                                                                background: pct >= 100
                                                                                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                                                                    : 'linear-gradient(90deg, #5de4ff, #8b5cf6)',
                                                                                transition: 'width 0.3s ease',
                                                                            }} />
                                                                        </div>
                                                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
                                                                            {achieved}/{total} уровней · {pct}%
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }) : (
                                                            <div className="fade-in" style={{
                                                                padding: 24, borderRadius: 14,
                                                                background: 'rgba(15, 10, 42, 0.12)',
                                                                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12,
                                                            }}>
                                                                Добавьте значок «В путь» из каталога
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right column: Achievement timeline */}
                                                    <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#c97730', marginBottom: 8, textAlign: 'center' }}>
                                                            Реальный путь
                                                        </div>
                                                        {achievedItems.length > 0 ? achievedItems.map((item, idx) => (
                                                            <div key={item.levelId}>
                                                                {/* Achievement card */}
                                                                <div
                                                                    className="fade-in"
                                                                    onClick={() => navigateToBadge(item.baseId)}
                                                                    style={{
                                                                        padding: 12, borderRadius: 12,
                                                                        background: 'rgba(34, 197, 94, 0.06)',
                                                                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                                        border: '1px solid rgba(34, 197, 94, 0.15)',
                                                                        cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center',
                                                                        transition: 'background 0.15s',
                                                                    }}>
                                                                    <div style={{ width: 36, height: 36, flexShrink: 0 }}>
                                                                        <BadgeIcon badgeId={item.baseId} badgeTitle={item.title} categoryId={item.categoryId} emoji={item.emoji} size="responsive" />
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {item.title} <span style={{ color: 'rgba(34, 197, 94, 0.7)', fontWeight: 400 }}>ур. {item.levelNum}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                                                                            ✅ Получен {new Date(item.achievedAt).toLocaleDateString('ru-RU')} в {new Date(item.achievedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Arrow between items */}
                                                                {idx < achievedItems.length - 1 && (
                                                                    <div style={{
                                                                        display: 'flex', justifyContent: 'center', padding: '4px 0',
                                                                        color: 'rgba(93, 228, 255, 0.3)', fontSize: 16,
                                                                    }}>⬇️</div>
                                                                )}
                                                            </div>
                                                        )) : (
                                                            <div className="fade-in" style={{
                                                                padding: 24, borderRadius: 14,
                                                                background: 'rgba(15, 10, 42, 0.12)',
                                                                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12,
                                                            }}>
                                                                Пока нет полученных значков.<br />
                                                                Они появятся здесь после подтверждения вожатым.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {/* Смены и отряды */}
                                        {homeTab === 'squads' && (
                                            <div key="home-squads" style={{
                                                maxWidth: 720, margin: '0 auto', width: '100%',
                                            }}>
                                                <ShiftsAndSquadsDashboard
                                                    onNavigateToSquadCorner={() => setActiveSection('squad-corner')}
                                                    onSquadCreated={async () => { await loadSquadInfo(); setActiveSection('squad-corner'); }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })() : activeSection === 'admin' ? (
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
                                    canModerate={role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer'}
                                />
                            ) : activeSection === 'bro' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {broTab === 'brodela' ? (
                                        <BroDelaPanel />
                                    ) : broTab === 'ode' ? (
                                        <ODeConstructorPanel />
                                    ) : broTab === 'brosquad' ? (
                                        <BroSquadPanel />
                                    ) : broTab === 'chat' ? (
                                        <SquadChat
                                            squadId={userData?.broProgress?.wingId || 'wing-default'}
                                            accessToken={accessToken || deviceId || ''}
                                            nickname={userData?.profile?.nickname || undefined}
                                            deviceId={deviceId || ''}
                                            role={undefined}
                                            chatType="wing"
                                            members={[{ deviceId: deviceId || '', nickname: userData?.profile?.nickname || null, avatarUrl: userData?.profile?.avatar || null }]}
                                        />
                                    ) : broTab === 'constructor' ? (
                                        <InitiationConstructor
                                            onCreated={() => setBroTab('wing')}
                                            onSwitchToWing={() => setBroTab('wing')}
                                        />
                                    ) : broTab === 'wing' ? (
                                        broPassportComplete ? (
                                            <WingDashboard variant="cabin" onSuggestInitiative={undefined} />
                                        ) : (
                                            <div className="fade-in" style={{
                                                padding: '48px 24px', textAlign: 'center',
                                                background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)',
                                                WebkitBackdropFilter: 'blur(8px)', borderRadius: 16,
                                                border: '1px solid rgba(255,255,255,0.08)',
                                            }}>
                                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🦅</div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                                                    Крыло БРО
                                                </div>
                                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, maxWidth: 340, margin: '0 auto' }}>
                                                    Создание своего Крыла откроется после завершения Посвящения.
                                                    Пройди Бросвящение, чтобы получить доступ к категории БРО и сформировать Крыло.
                                                </div>
                                                <button type="button" onClick={() => setBroTab('initiation')}
                                                    style={{
                                                        marginTop: 20, padding: '10px 24px', borderRadius: 12,
                                                        border: '1px solid rgba(124,58,237,0.4)',
                                                        background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                                                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                        fontFamily: 'inherit', transition: 'background 0.15s',
                                                    }}>
                                                    Перейти к Бросвящению →
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <BroPassportPanel
                                            squadId={mySquadInfo?.membership?.squadId || userData?.diaryProgress?.squad?.name || 'dev-squad'}
                                            deviceId={deviceId || 'dev-device'}
                                            accessToken={accessToken}
                                            canModerate={role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer'}
                                            nickname={userData?.profile?.nickname || undefined}
                                            userRole={role || undefined}
                                            onWingCreated={() => setBroTab('wing')}
                                        />
                                    )}
                                </div>
                            ) : activeSection === 'squad-corner' ? (
                                <div style={{ width: '100%', paddingBottom: squadCornerTab === 'chat' ? 0 : 100 }}>
                                    {currentRole !== 'traveler' && squadCornerTab === 'squad' ? (
                                        !(hasSquadMembership || userData?.diaryProgress?.squad?.name) ? (
                                            <SquadCabinetPanel
                                                key="squad-cabinet-join"
                                                role={currentRole}
                                                deviceId={deviceId || undefined}
                                                accessToken={accessToken || undefined}
                                                mySquadInfo={null}
                                                onRefresh={loadSquadInfo}
                                                onAfterLeave={() => setSquadCornerTab('squad')}
                                                diaryCorner={null}
                                            />
                                        ) : (
                                            <SquadCabinetPanel
                                                key="squad-cabinet"
                                                role={currentRole}
                                                deviceId={deviceId || undefined}
                                                accessToken={accessToken || undefined}
                                                mySquadInfo={mySquadInfo}
                                                onRefresh={loadSquadInfo}
                                                onAfterLeave={() => setSquadCornerTab('squad')}
                                                onEditCorner={canEditSquadCorner ? ((t) => setSquadCornerTab(t === 'planner' ? 'planner' : 'photos')) : undefined}
                                                diaryCorner={userData?.diaryProgress?.squad || null}
                                            />
                                        )
                                    ) : squadCornerTab === 'chat' ? (
                                        (() => {
                                            const sid = (mySquadInfo?.membership?.squadId || userData?.diaryProgress?.squad?.name || '').trim();
                                            const isDev = import.meta.env.DEV;
                                            if (!sid) return (
                                                <div key="chat-empty-nosquad" className="cab-empty-state fade-in">
                                                    <div className="cab-empty-state__icon">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                    </div>
                                                    <div className="cab-empty-state__title">Чат недоступен</div>
                                                    <div className="cab-empty-state__desc">Сначала вступите в отряд, чтобы начать общаться.</div>
                                                </div>
                                            );
                                            if (!hasAuth) return (
                                                <div key="chat-empty-noauth" className="cab-empty-state fade-in">
                                                    <div className="cab-empty-state__icon">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                    </div>
                                                    <div className="cab-empty-state__title">Чат недоступен</div>
                                                    <div className="cab-empty-state__desc">
                                                        {isDev
                                                            ? 'Для работы чата необходим бэкенд. Запустите python backend/app.py и авторизуйтесь.'
                                                            : 'Для доступа к чату необходимо войти в систему.'}
                                                    </div>
                                                </div>
                                            );
                                            return <SquadChat key="chat-active" squadId={sid} accessToken={accessToken || ''} nickname={nickname} deviceId={deviceId} role={currentRole} members={[{ deviceId: deviceId || '', nickname: nickname || null, avatarUrl: userData?.profile?.avatar || null }]} height="calc(100vh - 126px)" minHeight={0} />;
                                        })()
                                    ) : squadCornerTab === 'schedule' ? (
                                        <RealDiaryDashboard
                                            key="schedule-container"
                                            variant="cabin"
                                            activeTab="schedule"
                                            onNavigateToBadge={navigateToBadge}
                                        />
                                    ) : squadCornerTab === 'program' ? (
                                        <CampProgramByDays defaultShiftLength={defaultShiftLength} />
                                    ) : (
                                        <SquadCornerDashboard
                                            key={squadCornerTab}
                                            variant="cabin"
                                            activeTab={squadCornerTab as any}
                                            onTabChange={setSquadCornerTab as any}
                                            onNavigateToBadge={navigateToBadge}
                                            hasSquadMembership={hasSquadMembership}
                                            mySquadName={userData?.diaryProgress?.squad?.name || undefined}
                                            canEditCorner={canEditSquadCorner}
                                            canCreateSquadFromCorner={canEditSquadCorner}
                                            onOpenCabinet={() => setSquadCornerTab('squad')}
                                            onOpenShiftsAndSquads={() => setActiveSection('shifts')}
                                        />
                                    )}
                                </div>
                            ) : activeSection === 'vozhatifikator' ? (
                                <div key="vozhatifikator" className="fade-in" style={{
                                    background: 'rgba(8, 20, 40, 0.45)',
                                    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                                    borderRadius: 18, border: '1px solid rgba(93, 228, 255, 0.12)',
                                    padding: '24px 28px',
                                    display: 'flex', gap: 20,
                                }}>
                                    {vozhatifikatorTab === 'book' ? (
                                        <>
                                            {/* TOC sidebar */}
                                            <aside style={{
                                                width: 220, flexShrink: 0,
                                                display: 'flex', flexDirection: 'column', gap: 10,
                                                maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
                                            }}>
                                                <a
                                                    href="/VZhTFKTR.docx"
                                                    download="VZhTFKTR.docx"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                        padding: '8px 14px', borderRadius: 10,
                                                        background: 'rgba(93,228,255,0.08)',
                                                        border: '1px solid rgba(93,228,255,0.2)',
                                                        color: '#5de4ff', fontSize: 12, fontWeight: 600,
                                                        textDecoration: 'none', transition: 'background 0.15s',
                                                    }}
                                                >
                                                    📥 Скачать DOCX
                                                </a>
                                                <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {vozhatifikatorToc.map(item => (
                                                        <a
                                                            key={item.id}
                                                            href={`#${item.id}`}
                                                            onClick={e => {
                                                                e.preventDefault();
                                                                vozhatifikatorBookRef.current?.querySelector(`#${CSS.escape(item.id)}`)?.scrollIntoView({ behavior: 'smooth' });
                                                            }}
                                                            style={{
                                                                padding: '6px 10px', borderRadius: 6,
                                                                fontSize: 12, lineHeight: 1.4,
                                                                color: 'rgba(255,255,255,0.65)',
                                                                textDecoration: 'none',
                                                                transition: 'color 0.15s, background 0.15s',
                                                                cursor: 'pointer',
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.color = '#5de4ff';
                                                                e.currentTarget.style.background = 'rgba(93,228,255,0.06)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                                                                e.currentTarget.style.background = 'transparent';
                                                            }}
                                                        >
                                                            {item.title}
                                                        </a>
                                                    ))}
                                                </nav>
                                            </aside>
                                            {/* Book content */}
                                            <div ref={vozhatifikatorBookRef} className="vozhatifikator-book" style={{
                                                flex: 1, overflowY: 'auto',
                                                maxHeight: 'calc(100vh - 120px)',
                                            }}>
                                                {vozhatifikatorLoading && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Загрузка книги…</p>}
                                                {vozhatifikatorError && <p style={{ color: '#f59e0b', fontSize: 14 }}>{vozhatifikatorError}</p>}
                                                {!vozhatifikatorLoading && !vozhatifikatorError && vozhatifikatorHtml && (
                                                    <div className="vozhatifikator-book__content" dangerouslySetInnerHTML={{ __html: vozhatifikatorHtml }} />
                                                )}
                                            </div>
                                        </>
                                    ) : vozhatifikatorTab === 'lights' ? (
                                        <VozhatifikatorChecklist
                                            completedIds={userData?.vozhatifikatorChecklist?.completedIds ?? []}
                                            onToggle={updateVozhatifikatorChecklist}
                                            userNickname={userData?.profile?.nickname || ''}
                                            userRole={role || 'participant'}
                                            deviceId={deviceId || ''}
                                        />
                                    ) : vozhatifikatorTab === 'bad-advice' ? (
                                        /* Вредные советы директору — announcement placeholder */
                                        <div style={{
                                            flex: 1, display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            textAlign: 'center', padding: '60px 20px', gap: 16,
                                        }}>
                                            <div style={{
                                                width: 72, height: 72, borderRadius: 20,
                                                background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 32,
                                            }}>😈</div>
                                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                                Вредные советы директору
                                            </h3>
                                            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 400 }}>
                                                Новый раздел в разработке. Здесь появятся ироничные «антисоветы» — что <em>не</em> стоит делать, если хотите, чтобы ваш лагерь процветал.
                                            </p>
                                            <span style={{
                                                padding: '6px 16px', borderRadius: 20,
                                                background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)',
                                                color: '#EC4899', fontSize: 12, fontWeight: 600,
                                            }}>Скоро</span>
                                        </div>
                                    ) : (
                                        /* Era placeholders (era-19-21, era-21-23, era-23-26) */
                                        <div style={{
                                            flex: 1, display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            textAlign: 'center', padding: '60px 20px', gap: 16,
                                        }}>
                                            <div style={{
                                                width: 72, height: 72, borderRadius: 20,
                                                background: 'linear-gradient(135deg, rgba(93,228,255,0.12), rgba(139,92,246,0.12))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 32,
                                            }}>📖</div>
                                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                                {vozhatifikatorTab === 'era-19-21' ? 'Вожатификатор 2019–2021'
                                                    : vozhatifikatorTab === 'era-21-23' ? 'Вожатификатор 2021–2023'
                                                    : 'Вожатификатор 2023–2026'}
                                            </h3>
                                            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 400 }}>
                                                Эта эпоха Вожатификатора ещё готовится к публикации.
                                                Следите за обновлениями — скоро здесь появятся новые главы, задания и истории.
                                            </p>
                                            <span style={{
                                                padding: '6px 16px', borderRadius: 20,
                                                background: 'rgba(93,228,255,0.08)', border: '1px solid rgba(93,228,255,0.2)',
                                                color: '#5de4ff', fontSize: 12, fontWeight: 600,
                                            }}>Скоро</span>
                                        </div>
                                    )}
                                </div>
                            ) : activeSection === 'workshop' ? (
                                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>


                                    {/* Конструктор */}
                                    {workshopTab === 'constructor' && (
                                        <div key="ws-constructor" className="fade-in cab-card" style={{
                                            padding: '28px 32px', borderRadius: 20,
                                            display: 'flex', flexDirection: 'column', gap: 24,
                                        }}>
                                            {/* Header */}
                                            <div>
                                                <h3 style={{ 
                                                    margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    <span style={{ fontSize: 20 }}>✨</span> Конструктор
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                    Предложи свой значок, категорию или версию. Всё пройдёт проверку вожатым. Ваши лучшие идеи попадут в путеводитель!
                                                </p>
                                            </div>

                                            {/* Type selector */}
                                            <div>
                                                <div style={{ 
                                                    display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, 
                                                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {([['badge', 'Новый значок'], ['category', 'Категория'], ['version', 'Версия']] as const).map(([type, label]) => (
                                                        <button key={type} type="button"
                                                            className={wsProposalType === type ? 'cab-btn-accent-sm' : ''}
                                                            onClick={() => setWsProposalType(type)}
                                                            style={wsProposalType === type ? { padding: '8px 16px', borderRadius: 8 } : {
                                                                padding: '8px 16px', borderRadius: 8,
                                                                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                                background: 'transparent',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                border: 'none',
                                                            }}>
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p style={{ margin: '8px 0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                                    {wsProposalType === 'badge' ? 'Предложи оригинальный значок в любую категорию'
                                                        : wsProposalType === 'category' ? 'Предложи новую масштабную категорию для значков'
                                                        : 'Предложи альтернативную версию существующего значка (например, новогоднюю)'}
                                                </p>
                                            </div>

                                            {/* Form common input styles setup */}
                                            {(() => {
                                                const labelStyle = { 
                                                    display: 'block', fontSize: 12, fontWeight: 800, 
                                                    color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' as const, 
                                                    letterSpacing: '0.05em', marginBottom: 8 
                                                };
                                                const activeClass = wsProposalType === 'badge' ? 'cab-input--cyan' : wsProposalType === 'category' ? 'cab-input--purple' : 'cab-input--pink';

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                        {wsProposalType === 'badge' && (
                                                            <>
                                                                <div>
                                                                    <label style={labelStyle}>Название значка</label>
                                                                    <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                                                        placeholder="Например: Мастер костра" 
                                                                        className={`cab-input ${activeClass}`} />
                                                                </div>
                                                                <div>
                                                                    <label style={labelStyle}>Описание и критерии</label>
                                                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                                                        placeholder="За что выдаётся этот значок? Какие задания нужно выполнить?" 
                                                                        className={`cab-input ${activeClass}`} style={{ minHeight: 100, resize: 'vertical' }} />
                                                                </div>
                                                            </>
                                                        )}

                                                        {wsProposalType === 'category' && (
                                                            <>
                                                                <div>
                                                                    <label style={labelStyle}>Название категории</label>
                                                                    <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                                                        placeholder="Например: Спортивные достижения" 
                                                                        className={`cab-input ${activeClass}`} />
                                                                </div>
                                                                <div>
                                                                    <label style={labelStyle}>Описание</label>
                                                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                                                        placeholder="Пиши суть. Какие значки будут в этой категории?" 
                                                                        className={`cab-input ${activeClass}`} style={{ minHeight: 80, resize: 'vertical' }} />
                                                                </div>
                                                            </>
                                                        )}

                                                        {wsProposalType === 'version' && (
                                                            <>
                                                                <div style={{ display: 'flex', gap: 12 }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={labelStyle}>ID оригинала</label>
                                                                        <input value={wsBadgeId} onChange={e => setWsBadgeId(e.target.value)}
                                                                            placeholder="Например: 1.1" 
                                                                            className={`cab-input ${activeClass}`} />
                                                                    </div>
                                                                    <div style={{ flex: 2 }}>
                                                                        <label style={labelStyle}>Название версии</label>
                                                                        <input value={wsTitle} onChange={e => setWsTitle(e.target.value)}
                                                                            placeholder="Новогодняя искра" 
                                                                            className={`cab-input ${activeClass}`} />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label style={labelStyle}>Отличия и условия</label>
                                                                    <textarea value={wsDescription} onChange={e => setWsDescription(e.target.value)}
                                                                        placeholder="В чём особенность этой версии?" 
                                                                        className={`cab-input ${activeClass}`} style={{ minHeight: 80, resize: 'vertical' }} />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Image Uploader */}
                                                        <div>
                                                            <label style={labelStyle}>Изображение (Опционально)</label>
                                                            <div style={{
                                                                padding: '16px', borderRadius: 16, background: 'rgba(0,0,0,0.15)',
                                                                border: '1px dashed rgba(255,255,255,0.06)'
                                                            }}>
                                                                <ImageSourceBlock
                                                                    context="workshop_badge"
                                                                    value={wsImage}
                                                                    onChange={(url) => setWsImage(url)}
                                                                    aspect="free"
                                                                    onGenerate={async (opts) =>
                                                                        requestImageGenerate({ mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' }, effectiveToken || null)
                                                                    }
                                                                    onProcess={async (imageBase64, opts) =>
                                                                        requestImageGenerate({ mode: 'process', context: 'workshop', imageBase64, prompt: opts?.prompt ?? '' }, effectiveToken || null)
                                                                    }
                                                                />
                                                                {wsImage && (
                                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                                                                        <button type="button" className="cab-btn cab-btn--danger"
                                                                            onClick={() => setWsImage(null)}>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                                            Удалить
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Submit Button */}
                                                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                                                            <button onClick={handleWsSubmit} 
                                                                disabled={!wsTitle.trim() || (wsProposalType === 'version' && !wsBadgeId.trim()) || wsBusy}
                                                                className="cab-btn-accent">
                                                                {wsBusy ? 'Отправка...' : 'Отправить на проверку'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Арты */}
                                    {workshopTab === 'arts' && (
                                        <div key="ws-arts" className="fade-in cab-card" style={{
                                            padding: '28px 32px', borderRadius: 20,
                                            display: 'flex', flexDirection: 'column', gap: 16,
                                        }}>
                                            <div>
                                                <h3 style={{ 
                                                    margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    Арты и скины
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                    Сгенерируй арт для значка с помощью ИИ или загрузи свой.<br/>
                                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>AI-генерация доступна в основном кабинете.</span>
                                                </p>
                                            </div>
                                            {accessToken && <ArtInboxTab accessToken={accessToken} />}
                                        </div>
                                    )}

                                    {/* Мои проекты */}
                                    {workshopTab === 'my' && (() => {
                                        const combined = [
                                            ...cabinetProposals.map((p: any) => ({ ...p, source: 'proposal' })),
                                            ...customBadges.map((b: any) => ({ ...b, source: 'badge', type: 'badge', status: 'active' })),
                                        ];
                                        return (
                                            <div key="ws-my" className="fade-in cab-card" style={{
                                                padding: '28px 32px', borderRadius: 20,
                                                display: 'flex', flexDirection: 'column', gap: 16,
                                            }}>
                                                <div>
                                                    <h3 style={{ 
                                                        margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                        letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                    }}>
                                                        Мои проекты
                                                    </h3>
                                                    {combined.length === 0 && (
                                                        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                            Пока нет проектов. Создай первый в Конструкторе.
                                                        </p>
                                                    )}
                                                </div>
                                                {combined.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {combined.map((item: any) => (
                                                            <div key={item.id} style={{
                                                                padding: '12px 16px', borderRadius: 12,
                                                                background: 'rgba(0,0,0,0.15)',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                            }}>
                                                                <div style={{ fontWeight: 600, fontSize: 14, color: '#e8f0ff' }}>
                                                                    {item.type === 'category' ? '📁' : item.type === 'version' ? '🔄' : (item.emoji || '🏅')} {item.title}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                                                    {item.type === 'category' ? 'Категория' : item.type === 'version' ? 'Версия значка' : 'Значок'}
                                                                    {' · '}
                                                                    {item.status === 'pending' ? '⏳ На проверке' : item.status === 'approved' ? '✅ Одобрено' : item.status === 'rejected' ? '❌ Отклонено' : '📋 Активно'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Сообщество */}
                                    {workshopTab === 'community' && (
                                        <CommunityRankingPanel
                                            communityBadges={communityBadges}
                                            customBadges={customBadges}
                                            onNavigateToBadge={navigateToBadge}
                                        />
                                    )}

                                </div>
                            ) : activeSection === 'share' ? (
                                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                                    {shareTab === 'invite' && (
                                        <div key="share-invite" className="fade-in cab-card" style={{
                                            padding: '28px 32px', borderRadius: 20,
                                            display: 'flex', flexDirection: 'column', gap: 16,
                                        }}>
                                            <div>
                                                <h3 style={{ 
                                                    margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    Пригласить друзей
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                    {myTeam ? 'Скопируй ссылку и отправь друзьям.' : 'Скопируй ссылку на путеводитель и отправь друзьям.'}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex' }}>
                                                <button type="button"
                                                    onClick={() => {
                                                        const url = myTeam ? generateInviteUrl() : window.location.href;
                                                        navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!'));
                                                    }}
                                                    className="cab-btn-accent">
                                                    Скопировать ссылку
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {shareTab === 'qr' && (
                                        <div key="share-qr" className="fade-in cab-card" style={{
                                            padding: '28px 32px', borderRadius: 20,
                                            display: 'flex', flexDirection: 'column', gap: 16,
                                        }}>
                                            <div>
                                                <h3 style={{ 
                                                    margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    QR-код путеводителя
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                    Наведи камеру телефона для перехода на путеводитель
                                                </p>
                                            </div>
                                            <div style={{
                                                padding: 24, borderRadius: 16, background: '#ffffff',
                                                display: 'flex', width: 'fit-content',
                                            }}>
                                                <QRCodeSVG value={window.location.origin + (import.meta.env.BASE_URL || '/')} size={180} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeSection === 'events' ? (
                                <div key="events" className="fade-in cab-card" style={{
                                    display: 'flex', flexDirection: 'column' as const, gap: 16,
                                    borderRadius: 20, padding: '28px 32px',
                                }}>
                                    {/* ── Auto-load when Events section opens ── */}
                                    {(() => {
                                        // Auto-load effect via self-invoking render guard
                                        const shouldLoad = activeSection === 'events' && myRequests.length === 0 && !eventsLoading;
                                        if (shouldLoad && hasAuth) {
                                            setTimeout(async () => {
                                                setEventsLoading(true);
                                                try {
                                                    const my = await loadMyBadgeRequests(effectiveToken, devHeaders);
                                                    setMyRequests(my);
                                                } catch (e) { console.error(e); }
                                                setEventsLoading(false);
                                            }, 0);
                                        }
                                        return null;
                                    })()}

                                    {eventsTab === 'requests' && (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', gap: 12,
                                        }}>
                                            <div style={{ marginBottom: 4 }}>
                                                <h3 style={{ 
                                                    margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                                                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    Мои заявки
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                    Отслеживай статус проверки полученных значков.
                                                </p>
                                            </div>

                                            {/* Refresh button */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <button type="button" onClick={async () => {
                                                    if (!hasAuth) return;
                                                    setEventsLoading(true);
                                                    try {
                                                        const my = await loadMyBadgeRequests(effectiveToken, devHeaders);
                                                        setMyRequests(my);
                                                    } catch (e) { console.error(e); }
                                                    setEventsLoading(false);
                                                }} disabled={eventsLoading} className="cab-btn-accent-sm">
                                                    {eventsLoading ? 'Загрузка…' : '🔄 Обновить'}
                                                </button>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                                                    {myRequests.length > 0 ? `${myRequests.length} заявок` : ''}
                                                </span>
                                            </div>

                                            {/* Loading state */}
                                            {eventsLoading && myRequests.length === 0 && (
                                                <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                                    Загрузка заявок…
                                                </div>
                                            )}

                                            {/* Empty state */}
                                            {!eventsLoading && myRequests.length === 0 && (
                                                <div style={{
                                                    padding: 32, textAlign: 'center', borderRadius: 14,
                                                    background: 'rgba(8, 20, 40, 0.15)',
                                                    border: '1px solid rgba(93, 228, 255, 0.08)',
                                                }}>
                                                    <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                                                    <div style={{ fontSize: 14, color: '#e8f0ff', fontWeight: 600 }}>Нет заявок</div>
                                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                                        Отправь заявку на подтверждение значка — она появится здесь
                                                    </div>
                                                </div>
                                            )}

                                            {/* Request cards */}
                                            {myRequests.slice(0, 30).map(r => {
                                                const statusColor = r.status === 'pending' ? '#F59E0B' : r.status === 'approved' ? '#22C55E' : '#EF4444';
                                                const statusBg = r.status === 'pending' ? 'rgba(245,158,11,0.12)' : r.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                                                const statusText = r.status === 'pending' ? '⏳ Ожидает проверки' : r.status === 'approved' ? '✅ Одобрено' : '❌ Отклонено';
                                                const ev = r.evidence || {} as Record<string, unknown>;
                                                const hasDetails = !!(ev.reflection || ev.impact || ev.link || (ev.photos && Array.isArray(ev.photos) && ev.photos.length > 0));

                                                return (
                                                    <details key={r.id} style={{
                                                        borderRadius: 12,
                                                        background: 'rgba(8, 20, 40, 0.2)',
                                                        border: `1px solid ${statusColor}22`,
                                                        overflow: 'hidden',
                                                    }}>
                                                        <summary style={{
                                                            padding: '12px 16px', cursor: 'pointer',
                                                            listStyle: 'none', display: 'flex', alignItems: 'center', gap: 12,
                                                        }}>
                                                            {/* Status dot */}
                                                            <div style={{
                                                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                                background: statusColor,
                                                                boxShadow: `0 0 6px ${statusColor}66`,
                                                            }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f0ff' }}>
                                                                    {r.badgeTitle || r.levelId}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                                                    <span style={{
                                                                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                                                                        borderRadius: 6, background: statusBg, color: statusColor,
                                                                    }}>
                                                                        {statusText}
                                                                    </span>
                                                                    {r.createdAt && (
                                                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                                                            {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Expand arrow */}
                                                            {hasDetails && (
                                                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>▼</span>
                                                            )}
                                                        </summary>

                                                        {/* Expanded details */}
                                                        <div style={{
                                                            padding: '0 16px 14px',
                                                            borderTop: '1px solid rgba(255,255,255,0.06)',
                                                            display: 'flex', flexDirection: 'column', gap: 8,
                                                            marginTop: 2,
                                                            paddingTop: 12,
                                                        }}>
                                                            {/* Resolution note (rejection/approval reason) */}
                                                            {r.resolutionNote && (
                                                                <div style={{
                                                                    padding: '10px 14px', borderRadius: 10,
                                                                    background: r.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                                                    border: `1px solid ${r.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                                                                }}>
                                                                    <div style={{
                                                                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                                                        letterSpacing: '0.06em', marginBottom: 4,
                                                                        color: r.status === 'rejected' ? '#f87171' : '#4ade80',
                                                                    }}>
                                                                        {r.status === 'rejected' ? 'Причина отклонения' : 'Комментарий вожатого'}
                                                                    </div>
                                                                    <div style={{ fontSize: 13, color: '#e8f0ff', lineHeight: 1.5 }}>
                                                                        {r.resolutionNote}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Evidence: what participant submitted */}
                                                            {typeof ev.reflection === 'string' && ev.reflection.trim() && (
                                                                <div>
                                                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Чему научился(лась)</div>
                                                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{ev.reflection}</div>
                                                                </div>
                                                            )}
                                                            {typeof ev.impact === 'string' && ev.impact.trim() && (
                                                                <div>
                                                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Реальный вклад</div>
                                                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{ev.impact}</div>
                                                                </div>
                                                            )}
                                                            {typeof ev.link === 'string' && ev.link.trim() && (
                                                                <div>
                                                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Ссылка</div>
                                                                    <a href={ev.link} target="_blank" rel="noopener noreferrer"
                                                                        style={{ fontSize: 12, color: '#5de4ff', wordBreak: 'break-all' }}>{ev.link}</a>
                                                                </div>
                                                            )}
                                                            {Array.isArray(ev.photos) && ev.photos.length > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Фото ({(ev.photos as string[]).length})</div>
                                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                        {(ev.photos as string[]).map((url: string, i: number) => (
                                                                            <img key={i} src={url} alt={`Фото ${i + 1}`} style={{
                                                                                maxWidth: 120, maxHeight: 120, borderRadius: 8,
                                                                                objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)',
                                                                                cursor: 'pointer',
                                                                            }} onClick={() => window.open(url, '_blank')} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {!hasDetails && !r.resolutionNote && (
                                                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                                                    Детали не приложены
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {eventsTab === 'announcements' && (
                                        <div style={{
                                            padding: 32, textAlign: 'center', borderRadius: 14,
                                            background: 'rgba(8, 20, 40, 0.15)',
                                            border: '1px solid rgba(93, 228, 255, 0.08)',
                                        }}>
                                            <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
                                            <div style={{ fontSize: 14, color: '#e8f0ff', fontWeight: 600 }}>Объявления</div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>
                                                Здесь будут появляться объявления от вожатых и педагогов
                                            </div>
                                        </div>
                                    )}

                                    {eventsTab === 'tasks' && (() => {
                                        const tasks = (userData as any)?.educatorTasks || [];
                                        return (
                                            <div style={{
                                                padding: 20, borderRadius: 14,
                                                background: 'rgba(8, 20, 40, 0.15)',
                                                border: '1px solid rgba(93, 228, 255, 0.12)',
                                            }}>
                                                <h3 style={{ color: '#FFD700', marginTop: 0, fontSize: 16 }}>📝 Задания педагога</h3>
                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Задания от педагогов, кружков и курсов.</p>
                                                {tasks.length === 0 ? (
                                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                                                        Пока нет заданий.
                                                    </p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                                        {tasks.map((t: any) => (
                                                            <div key={t.id} style={{
                                                                padding: '10px 14px', borderRadius: 10,
                                                                background: 'rgba(255,255,255,0.04)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                            }}>
                                                                <div style={{ fontWeight: 600, fontSize: 13, color: '#e8f0ff' }}>{t.title}</div>
                                                                {t.description && (
                                                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                                                        {t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                                                    {t.status === 'draft' ? '⬜ Черновик' : t.status === 'assigned' ? '📤 Назначено' : '✅ Завершено'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : activeSection === 'progress' ? (
                                <div key="progress" className="fade-in" style={{
                                    padding: 32, borderRadius: 16,
                                    background: 'rgba(8, 20, 40, 0.15)',
                                    border: '1px solid rgba(93, 228, 255, 0.12)',
                                    textAlign: 'center' as const, maxWidth: 720, margin: '0 auto', width: '100%',
                                }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#e8f0ff' }}>Карточки прогресса</h3>
                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                                        Раздел в разработке.
                                    </p>
                                </div>
                            )
                                : activeSection === 'shifts' ? (
                                    <div key="shifts" className="fade-in" style={{
                                        background: 'rgba(8, 20, 40, 0.45)',
                                        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                                        borderRadius: 18, border: '1px solid rgba(93, 228, 255, 0.12)',
                                        padding: '24px 28px',
                                    }}>
                                    <ShiftsAndSquadsDashboard
                                        onNavigateToSquadCorner={() => setActiveSection('squad-corner')}
                                        onSquadCreated={async () => { await loadSquadInfo(); setActiveSection('squad-corner'); }}
                                    />
                                    </div>
                                ) : activeSection === 'parents' ? (
                                    <div key="parents" className="fade-in" style={{
                                        display: 'flex', flexDirection: 'column' as const, gap: 16,
                                        background: 'rgba(8, 20, 40, 0.15)', backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)', borderRadius: 18,
                                        border: '1px solid rgba(93, 228, 255, 0.12)', padding: '24px 28px',
                                    }}>
                                        {parentsTab === 'program' && (
                                            <div style={{
                                                padding: 24, borderRadius: 16,
                                                background: 'rgba(8, 20, 40, 0.15)', border: '1px solid rgba(93, 228, 255, 0.12)',
                                                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                                            }}>
                                                <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#e8f0ff' }}>Программа смены</h3>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>
                                                    Режим ребёнка в этом разделе всегда read-only.
                                                </p>
                                                <CampProgramByDays defaultShiftLength={defaultShiftLength} />
                                            </div>
                                        )}
                                        {parentsTab === 'child' && (() => {
                                            const achieved = Object.entries(progress).filter(([, p]) => p.status === 'achieved');
                                            const inProgress = Object.entries(progress).filter(([, p]) => p.status === 'in_progress');
                                            return (
                                                <div style={{
                                                    padding: 24, borderRadius: 16,
                                                    background: 'rgba(8, 20, 40, 0.15)', border: '1px solid rgba(93, 228, 255, 0.12)',
                                                }}>
                                                    <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#e8f0ff' }}>Прогресс ребёнка</h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(34,197,94,0.12)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>{achieved.length}</div>
                                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Завершено</div>
                                                        </div>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(93,228,255,0.08)', textAlign: 'center' }}>
                                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#5de4ff' }}>{inProgress.length}</div>
                                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>В пути</div>
                                                        </div>
                                                    </div>
                                                    {achieved.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff', marginBottom: 4 }}>Последние достижения</div>
                                                            {achieved.slice(0, 5).map(([id]) => {
                                                                const parts = id.split('.');
                                                                const baseId = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : id;
                                                                const meta = badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
                                                                return (
                                                                    <div key={id} style={{
                                                                        padding: '8px 12px', borderRadius: 8,
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        fontSize: 13, color: '#e8f0ff',
                                                                    }}>
                                                                        ✅ {meta?.title || baseId}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {parentsTab === 'contacts' && (
                                            <div style={{
                                                padding: 24, borderRadius: 16,
                                                background: 'rgba(8, 20, 40, 0.15)', border: '1px solid rgba(93, 228, 255, 0.12)',
                                            }}>
                                                <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#e8f0ff' }}>Контакты смены</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {[
                                                        { label: 'Начальник лагеря', value: 'Свяжитесь через канал лагеря' },
                                                        { label: 'Старший вожатый', value: 'См. раздел «Вожатский отряд»' },
                                                        { label: 'Вожатый отряда', value: 'См. раздел «Отрядный уголок»' },
                                                    ].map(c => (
                                                        <div key={c.label} style={{
                                                            padding: '12px 16px', borderRadius: 10,
                                                            background: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                        }}>
                                                            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{c.label}</div>
                                                            <div style={{ fontSize: 13, color: '#e8f0ff' }}>{c.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : activeSection === 'inspector' ? (
                                    <div key="inspector" className="fade-in" style={{
                                        display: 'flex', flexDirection: 'column' as const, gap: 16,
                                    }}>
                                        {inspectorTab === 'cabinet' && (
                                            <InspectorCabinetPanel
                                                accessToken={accessToken}
                                                deviceId={deviceId}
                                                onOpenDiary={() => setActiveSection('diary')}
                                                onNavigateToBadge={navigateToBadge}
                                            />
                                        )}
                                        {(['friendship', 'politeness', 'comfort', 'help', 'involvement', 'peacemaker', 'mood', 'chief'] as InspectorTabId[]).includes(inspectorTab as InspectorTabId) && (
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
                                        {inspectorTab === 'badges' && (() => {
                                            // Trigger lazy load of category 14
                                            void ensureCategoryBadgesLoaded('14');
                                            const cat14Badges = allBadges.filter((b: any) => String(b.category_id) === '14');
                                            return (
                                                <div style={{
                                                    background: 'rgba(5, 12, 28, 0.4)',
                                                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: 24, padding: 24,
                                                    boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
                                                }}>
                                                    <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e8f0ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span>🔍</span> Линейка значков Инспектора Пользы
                                                    </h3>
                                                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                                        Все значки категории «Инспектор Пользы». Кликни для перехода к значку.
                                                    </p>
                                                    {cat14Badges.length > 0 ? (
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                            gap: 12,
                                                        }}>
                                                            {cat14Badges.map((b: any) => (
                                                                <div key={b.id}
                                                                    onClick={() => navigateToBadge(String(b.id))}
                                                                    style={{
                                                                        padding: 16, borderRadius: 14,
                                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                        cursor: 'pointer', textAlign: 'center',
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                                                                >
                                                                    <div style={{ width: 56, height: 56, margin: '0 auto 8px' }}>
                                                                        <BadgeIcon badgeId={String(b.id)} badgeTitle={b.title || ''} categoryId="14" emoji={b.emoji || ''} size="responsive" />
                                                                    </div>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f0ff', lineHeight: 1.3 }}>{b.title}</div>
                                                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>ID: {b.id}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                                            Значки категории 14 загружаются…
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {['intro-doc', 'methodology-doc', 'active-checklist-doc'].includes(inspectorTab) && (() => {
                                            const DOC_CONFIG: Record<string, { path: string }> = {
                                                'intro-doc': { path: '/RL-Guide-book/ai-data/category-14/introduction.md' },
                                                'methodology-doc': { path: '/RL-Guide-book/ai-data/category-14/methodology/inspector-methodology.md' },
                                                'active-checklist-doc': { path: '/RL-Guide-book/ai-data/category-14/checklists/active-checklist.md' },
                                            };
                                            const cfg = DOC_CONFIG[inspectorTab];
                                            return <MarkdownDocTab key={inspectorTab} mdPath={cfg.path} />;
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
                                    <div key="fallback" className="fade-in" style={{
                                        padding: 32, borderRadius: 16,
                                        background: 'rgba(8, 20, 40, 0.15)', border: '1px solid rgba(93, 228, 255, 0.12)',
                                        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                                        minHeight: 300,
                                    }}>
                                        <SectionStub sectionId={activeSection} />
                                    </div>
                                )}
                    </div>{/* close maxWidth wrapper */}
                </div>{/* close content column */}
            </div>{/* close root layout */}
        </>
    );
};



// ---------------------------------------------------------------------------
// Section stubs (placeholder until real components are wired)
// ---------------------------------------------------------------------------

const SectionStub: React.FC<{ sectionId: SectionId }> = ({ sectionId }) => {
    const stubData: Record<SectionId, { features: string[] }> = {
        home: {
            features: ['Паспорт значков', 'Путь значков (активные)', 'Избранное', 'Коллекция', 'Поиск по всем значкам'],
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
        progress: {
            features: ['Текущие значки', 'Уровни прогресса', 'Планы развития', 'Достижения'],
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
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
            }}>
                {data.features.map((feat, i) => (
                    <div key={i} style={{
                        padding: '16px 18px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(93, 228, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'rgba(93, 228, 255, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                            marginBottom: 10,
                        }}>
                            {i + 1}
                        </div>
                        <div style={{
                            fontSize: 13, fontWeight: 600, color: '#e8f0ff',
                        }}>
                            {feat}
                        </div>
                    </div>
                ))}
            </div>

            {/* Integration hint */}
            <div style={{
                marginTop: 24, padding: '14px 18px', borderRadius: 12,
                background: 'rgba(93, 228, 255, 0.05)', border: '1px dashed rgba(93, 228, 255, 0.2)',
                fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5,
            }}>
                Здесь будет контент раздела «{SECTION_INFO[sectionId].title}».
                Компоненты будут интегрированы из существующего ProfileView.
            </div>
        </div>
    );
};

export default PersonalCabinet;
