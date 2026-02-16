import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import fitty, { type FittyInstance } from 'fitty';
import BadgeIcon from '../components/BadgeIcon';
import { useUserProgress } from '../hooks/useUserProgress';
import { useTeam } from '../context/TeamContext';
import { useCounselorSquad } from '../context/CounselorSquadContext';
import { useAuth } from '../context/AuthContext';
import { fireOn401 } from '../utils/authStorage';
import { canSeeOtradBlocks, showEventsPanelForRole, ROLE_ORDER, getRoleDisplay, ROLE_LABELS, canCreateCounselorSquad, canCreateShiftsAndSquads, isTraveler, canUseExpensiveActions, canRequestBadgeApproval, canModerateBadgeApprovals } from '../types/authRole';
import type { UserRole } from '../types/authRole';
import { getRank, buildParentReportPayload } from '../types/userProgress';
import type { ParentReportPayload } from '../types/userProgress';
import { inspectorMissions, type InspectorTabId, INSPECTOR_TAB_IDS, INSPECTOR_TAB_BADGE_IDS } from '../types/inspector';
import type { Badge } from '../types/guide';
import { useHintOverlay, type HintStep } from '../context/HintOverlayContext';
import { InspectorDashboard } from '../components/InspectorDashboard';
import { Profile4KDashboard, type Profile4KTabId } from '../components/Profile4KDashboard';
import { TeamDashboard, type TeamTabId } from '../components/TeamDashboard';
import { RealDiaryDashboard, type RealDiaryTabId } from '../components/RealDiaryDashboard';
import { SquadCornerDashboard } from '../components/SquadCornerDashboard';
import { ConfirmModal } from '../components/ConfirmModal';
import { CounselorSquadDashboard, type CounselorSquadTabId } from '../components/CounselorSquadDashboard';
import { CouncilDashboard, type CouncilTabId } from '../components/CouncilDashboard';
import { BroInitiation } from '../components/BroInitiation';
import { WingDashboard } from '../components/WingDashboard';
import { SquadArchitect } from '../components/SquadArchitect';
import { generateSocialCard, shareOrDownloadSocialCard, type SocialCardResult } from '../utils/socialGenerator';
import { fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck, fetchBadgePlan, structureUserPlan, checkPlanApiAvailable, fetchCouncilInitiative } from '../utils/aiService';
import { CampProgramByDays } from '../components/CampProgramByDays';
import { VozhatifikatorChecklist } from '../components/VozhatifikatorChecklist';
import { ImageSourceBlock } from '../components/ImageSourceBlock';
import { FeatureGate } from '../components/FeatureGate';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { parseMarkdownToc, markdownToHtmlWithHeadingIds } from '../utils/markdown';
import { getBadgeImagePath } from '../utils/badgeImages';
import { pluralizeRu } from '../utils/textFormatting';
import { approveBadgeRequest, joinSquad, loadBadgeRequestsInbox, loadMyApprovals, loadMyBadgeRequests, loadMySquad, rejectBadgeRequest, type BadgeApprovalItem, type BadgeRequestItem, type SquadMineResponse } from '../utils/badgeApprovalApi';
import { VOZHATIFIKATOR_CHECKLIST_ITEMS } from '../data/vozhatifikatorChecklist';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/profile-view.css';

// --- ICONS ---
const Icons = {
  Star: ({ filled }: { filled?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"} stroke={filled ? "#FFD700" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 12.27 17 17.14 18.18 21.02 12 17.77 5.82 21.02 7 17.14 2 12.27 8.91 8.26 12 2"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Clip: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  XCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>,
  Heart: ({ filled }: { filled?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#e74c3c" : "none"} stroke={filled ? "#e74c3c" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  ArrowRight: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  ArrowUp: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  ArrowDown: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
};

const getBaseId = (rawId: string) => {
  const clean = String(rawId || '').trim();
  if (!clean) return '';
  const parts = clean.split('.').filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : clean;
};

/** Категория по умолчанию для новых значков в Кузнице Смыслов (можно переопределить через ?categoryId= в URL). */
const DEFAULT_WORKSHOP_CATEGORY_ID = '8';

/** При числе элементов не больше этого — показываем статический ряд без карусели (нет вращения, пустого экрана и стрелок). */
const CAROUSEL_STATIC_MAX = 3;

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

/** DOCX — редактируемая версия (VZhTFKTR.docx), будет обновляться при редактуре. */
const VOZHATIFIKATOR_DOCX_FILE = 'VZhTFKTR.docx';
const VOZHATIFIKATOR_DOCX_URL = '/' + VOZHATIFIKATOR_DOCX_FILE;

type Tab = 'active' | 'favorites' | 'collection' | 'journal' | 'workshop';
type SquadCornerTabId = 'squad' | 'photos' | 'planner' | 'flag-badges';
type BroTabId = 'initiation' | 'wing';
type ShareTabId = 'create-card' | 'invite';
type WorkshopTabId = 'architect' | 'forge' | 'ideas' | 'my';

type PanelViewId = 'passport' | 'inspector' | 'profile4k' | 'counselor-squad' | 'wing' | 'squad-corner' | 'real-diary' | 'team' | 'council' | 'bro' | 'workshop' | 'share' | 'vozhatifikator' | 'parents';

const PROFILE_AUTO_FIT_SELECTOR = [
  '.profile-autofit',
  '[data-autofit="true"]',
  '.profile-view-cabin-profile-rank',
  '.profile-view-cabin-profile-nickname',
  '.profile-view-cabin-profile-status',
  '.profile-view-cabin-profile-actions button',
  '.profile-view-cabin-profile-actions-hint',
  '.profile-view-cabin-top-inspector__title',
  '.profile-view-cabin-top-inspector__subtitle',
  '.profile-view-cabin-center-title',
  '.profile-view-cabin-center-subtitle',
  '.profile-view-cabin-side-screen__label',
  '.profile-view-cabin-side-screen__btn',
  '.profile-view-cabin-card-subtitle',
  '.profile-view-cabin-card-hint',
  '.profile-view-cabin-nav-item',
  '.console-btn-label',
  '.console-terminal__title',
  '.profile-view-cabin-hub-action-btn__label',
  '.profile-view-cabin-hub-action-btn__value',
  '.profile-plan-section__title',
  '.profile-plan-section__summary-label',
  '.profile-plan-section__summary-progress',
  '.profile-plan-section__meta',
  '.profile-tabs-nav button',
  '.profile-view-panel-header span',
  '.organizer-shifts-section__heading',
  '.organizer-empty-state__title',
  '.organizer-empty-state__text',
  '.profile-empty-state__title',
  '.profile-empty-state__text',
  '.parents-section-block__heading',
  '.parents-section-block__label',
  '.parents-section__program-title',
  '.organizer-shift-card__title',
  '.workshop-view__nav-btn',
  '.vozhatifikator-toc-item-title',
  '.vozhatifikator-panel h2',
  '.vozhatifikator-panel h3',
  '.vozhatifikator-download',
  '.profile-view-panel-scroll h2',
  '.profile-view-panel-scroll h3',
  '.profile-view-panel-scroll h4',
  '.profile-view-cabin-center-scroll h2',
  '.profile-view-cabin-center-scroll h3',
  '.profile-view-cabin-center-scroll h4',
].join(',');

export const ProfileView: React.FC<any> = (props) => {
  const { onBack, onNavigateToBadge, badges, ensureBadgeLoaded, addCustomBadge, restoreCustomBadges, removeCustomBadge, customBadges = [], communityBadges = [], communityPendingCount = 0, communitySyncing = false, communityLikedIds = new Set<string>(), toggleCommunityLike, publishBadgeToCommunity, setCustomBadgeImage, onChatToggle, onChatClose, isChatOpen, lastUpdated, onNavigateToRegistrationForm } = props;
  const { userData, setNickname, setAvatar, setProfileStatus, setProfileBio, toggleFavorite, removeRoute, exportData, importData, resetProgress, applyApprovedLevel, getLevelProgress, markRankUpSeen, completeTutorial, isLoading, updateLevelEvidence, updateLevelStatus, saveBadgePlan, updateBadgePlanStatus, updateVozhatifikatorChecklist, setPathFavToast } = useUserProgress();
  const { myTeam, generateInviteUrl } = useTeam();
  const { myCreatedSquad, myJoinedSquad, createSquad, deleteSquad, getInviteCode, getInviteLink, joinByCode, leaveSquad } = useCounselorSquad();
  const { canUseChat, role, deviceId, setAuth, accessToken } = useAuth();
  const seeOtradBlocks = canSeeOtradBlocks(role);
  const showEventsForRole = showEventsPanelForRole(role);
  const canCreateSquad = canCreateCounselorSquad(role);
  const showOrganizerPanel = canCreateShiftsAndSquads(role);
  const travelerMode = isTraveler(role);
  const expensiveActionsAllowed = canUseExpensiveActions(role);
  const canRequestApprovals = canRequestBadgeApproval(role);
  const canModerateApprovals = canModerateBadgeApprovals(role);
  const { showHint, startTutorial } = useHintOverlay();

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('🧑‍🚀');
  const [statusInput, setStatusInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [isCabinProfileExpanded, setIsCabinProfileExpanded] = useState(false);
  const [hasTouchedCabinProfilePanel, setHasTouchedCabinProfilePanel] = useState(false);
  const [cabinNavExpanded, setCabinNavExpanded] = useState(false);
  const [showAvatarUploadConfirm, setShowAvatarUploadConfirm] = useState(false);

  const [proofBadge, setProofBadge] = useState<any>(null);
  const [proofForm, setProofForm] = useState({ learned: '', impact: '', link: '' });
  const [proofPhotoCount, setProofPhotoCount] = useState(0);
  const proofPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [workshopForm, setWorkshopForm] = useState({ title: '', description: '', skill: 'critical', level1: '', level2: '', image: null as string | null });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [planFormBadge, setPlanFormBadge] = useState<{ id: string; title: string; level?: string; criteria?: string; nameExplanation?: string; skillTips?: string; confirmation?: string } | null>(null);
  const [planForm, setPlanForm] = useState({
    currentDay: 1,
    shiftLength: 21 as 21 | 9,
    squadProgramGrid: '',
    squadPlan3d: '',
    campProgram3d: '',
    priority: 'both',
    myPlanDraft: ''
  });
  const [planStep, setPlanStep] = useState<'context' | 'structured' | 'result'>('context');
  const [planChecklistItems, setPlanChecklistItems] = useState<string[]>([]);
  const [planBusy, setPlanBusy] = useState(false);
  const [planResult, setPlanResult] = useState<{ planText: string; checklistItems: string[] } | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planApiAvailable, setPlanApiAvailable] = useState<boolean | null>(null);

  const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
  const [initiativeForm, setInitiativeForm] = useState({
    topicDraft: '',
    currentDay: 1,
    shiftLength: 21 as 21 | 9,
    campProgram3d: ''
  });
  const [initiativeResult, setInitiativeResult] = useState<{ initiativeText: string; steps: string[] } | null>(null);
  const [initiativeBusy, setInitiativeBusy] = useState(false);
  const [initiativeError, setInitiativeError] = useState<string | null>(null);

  const workshopCategoryId = useMemo(() => {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const fromSearch = new URLSearchParams(search).get('categoryId');
    if (fromSearch) return fromSearch;
    const hashPart = hash.indexOf('?') >= 0 ? hash.slice(hash.indexOf('?')) : '';
    const fromHash = hashPart ? new URLSearchParams(hashPart).get('categoryId') : null;
    return fromHash || DEFAULT_WORKSHOP_CATEGORY_ID;
  }, [typeof window !== 'undefined' ? window.location.search + window.location.hash : '']);

  const [shareBusy, setShareBusy] = useState(false);
  const [shareStoryUrl, setShareStoryUrl] = useState<string | null>(null);
  const [shareWideUrl, setShareWideUrl] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareHideNickname, setShareHideNickname] = useState(false);
  const [shareStoryResult, setShareStoryResult] = useState<SocialCardResult | null>(null);
  const [shareWideResult, setShareWideResult] = useState<SocialCardResult | null>(null);
  const [workshopBusy, setWorkshopBusy] = useState(false);
  const [workshopSuccessPending, setWorkshopSuccessPending] = useState<{ title: string; description: string; categoryId: string } | null>(null);

  const [verifyCode, setVerifyCode] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [genDeviceId, setGenDeviceId] = useState('');
  const [genRole, setGenRole] = useState<UserRole>('participant');
  const [genSecret, setGenSecret] = useState('');
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [eventsSecret, setEventsSecret] = useState('');
  const [eventsData, setEventsData] = useState<Array<{ userId?: string; username?: string; text?: string; timestamp?: string }>>([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsHasLoaded, setEventsHasLoaded] = useState(false);
  const [eventsTab, setEventsTab] = useState<'legacy' | 'approvals'>('approvals');
  const [badgeRequestsMine, setBadgeRequestsMine] = useState<BadgeRequestItem[]>([]);
  const [badgeRequestsInbox, setBadgeRequestsInbox] = useState<BadgeRequestItem[]>([]);
  const [badgeRequestsBusy, setBadgeRequestsBusy] = useState(false);
  const [badgeRequestsError, setBadgeRequestsError] = useState<string | null>(null);
  const [approvalsSyncBusy, setApprovalsSyncBusy] = useState(false);
  const [approvalsSyncStatus, setApprovalsSyncStatus] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [approvalsSyncPromptDismissed, setApprovalsSyncPromptDismissed] = useState(false);
  const [mySquadBusy, setMySquadBusy] = useState(false);
  const [mySquadError, setMySquadError] = useState<string | null>(null);
  const [mySquadInfo, setMySquadInfo] = useState<SquadMineResponse | null>(null);
  const [mySquadJoinId, setMySquadJoinId] = useState('');
  const [mySquadJoinBusy, setMySquadJoinBusy] = useState(false);
  const [mySquadJoinStatus, setMySquadJoinStatus] = useState<string | null>(null);
  const [devLoginBusyRole, setDevLoginBusyRole] = useState<UserRole | null>(null);
  const [devLoginError, setDevLoginError] = useState<string | null>(null);

  const [organizerShifts, setOrganizerShifts] = useState<Array<{ id: string; name: string; startDate: string; endDate: string; createdAt: string; createdBy?: string }>>([]);
  const [organizerSquadsMap, setOrganizerSquadsMap] = useState<Record<string, Array<{ id: string; shiftId: string; name: string; createdAt: string }>>>({});
  const [organizerShiftFormOpen, setOrganizerShiftFormOpen] = useState(false);
  const [organizerShiftForm, setOrganizerShiftForm] = useState({ name: '', startDate: '', endDate: '' });
  const [organizerSquadFormOpen, setOrganizerSquadFormOpen] = useState(false);
  const [organizerSquadFormShiftId, setOrganizerSquadFormShiftId] = useState('');
  const [organizerSquadFormName, setOrganizerSquadFormName] = useState('');
  const [organizerCodeModalOpen, setOrganizerCodeModalOpen] = useState(false);
  const [organizerCodeForm, setOrganizerCodeForm] = useState({ deviceId: '', role: 'participant' as UserRole, shiftId: '' });
  const [organizerCodeResult, setOrganizerCodeResult] = useState<string | null>(null);
  const [organizerLoading, setOrganizerLoading] = useState(false);
  const [organizerError, setOrganizerError] = useState<string | null>(null);

  const organizerApiBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  }, []);

  const loadOrganizerData = useCallback(async () => {
    if (!accessToken) return;
    setOrganizerLoading(true);
    setOrganizerError(null);
    try {
      const res = await fetch(`${organizerApiBase}/api/shifts`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.status === 401) {
        fireOn401();
        return;
      }
      if (!res.ok) {
        setOrganizerError(`Ошибка ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => ({})) as { shifts?: Array<{ id: string; name: string; startDate: string; endDate: string; createdAt: string; createdBy?: string }> };
      const shifts = data.shifts || [];
      setOrganizerShifts(shifts);
      const map: Record<string, Array<{ id: string; shiftId: string; name: string; createdAt: string }>> = {};
      for (const shift of shifts) {
        const r = await fetch(`${organizerApiBase}/api/shifts/${shift.id}/squads`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (r.status === 401) {
          fireOn401();
          return;
        }
        const squadData = r.ok ? (await r.json().catch(() => ({})) as { squads?: Array<{ id: string; shiftId: string; name: string; createdAt: string }> }) : { squads: [] };
        map[shift.id] = squadData.squads || [];
      }
      setOrganizerSquadsMap(map);
    } catch (e) {
      setOrganizerError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setOrganizerShifts([]);
    } finally {
      setOrganizerLoading(false);
    }
  }, [accessToken, organizerApiBase]);

  useEffect(() => {
    if (!showOrganizerPanel || !accessToken) return;
    loadOrganizerData();
  }, [showOrganizerPanel, accessToken, loadOrganizerData]);

  useEffect(() => {
    if (!showOrganizerPanel || !accessToken || organizerShifts.length === 0) return;
    let cancelled = false;
    const shiftIds = organizerShifts.map((s) => s.id);
    Promise.all(shiftIds.map((shiftId) =>
      fetch(`${organizerApiBase}/api/shifts/${shiftId}/squads`, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then((r) => {
          if (r.status === 401) { fireOn401(); return { squads: [] }; }
          return r.ok ? r.json() : Promise.resolve({ squads: [] });
        })
        .then((data: { squads?: Array<{ id: string; shiftId: string; name: string; createdAt: string }> }) => ({ shiftId, squads: data.squads || [] }))
    ))
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, Array<{ id: string; shiftId: string; name: string; createdAt: string }>> = {};
        results.forEach(({ shiftId, squads }) => { map[shiftId] = squads; });
        setOrganizerSquadsMap(map);
      });
    return () => { cancelled = true; };
  }, [showOrganizerPanel, accessToken, organizerApiBase, organizerShifts.length]);

  const [openBubble, setOpenBubble] = useState<'bot' | 'events' | 'backup' | 'code' | 'role' | null>(null);
  const [utilityBubblesExpanded, setUtilityBubblesExpanded] = useState(false);
  useEffect(() => {
    if (utilityBubblesExpanded) return;
    if (openBubble === 'events' || openBubble === 'backup' || openBubble === 'role') {
      setOpenBubble(null);
    }
  }, [utilityBubblesExpanded, openBubble]);
  const [panelActiveView, setPanelActiveView] = useState<PanelViewId | null>(null);
  const [squadCornerActiveTab, setSquadCornerActiveTab] = useState<SquadCornerTabId>('squad');
  const [realDiaryActiveTab, setRealDiaryActiveTab] = useState<RealDiaryTabId>('diary');
  const [profile4kActiveTab, setProfile4kActiveTab] = useState<Profile4KTabId>('skills');
  const [teamActiveTab, setTeamActiveTab] = useState<TeamTabId>('engine');
  const [councilActiveTab, setCouncilActiveTab] = useState<CouncilTabId>('council');
  const [broActiveTab, setBroActiveTab] = useState<BroTabId>('initiation');
  const [counselorSquadActiveTab, setCounselorSquadActiveTab] = useState<CounselorSquadTabId>('squad');
  const [shareActiveTab, setShareActiveTab] = useState<ShareTabId>('create-card');
  const [workshopActiveTab, setWorkshopActiveTab] = useState<WorkshopTabId>('architect');
  const [inspectorActiveTab, setInspectorActiveTab] = useState<InspectorTabId>('friendship');
  const [panelOrigin, setPanelOrigin] = useState<'left' | 'right' | 'top' | null>(null);
  const [vozhatifikatorToc, setVozhatifikatorToc] = useState<Array<{ id: string; title: string }>>([]);
  const [vozhatifikatorHtml, setVozhatifikatorHtml] = useState<string | null>(null);
  const [vozhatifikatorLoading, setVozhatifikatorLoading] = useState(false);
  const [vozhatifikatorError, setVozhatifikatorError] = useState<string | null>(null);
  const [vozhatifikatorSubView, setVozhatifikatorSubView] = useState<'book' | 'lights'>('book');
  const vozhatifikatorBookRef = useRef<HTMLDivElement | null>(null);
  const avatarWrapRef = useRef<HTMLButtonElement | null>(null);
  const centerScrollRef = useRef<HTMLDivElement | null>(null);
  const profileOuterRef = useRef<HTMLDivElement | null>(null);
  const profileAutoFitInstancesRef = useRef<FittyInstance[]>([]);
  const broTabOnOpenRef = useRef<BroTabId | null>(null);
  useEffect(() => {
    if (panelActiveView !== 'vozhatifikator' || vozhatifikatorSubView !== 'book' || vozhatifikatorHtml !== null) return;
    const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
    const url = `${base}${base ? '/' : ''}vozhatifikator.md`;
    let cancelled = false;
    setVozhatifikatorLoading(true);
    setVozhatifikatorError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((md) => {
        if (cancelled) return;
        const toc = parseMarkdownToc(md);
        const html = markdownToHtmlWithHeadingIds(md, toc);
        setVozhatifikatorToc(toc);
        setVozhatifikatorHtml(html);
      })
      .catch((e) => {
        if (!cancelled) setVozhatifikatorError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setVozhatifikatorLoading(false);
      });
    return () => { cancelled = true; };
  }, [panelActiveView, vozhatifikatorSubView, vozhatifikatorHtml]);
  const openCabinPanel = useCallback((viewId: PanelViewId | null, origin: 'left' | 'right' | 'top' | null) => {
    const nextViewId = panelActiveView === viewId ? null : viewId;
    setPanelOrigin(nextViewId ? origin : null);
    setPanelActiveView(nextViewId);
  }, [panelActiveView]);

  useEffect(() => {
    if (panelActiveView === 'squad-corner') setSquadCornerActiveTab('squad');
    if (panelActiveView === 'real-diary') setRealDiaryActiveTab('diary');
    if (panelActiveView === 'profile4k') setProfile4kActiveTab('skills');
    if (panelActiveView === 'team') setTeamActiveTab('engine');
    if (panelActiveView === 'council') setCouncilActiveTab('council');
    if (panelActiveView === 'bro') {
      setBroActiveTab(broTabOnOpenRef.current ?? 'initiation');
      broTabOnOpenRef.current = null;
    }
    if (panelActiveView === 'counselor-squad') setCounselorSquadActiveTab('squad');
    if (panelActiveView === 'share') setShareActiveTab('create-card');
    if (panelActiveView === 'workshop') setWorkshopActiveTab('architect');
    if (panelActiveView === 'inspector') setInspectorActiveTab('friendship');
  }, [panelActiveView]);

  useEffect(() => {
    const pending = (window as any)?.__OPEN_PROFILE_PANEL__ as unknown;
    if (typeof pending !== 'string' || !pending) return;
    try {
      (window as any).__OPEN_PROFILE_PANEL__ = null;
    } catch {
      // ignore
    }
    const panel = pending as PanelViewId;
    if (panel === 'bro') {
      openCabinPanel('bro', 'right');
      return;
    }
    // Default: treat as right-origin panel.
    openCabinPanel(panel, 'right');
  }, [openCabinPanel]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  const [isSpaceshipMode, setIsSpaceshipMode] = useState(() =>
    typeof window !== 'undefined' && (
      !!document.querySelector('.profile-spaceship-root') ||
      /profile-desktop/.test(window.location.pathname || window.location.href || '')
    )
  );
  useEffect(() => {
    if (panelActiveView === 'vozhatifikator' && isSpaceshipMode) {
      setVozhatifikatorSubView('book');
    }
  }, [panelActiveView, isSpaceshipMode]);
  const [showRoleSelector, setShowRoleSelector] = useState(() =>
    (typeof window !== 'undefined' && localStorage.getItem('rl_profile_role_selector_seen') === '1') ? false : true
  );
  const [showChildBadges, setShowChildBadges] = useState(false);
  const [showChildRouteForm, setShowChildRouteForm] = useState(false);
  const [devGrantLevelId, setDevGrantLevelId] = useState('');
  const [devGrantStatus, setDevGrantStatus] = useState<'locked' | 'in_progress' | 'achieved'>('achieved');
  const [devGrantReflection, setDevGrantReflection] = useState('');
  const [childProgressFromFile, setChildProgressFromFile] = useState<Record<string, { status?: string; achievedAt?: string }> | null>(null);
  const [childReportMeta, setChildReportMeta] = useState<{ nickname?: string; exportedAt?: string } | null>(null);
  const [parentViewLinkInput, setParentViewLinkInput] = useState('');
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [showParentCodeModal, setShowParentCodeModal] = useState(false);
  const [parentCodeResult, setParentCodeResult] = useState<{ parentLinkCode: string; expiresAt: number } | null>(null);
  const [parentCodeBusy, setParentCodeBusy] = useState(false);
  const [childRouteText, setChildRouteText] = useState('');
  const [campFacts, setCampFacts] = useState<{ address?: { campName?: string; base?: string; address?: string; route?: string }; contacts?: { phone?: string; email?: string; vk?: string; site?: string; telegram?: string; organizer?: string }; currentSeason?: { name?: string; dates?: string; price?: string; theme?: string }; documents?: string[] } | null>(null);
  const [campFactsLoading, setCampFactsLoading] = useState(false);
  const [campFactsError, setCampFactsError] = useState<string | null>(null);
  const [counselorSquadName, setCounselorSquadName] = useState('');
  const [counselorJoinCode, setCounselorJoinCode] = useState('');
  const [counselorJoinError, setCounselorJoinError] = useState<string | null>(null);
  const [disbandConfirmOpen, setDisbandConfirmOpen] = useState(false);
  const [carouselRotationSteps, setCarouselRotationSteps] = useState(0);
  const [pathCarouselRotationSteps, setPathCarouselRotationSteps] = useState(0);
  const [squadIdeasCarouselSteps, setSquadIdeasCarouselSteps] = useState(0);

  const showSandbox = role === 'developer' || import.meta.env.DEV || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sandbox') === '1');

  const disposeProfileAutoFit = useCallback(() => {
    profileAutoFitInstancesRef.current.forEach((instance) => instance.unsubscribe());
    profileAutoFitInstancesRef.current = [];
  }, []);

  const applyProfileAutoFit = useCallback(() => {
    if (typeof window === 'undefined') return;
    const root = profileOuterRef.current;
    if (!root) return;

    disposeProfileAutoFit();

    const targets = Array.from(new Set(
      Array.from(root.querySelectorAll<HTMLElement>(PROFILE_AUTO_FIT_SELECTOR)).filter((el) => {
        if (!el) return false;
        const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        if (!text) return false;
        if (text.length > 96 && !el.classList.contains('profile-autofit')) return false;
        if (el.closest('.profile-autofit-ignore')) return false;
        if (el.querySelector('input, textarea, select')) return false;
        return true;
      })
    ));

    profileAutoFitInstancesRef.current = targets.map((el) => {
      const fontSize = Number.parseFloat(window.getComputedStyle(el).fontSize) || 16;
      const maxSize = Math.max(12, fontSize);
      const minSize = el.classList.contains('profile-view-cabin-profile-nickname')
        ? 8
        : Math.max(10, Math.min(14, maxSize));
      return fitty(el, {
        minSize,
        maxSize,
        multiLine: false,
        observeMutations: isSpaceshipMode ? undefined : { subtree: true, childList: true },
      });
    });

    profileAutoFitInstancesRef.current.forEach((instance) => instance.fit({ sync: true }));
  }, [disposeProfileAutoFit, isSpaceshipMode]);

  useEffect(() => {
    const run = () => applyProfileAutoFit();
    const useIdle = typeof requestIdleCallback !== 'undefined';
    const handle = useIdle
      ? (requestIdleCallback(run, { timeout: 100 }) as number)
      : requestAnimationFrame(run);
    return () => {
      if (useIdle) cancelIdleCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [
    applyProfileAutoFit,
    panelActiveView,
    activeTab,
    isSpaceshipMode,
  ]);

  useEffect(() => () => disposeProfileAutoFit(), [disposeProfileAutoFit]);

  // В кабине всегда показываем все дашборды (по спеке); в обычном профиле — по роли
  const seeOtradBlocksInView = isSpaceshipMode || seeOtradBlocks;

  const { profile, progress, favorites = [] } = userData || { profile: {}, progress: {}, favorites: [] };

  useEffect(() => {
    if (favorites.length === 0) setCarouselRotationSteps(0);
  }, [favorites.length]);

  const rank = getRank(profile?.stats?.totalLevelsAchieved || 0);
  const xpPercent = Math.min(100, ((profile?.stats?.totalLevelsAchieved || 0) % 10) * 10);
  const currentLevels = profile?.stats?.totalLevelsAchieved ?? 0;
  const levelsInCurrentRankStep = currentLevels % 10;
  const levelsToNextRank = levelsInCurrentRankStep === 0 ? 10 : 10 - levelsInCurrentRankStep;
  const nextRankAt = currentLevels + levelsToNextRank;
  const lastSeenRankLevel = userData?.meta?.lastSeenRankLevel ?? 0;
  const showRankUpOverlay = currentLevels > lastSeenRankLevel && getRank(currentLevels) !== getRank(lastSeenRankLevel);
  const vozhCompletedCount = userData?.vozhatifikatorChecklist?.completedIds?.length ?? 0;
  const vozhProgressPercent = Math.round((100 * vozhCompletedCount) / Math.max(1, VOZHATIFIKATOR_CHECKLIST_ITEMS.length));
  const vozhatifikatorCardImageUrl = `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}вжтфктр-card.png`;
  const profile4kProgressPercent = Math.min(100, Math.round((profile?.stats?.totalLevelsAchieved ?? 0) * 2));
  const shareProgressPercent = Math.min(100, Math.round(((profile?.stats?.totalLevelsAchieved ?? 0) / 20) * 100));

  const diaryFilledDays = Object.values(userData?.diaryProgress?.entries || {}).filter((entry) =>
    Boolean(entry?.mainMoments || entry?.memorableText || entry?.morningText || entry?.dayText || entry?.eveningText)
  ).length;
  const diaryProgressPercent = Math.min(100, Math.round((100 * diaryFilledDays) / Math.max(1, (userData?.diaryProgress?.currentDay ?? 1))));

  const squadData = userData?.diaryProgress?.squad;
  const squadSignals = [
    Boolean(squadData?.name),
    Boolean(squadData?.motto),
    Boolean(squadData?.chants),
    Boolean(squadData?.greeting),
    Boolean(squadData?.memes),
    Boolean(squadData?.photoCorner || squadData?.photoFlag || squadData?.photoSquad || squadData?.photoWithCounselors),
  ];
  const squadCornerProgressPercent = Math.round((100 * squadSignals.filter(Boolean).length) / squadSignals.length);

  const broCompletedDeedsCount = Object.values(userData?.broProgress?.completedDeeds || {}).reduce((sum, deeds) => (
    sum + (Array.isArray(deeds) ? deeds.length : 0)
  ), 0);
  const broProgressPercent = Math.min(
    100,
    (userData?.broProgress?.hasPassport ? 18 : 0) +
      (userData?.broProgress?.isBro ? 22 : 0) +
      Math.min(60, broCompletedDeedsCount * 8)
  );

  const teamProgressPercent = myTeam
    ? Math.min(
        100,
        25 +
          Math.min(35, (myTeam.members?.length ?? 0) * 7) +
          Math.min(20, (myTeam.goals?.length ?? 0) * 6) +
          Math.min(20, (myTeam.achievements?.length ?? 0) * 8)
      )
    : 0;

  const councilProgressPercent = myTeam
    ? Math.min(100, Math.round((100 * (myTeam.achievements?.length ?? 0)) / Math.max(1, myTeam.goals?.length || 3)))
    : 0;

  useEffect(() => {
    if (userData?.profile) {
      setNicknameInput(userData.profile.nickname || '');
      setAvatarInput(userData.profile.avatar || '🧑‍🚀');
      setStatusInput(userData.profile.status || '');
      setBioInput(userData.profile.bio || '');
    }
  }, [userData]);

  useEffect(() => {
    if (hasTouchedCabinProfilePanel) return;
    setIsCabinProfileExpanded(false);
  }, [userData?.profile?.status, userData?.profile?.bio, hasTouchedCabinProfilePanel]);

  useEffect(() => {
    if (!isSpaceshipMode || !isCabinProfileExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setStatusInput(profile?.status || '');
      setBioInput(profile?.bio || '');
      setIsCabinProfileExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSpaceshipMode, isCabinProfileExpanded, profile?.status, profile?.bio]);

  useEffect(() => {
    if (deviceId && !genDeviceId) setGenDeviceId(deviceId);
  }, [deviceId, genDeviceId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('rl_gen_secret');
      if (saved && !genSecret) setGenSecret(saved);
      const savedEvents = sessionStorage.getItem('rl_events_secret');
      if (savedEvents && !eventsSecret) setEventsSecret(savedEvents);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!eventsSecret.trim()) return;
    setEventsError(null);
    setEventsBusy(true);
    try {
      const res = await fetch(`/api/webhook/confirmation-events?secret=${encodeURIComponent(eventsSecret.trim())}&limit=20`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEventsError(data?.error || 'Ошибка загрузки');
        setEventsData([]);
        return;
      }
      setEventsHasLoaded(true);
      setEventsData(Array.isArray(data.events) ? data.events : []);
    } catch {
      setEventsError('Не удалось подключиться к серверу');
      setEventsData([]);
    } finally {
      setEventsBusy(false);
    }
  }, [eventsSecret]);

  const loadBadgeApprovalsData = useCallback(async () => {
    if (!accessToken) {
      setBadgeRequestsMine([]);
      setBadgeRequestsInbox([]);
      setBadgeRequestsError('Сначала войдите по коду, чтобы работать с заявками.');
      return;
    }
    setBadgeRequestsBusy(true);
    setBadgeRequestsError(null);
    try {
      const minePromise = canRequestApprovals ? loadMyBadgeRequests(accessToken) : Promise.resolve([]);
      const inboxPromise = canModerateApprovals ? loadBadgeRequestsInbox(accessToken) : Promise.resolve([]);
      const [mine, inbox] = await Promise.all([minePromise, inboxPromise]);
      setBadgeRequestsMine(mine);
      setBadgeRequestsInbox(inbox);
    } catch (e) {
      setBadgeRequestsError(e instanceof Error ? e.message : 'Не удалось загрузить заявки.');
      setBadgeRequestsMine([]);
      setBadgeRequestsInbox([]);
    } finally {
      setBadgeRequestsBusy(false);
    }
  }, [accessToken, canRequestApprovals, canModerateApprovals]);

  useEffect(() => {
    if (!accessToken || !canRequestApprovals || !getLevelProgress) return;
    let cancelled = false;
    loadMyApprovals(accessToken)
      .then((approvals) => {
        if (cancelled) return;
        let count = 0;
        approvals.forEach((item: BadgeApprovalItem) => {
          const levelId = String(item.levelId || '').trim();
          if (!levelId) return;
          if (getLevelProgress(levelId)?.status !== 'achieved') count += 1;
        });
        setPendingApprovalsCount(count);
      })
      .catch(() => {
        if (!cancelled) setPendingApprovalsCount(0);
      });
    return () => { cancelled = true; };
  }, [accessToken, canRequestApprovals, getLevelProgress, userData?.progress]);

  const syncApprovedLevels = useCallback(async () => {
    if (!accessToken) {
      setApprovalsSyncStatus('Сначала войдите по коду.');
      return;
    }
    setApprovalsSyncBusy(true);
    setApprovalsSyncStatus(null);
    try {
      const approvals = await loadMyApprovals(accessToken);
      let applied = 0;
      approvals.forEach((item: BadgeApprovalItem) => {
        const levelId = String(item.levelId || '').trim();
        if (!levelId) return;
        applyApprovedLevel(levelId, item.evidence || undefined);
        applied += 1;
      });
      setApprovalsSyncStatus(applied > 0 ? `Синхронизировано одобрений: ${applied}.` : 'Одобренных заявок пока нет.');
      await loadBadgeApprovalsData();
      setPendingApprovalsCount(0);
      if (applied > 0) showHint({ title: 'Прогресс обновлён', content: 'Одобрения вожатого добавлены в твой прогресс.' });
    } catch (e) {
      setApprovalsSyncStatus(e instanceof Error ? e.message : 'Не удалось синхронизировать одобрения.');
    } finally {
      setApprovalsSyncBusy(false);
    }
  }, [accessToken, applyApprovedLevel, loadBadgeApprovalsData, showHint]);

  const loadMySquadInfo = useCallback(async () => {
    if (!accessToken || !expensiveActionsAllowed) {
      setMySquadInfo(null);
      setMySquadError(null);
      return;
    }
    setMySquadBusy(true);
    setMySquadError(null);
    try {
      const data = await loadMySquad(accessToken);
      setMySquadInfo(data);
    } catch (e) {
      setMySquadInfo(null);
      setMySquadError(e instanceof Error ? e.message : 'Не удалось загрузить данные отряда.');
    } finally {
      setMySquadBusy(false);
    }
  }, [accessToken, expensiveActionsAllowed]);

  const joinMySquadById = useCallback(async () => {
    const sid = mySquadJoinId.trim();
    if (!sid) {
      setMySquadJoinStatus('Введите squadId.');
      return;
    }
    if (!accessToken) {
      setMySquadJoinStatus('Сначала войдите по коду.');
      return;
    }
    setMySquadJoinBusy(true);
    setMySquadJoinStatus(null);
    try {
      await joinSquad(accessToken, sid, { nickname: profile.nickname });
      setMySquadJoinStatus('Вступление выполнено.');
      setMySquadJoinId('');
      await loadMySquadInfo();
      await loadBadgeApprovalsData();
    } catch (e) {
      setMySquadJoinStatus(e instanceof Error ? e.message : 'Не удалось вступить в отряд.');
    } finally {
      setMySquadJoinBusy(false);
    }
  }, [accessToken, mySquadJoinId, profile.nickname, loadMySquadInfo, loadBadgeApprovalsData]);

  const handleDevLoginAs = useCallback(async (targetRole: UserRole) => {
    if (!showSandbox) return;
    setDevLoginBusyRole(targetRole);
    setDevLoginError(null);
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          deviceId: deviceId || 'dev-local',
          campId: mySquadInfo?.membership?.campId || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDevLoginError(data?.error || 'Не удалось выполнить dev login.');
        return;
      }
      setAuth({
        role: (data.role || targetRole) as UserRole,
        accessToken: data.accessToken,
        campId: data.campId || undefined,
        exp: data.exp
      });
    } catch (e) {
      setDevLoginError(e instanceof Error ? e.message : 'Не удалось подключиться к backend.');
    } finally {
      setDevLoginBusyRole(null);
    }
  }, [showSandbox, deviceId, mySquadInfo?.membership?.campId, setAuth]);

  const clearDevLogin = useCallback(() => {
    setAuth({ role: 'developer', accessToken: undefined, campId: undefined, exp: undefined });
  }, [setAuth]);

  const setSandboxRole = useCallback((nextRole: UserRole) => {
    setAuth({ role: nextRole, accessToken: undefined, campId: undefined, exp: undefined });
  }, [setAuth]);

  useEffect(() => {
    void loadMySquadInfo();
  }, [loadMySquadInfo]);

  useEffect(() => {
    if (openBubble !== 'events') return;
    if (eventsTab !== 'approvals') return;
    void loadBadgeApprovalsData();
  }, [openBubble, eventsTab, loadBadgeApprovalsData]);

  useEffect(() => {
    if (role !== 'parent') return;
    const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
    const url = `${base}${base ? '/' : ''}ai-data/camp-facts.json`;
    let cancelled = false;
    setCampFactsLoading(true);
    setCampFactsError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setCampFacts(json);
      })
      .catch((e) => {
        if (!cancelled) setCampFactsError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setCampFactsLoading(false);
      });
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    if (!planFormBadge) {
      setPlanApiAvailable(null);
      return;
    }
    setPlanApiAvailable(null);
    checkPlanApiAvailable().then(setPlanApiAvailable);
  }, [planFormBadge]);

  useEffect(() => {
    setIsSpaceshipMode(!!(typeof document !== 'undefined' && document.querySelector('.profile-spaceship-root')));
  }, []);

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [roleDropdownOpen]);

  useEffect(() => {
    const h = window.location.hash;
    if (h === '#wing') {
      broTabOnOpenRef.current = 'wing';
      openCabinPanel('bro', 'right');
      window.history.replaceState(null, '', window.location.pathname + window.location.search + '#bro');
    }
  }, [openCabinPanel]);

  // Handle ?parent_view= on load: show child's achieved badges without overwriting parent's progress
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('parent_view');
    if (!encoded) return;
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = decodeURIComponent(escape(typeof atob !== 'undefined' ? atob(padded) : ''));
      const data = JSON.parse(json) as ParentReportPayload;
      if (!data || typeof data.progress !== 'object') return;
      setChildProgressFromFile(data.progress);
      setChildReportMeta(data.profile?.nickname != null || data.exportedAt ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt } : null);
      setShowChildBadges(true);
      if (role === 'parent') openCabinPanel('parents', 'right');
      params.delete('parent_view');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    } catch {
      // invalid payload — ignore
    }
  }, [role, openCabinPanel]);

  // Handle ?parent_code= on load: fetch snapshot from API and show child badges
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('parent_code');
    if (!code?.trim()) return;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    const apiUrl = useLocalApi ? '/api/parent-snapshot' : `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
    fetch(`${apiUrl}?code=${encodeURIComponent(code.trim())}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 410) showHint({ title: 'Код не найден', content: 'Код не найден или срок действия истёк.' });
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data || typeof data.progress !== 'object') return;
        setChildProgressFromFile(data.progress);
        setChildReportMeta(data.profile?.nickname != null || data.exportedAt ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt } : null);
        setShowChildBadges(true);
        if (role === 'parent') openCabinPanel('parents', 'right');
        params.delete('parent_code');
        const qs = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
      })
      .catch(() => showHint({ title: 'Ошибка', content: 'Не удалось загрузить данные по коду.' }));
  }, [role, openCabinPanel]);

  const initialHashHandledRef = useRef(false);
  useEffect(() => {
    const h = window.location.hash;
    if (h === '#share' || h === '#share-center') {
      const scrollToShareCenter = () => {
        const el = document.getElementById('profile-share-center');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return true;
        }
        return false;
      };
      const run = () => {
        if (scrollToShareCenter()) return;
        window.setTimeout(scrollToShareCenter, 150);
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    }
    if (h === '#workshop' || (h.startsWith('#workshop') && h.length > 8)) {
      const hasOpenWorkshopFlag = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('rl_open_workshop');
      if (hasOpenWorkshopFlag) {
        if (initialHashHandledRef.current) return;
        initialHashHandledRef.current = true;
        try { sessionStorage.removeItem('rl_open_workshop'); } catch {}
        setActiveTab('workshop');
        openCabinPanel('workshop', 'right');
      } else {
        try {
          const url = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', url);
        } catch {}
      }
    }
  }, [openCabinPanel]);

  const PROFILE_TUTORIAL_STEPS: HintStep[] = [
    { title: 'Центр управления', content: 'Это твой паспорт Реального Лагеря. Здесь растёт твой Ранг и сохраняются достижения.', targetSelector: '#profile-passport-card' },
    { title: 'В пути', content: 'Тут будут значки, которые ты выбрал в путь. Ты можешь в любой момент отправить подтверждение вожатым.', targetSelector: '#profile-tab-active' },
    { title: 'Коллекция', content: 'Твои трофеи. Каждый завершённый значок навсегда остаётся в твоём космическом флоте.', targetSelector: '#profile-tab-collection' },
    { title: 'Помощь ИИ', content: 'Если запутаешься — спроси Валюшу. Она знает всё о требованиях к каждому значку.', targetSelector: '#profile-chat-trigger' },
    { title: 'Шеринг достижений', content: 'Здесь можно создать карточку прогресса и поделиться с друзьями.', targetSelector: '#profile-share-center' },
  ];

  const startProfileTutorial = useCallback((withComplete: boolean) => {
    startTutorial(PROFILE_TUTORIAL_STEPS, {
      onComplete: withComplete ? () => completeTutorial() : undefined,
      onStepChange: (stepIdx) => {
        if (stepIdx === 1) setActiveTab('active');
        else if (stepIdx === 2) setActiveTab('collection');
        else if (stepIdx === 4) {
          const el = document.getElementById('profile-share-center');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
    });
  }, [startTutorial, completeTutorial]);

  const profileTutorialStartedRef = useRef(false);
  useEffect(() => {
    if (isLoading || userData?.meta?.hasCompletedTutorial || profileTutorialStartedRef.current) return;
    profileTutorialStartedRef.current = true;
    startProfileTutorial(true);
  }, [isLoading, userData?.meta?.hasCompletedTutorial, startProfileTutorial]);

  const badgeLookupMap = useMemo(() => {
    const m = new Map<string, Badge>();
    if (badges) badges.forEach((b: Badge) => m.set(String(b.id), b));
    return m;
  }, [badges]);

  const { badgeTitlesInPath, favoriteBadgeTitles, badgeCarouselItems } = useMemo(() => {
    const pathTitles = new Set<string>();
    const favTitles = new Set<string>();
    const resolveTitle = (baseId: string): string | null => {
      const b = badgeLookupMap.get(baseId);
      if (b?.title) return b.title;
      if (badges) {
        const found = badges.find((b: Badge) => b.id === baseId || String(b.id).startsWith(baseId + '.'));
        return found?.title ?? null;
      }
      return null;
    };
    const resolveBadge = (baseId: string): { baseId: string; title: string; categoryId: string; emoji?: string } | null => {
      const b = badgeLookupMap.get(baseId);
      if (b?.title && b?.category_id) return { baseId, title: b.title, categoryId: b.category_id, emoji: b.emoji };
      if (badges) {
        const found = badges.find((b: Badge) => b.id === baseId || String(b.id).startsWith(baseId + '.'));
        if (found?.title && found?.category_id) return { baseId, title: found.title, categoryId: found.category_id, emoji: found.emoji };
      }
      return null;
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
    const carouselBaseIds = new Map<string, { baseId: string; title: string; categoryId: string; emoji?: string }>();
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
  }, [progress, favorites, badgeLookupMap, badges]);

  const inspectorCard = useMemo(() => {
    const prog = userData?.inspectorProgress || { currentDay: 1, completedTasks: {} };
    const day = prog.currentDay;
    const mission = inspectorMissions.find(m => m.day === day) || inspectorMissions[0];
    const completed = (prog.completedTasks && prog.completedTasks[String(day)]) || [];
    return { currentDay: day, completedCount: completed.length, totalTasks: mission.tasks.length };
  }, [userData?.inspectorProgress]);

  const activeLevels = Object.entries(progress).filter(([_, p]) => p.status === 'in_progress');
  const activeBaseIds = useMemo(
    () => Array.from(new Set(
      Object.entries(progress)
        .filter(([_, p]) => p?.status === 'in_progress')
        .map(([id]) => getBaseId(id))
    )),
    [progress]
  );
  /** Один элемент на значок (не на уровень): для карусели «В пути» без дублей и без 21 копии при одном значке */
  const pathItems = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ baseId: string; levelId: string }> = [];
    for (const [levelId] of activeLevels) {
      const baseId = getBaseId(levelId);
      if (seen.has(baseId)) continue;
      seen.add(baseId);
      out.push({ baseId, levelId });
    }
    return out;
  }, [activeLevels]);
  const ensureBadgeLoadedRef = useRef(ensureBadgeLoaded);
  ensureBadgeLoadedRef.current = ensureBadgeLoaded;
  useEffect(() => {
    if (activeBaseIds.length === 0) return;
    const baseIds = activeBaseIds.slice();
    const BATCH_SIZE = 4;
    const loadBatch = (offset: number) => {
      const load = ensureBadgeLoadedRef.current;
      if (!load) return;
      const batch = baseIds.slice(offset, offset + BATCH_SIZE);
      batch.forEach((baseId) => { void load(baseId); });
      const next = offset + BATCH_SIZE;
      if (next < baseIds.length) {
        const schedule = typeof requestIdleCallback !== 'undefined'
          ? () => requestIdleCallback(() => loadBatch(next), { timeout: 200 })
          : () => setTimeout(() => loadBatch(next), 50);
        schedule();
      }
    };
    loadBatch(0);
  }, [activeBaseIds.join(',')]);
  useEffect(() => {
    if (pathItems.length === 0) setPathCarouselRotationSteps(0);
  }, [pathItems.length]);
  const hasWorkshopAccess = useMemo(() => {
    return Object.entries(progress).some(([key, p]) => {
      if (p.status !== 'in_progress' && p.status !== 'achieved') return false;
      return key === '1.16.1' || key.startsWith('1.16.1.') || key === '1.16.2' || key.startsWith('1.16.2.');
    });
  }, [progress]);
  const inspectorProgressPercent = Math.round((inspectorCard.totalTasks ? (100 * inspectorCard.completedCount / inspectorCard.totalTasks) : 0));
  const workshopProgressPercent = Math.min(100, (hasWorkshopAccess ? 40 : 0) + Math.min(60, (customBadges?.length ?? 0) * 15));
  const achievedSorted = Object.entries(progress)
    .filter(([_, p]) => p.status === 'achieved')
    .sort((a, b) => (b[1].achievedAt || '').localeCompare(a[1].achievedAt || ''));

  const isFavorite = (id: string) => favorites.some(fav => getBaseId(fav) === getBaseId(id));

  const handleWorkshopSubmit = () => {
    if (!workshopForm.title) return;
    const cid = `custom.${Date.now()}`;
    if (!addCustomBadge) return;
    addCustomBadge({ id: `${cid}.1`, title: workshopForm.title, emoji: '⚒️', category_id: workshopCategoryId, level: 'Базовый', criteria: workshopForm.level1 || 'Начать путь', description: workshopForm.description });
    if (workshopForm.image && setCustomBadgeImage) setCustomBadgeImage(cid, workshopForm.image);
    setWorkshopSuccessPending({ title: workshopForm.title, description: workshopForm.description || '', categoryId: workshopCategoryId });
    setWorkshopForm({ title: '', description: '', skill: 'critical', level1: '', level2: '', image: null });
  };

  const handleWorkshopSuccessOnlySave = () => {
    setWorkshopSuccessPending(null);
    setActiveTab('active');
  };

  const handleWorkshopSuccessSendTelegramAndCard = () => {
    const pending = workshopSuccessPending;
    if (!pending) return;
    const telegramText = `Концепт: ${pending.title}. ${pending.description || ''}`;
    window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(telegramText)}`, '_blank', 'noopener,noreferrer');
    setWorkshopBusy(true);
    (async () => {
      try {
        const result = await generateSocialCard({
          format: 'story',
          kind: 'creator_proposal',
          profile: { nickname: profile.nickname ?? '', avatar: profile.avatar ?? '', rank },
          badge: { title: pending.title, emoji: '⚒️', categoryId: pending.categoryId, levelLabel: 'НОВЫЙ СМЫСЛ' },
          createdAt: new Date().toISOString(),
        });
        (async () => {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onloadend = () => {
                const s = r.result as string;
                resolve(s && s.includes(',') ? s.split(',')[1] : '');
              };
              r.onerror = reject;
              r.readAsDataURL(result.blob);
            });
            const res = await fetch('/api/telegram/notify-creator-card', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64,
                badgeTitle: pending.title,
                description: pending.description || '',
              }),
            });
            if (res.ok) showHint({ title: 'Отправлено', content: 'Карточка отправлена вожатым.' });
            else showHint({ title: 'Сохранено у тебя', content: 'Карточка в канал не отправлена, но сохранена у тебя.' });
          } catch {
            showHint({ title: 'Сохранено у тебя', content: 'Карточка в канал не отправлена, но сохранена у тебя.' });
          }
        })();
        await shareOrDownloadSocialCard(result);
      } catch (e) {
        console.error(e);
      } finally {
        setWorkshopBusy(false);
        setWorkshopSuccessPending(null);
        setActiveTab('active');
      }
    })();
  };

  const isImageAvatar = (v: string | undefined) => v && (v.startsWith('data:') || v.startsWith('http') || v.startsWith('/'));

  const roleSelectorVisible = isSpaceshipMode && showRoleSelector && import.meta.env.DEV;
  const panelTitleMap: Record<PanelViewId, string> = {
    passport: 'Паспорт',
    inspector: 'Инспектор Пользы',
    profile4k: '4К-профиль',
    'counselor-squad': 'Отряд вожатых',
    wing: 'Крыло',
    'squad-corner': 'Отрядный уголок',
    'real-diary': 'Реальный Дневник',
    team: 'Движок',
    council: 'Совет Лагеря',
    bro: 'БРО',
    workshop: 'Мастерская',
    share: 'Шеринг',
    vozhatifikator: 'Вожатификатор',
    parents: 'Для родителей',
  };
  const consoleCopy = useMemo(() => {
    const exitHint = 'Чтобы выйти, нажми на выбранный раздел ещё раз.';

    if (panelActiveView) {
      const sectionName = panelTitleMap[panelActiveView];
      const title = `Ты в разделе «${sectionName}».`;

      switch (panelActiveView) {
        case 'passport':
          return { title, meta: `Тут твой профиль: имя, аватар, ранг и прогресс. Статус и описание можно менять. ${exitHint}` };
        case 'inspector':
          return { title, meta: `Инспектор Пользы: игровая система полезных дел. Прокачивает 4К и культуру заботы. ${exitHint}` };
        case 'profile4k':
          return { title, meta: `4К-профиль: твой рост в креативности, коммуникации, кооперации и критическом мышлении. ${exitHint}` };
        case 'counselor-squad':
          return { title, meta: `Отряд вожатых: вход по коду или создание отряда (для СВ/организаторов). ${exitHint}` };
        case 'wing':
          return { title, meta: `Твоё Крыло: команда для дел наставников. Здесь аватар Крыла, участие в делах и шаг к Совету. ${exitHint}` };
        case 'squad-corner':
          return { title, meta: `Отрядный уголок: собери лицо отряда. Название, девиз, кричалки, мемы и фото. ${exitHint}` };
        case 'real-diary':
          return { title, meta: `Реальный Дневник: записывай, как прошёл день, и собирай итоги. Это твоя история смены. ${exitHint}` };
        case 'team':
          return { title, meta: `Движок: команда по интересам для отрядных дел. Тут цель, участники, приглашения и достижения. ${exitHint}` };
        case 'council':
          return { title, meta: `Совет Лагеря: рабочий совет идей и решений. Предлагай инициативы и доводи их до результата. ${exitHint}` };
        case 'bro':
          return { title, meta: `БРО-Движение: путь будущего вожатого. Бросвящение, Бропаспорт и Бродела. ${exitHint}` };
        case 'workshop':
          return { title, meta: `Мастерская (Создатель Пути): предлагай новые значки и улучшения. Доступ открывается через 1.16.1 «Путеводитель». ${exitHint}` };
        case 'share':
          return { title, meta: `Шеринг: создай карточку прогресса (9:16 и 16:9) и поделись/скачай. ${exitHint}` };
        case 'vozhatifikator':
          return { title, meta: `Вожатификатор: чек-лист вожатификации и книга. Отмечай пункты и смотри свой уровень. ${exitHint}` };
        case 'parents':
          return { title, meta: `Для родителей: программа смены, важные факты и блоки для планирования. ${exitHint}` };
        default:
          return { title, meta: `${exitHint}` };
      }
    }

    if (activeTab === 'active') {
      return { title: 'Ты на экране «В пути».', meta: 'Здесь значки, которые ты сейчас проходишь, и шаги по ним.' };
    }
    if (activeTab === 'favorites') {
      return { title: 'Ты на экране «Избранное».', meta: 'Здесь твои избранные значки. Можно быстро перейти и убрать лишнее.' };
    }
    if (activeTab === 'collection') {
      return { title: 'Ты на экране «Коллекция».', meta: 'Здесь все значки и уровни: что уже пройдено и что можно взять в путь.' };
    }
    if (activeTab === 'journal') {
      return { title: 'Ты на экране «Журнал».', meta: 'Здесь твои записи, заметки и итоги по смене.' };
    }
    if (activeTab === 'workshop') {
      return { title: 'Ты на экране «Мастерская».', meta: 'Создатель Пути: предлагай новые значки и улучшения Путеводителя (доступ через 1.16.1).' };
    }

    return { title: 'Ты в Кабине.', meta: 'Выбери раздел: Инспектор, Движок, Совет, БРО, Дневник, Отрядный уголок, 4К, Вожатификатор.' };
  }, [panelActiveView, activeTab]);
  const travelerGateReason = 'Для отправки, модерации и онлайн-синхронизации войдите как участник смены по коду.';
  const openUnlockByCode = useCallback(() => {
    setOpenBubble('bot');
  }, []);

  type CompanionScreen = {
    title: string;
    subtitle: string;
    progress: number;
    action: () => void;
  };

  const companionMap: Partial<Record<PanelViewId, { left?: CompanionScreen; right?: CompanionScreen }>> = {
  };
  const panelCompanions = panelActiveView ? companionMap[panelActiveView] : undefined;
  const hasCabinProfileDraftChanges =
    statusInput.trim().slice(0, 80) !== (profile?.status || '') ||
    bioInput.trim().slice(0, 220) !== (profile?.bio || '');
  const cabinDisplayName = (profile.nickname || 'Искатель').trim() || 'Искатель';
  const cabinStatusText = (profile?.status || 'Добавь статус экипажа').trim();
  const cabinBioText = (profile?.bio || 'Добавь пару слов о себе').trim();

  const openCabinProfileEditor = () => {
    setHasTouchedCabinProfilePanel(true);
    setStatusInput(profile?.status || '');
    setBioInput(profile?.bio || '');
    setIsCabinProfileExpanded(true);
  };

  const closeCabinProfileEditor = () => {
    setStatusInput(profile?.status || '');
    setBioInput(profile?.bio || '');
    setIsCabinProfileExpanded(false);
  };

  const saveCabinProfileText = () => {
    const nextStatus = statusInput.trim().slice(0, 80);
    const nextBio = bioInput.trim().slice(0, 220);
    setStatusInput(nextStatus);
    setBioInput(nextBio);
    setProfileStatus(nextStatus);
    setProfileBio(nextBio);
    setHasTouchedCabinProfilePanel(true);
    setIsCabinProfileExpanded(false);
    showHint({ title: 'Сохранено', content: 'Статус и описание обновлены.' });
  };

  const openInitiativeModal = useCallback(() => {
    setInitiativeForm({
      topicDraft: '',
      currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
      shiftLength: 21,
      campProgram3d: ''
    });
    setInitiativeResult(null);
    setInitiativeError(null);
    setInitiativeModalOpen(true);
  }, [userData?.diaryProgress?.currentDay]);

  const renderPanelContent = () => (
    <>
      {panelActiveView === 'squad-corner' && (
        travelerMode ? (
          <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
            {isSpaceshipMode ? (
              <SquadCornerDashboard
                variant="cabin"
                activeTab={squadCornerActiveTab}
                onTabChange={setSquadCornerActiveTab}
                onNavigateToBadge={onNavigateToBadge}
              />
            ) : <SquadCornerDashboard onNavigateToBadge={onNavigateToBadge} />}
          </FeatureGate>
        ) : (
          isSpaceshipMode ? (
            <SquadCornerDashboard
              variant="cabin"
              activeTab={squadCornerActiveTab}
              onTabChange={setSquadCornerActiveTab}
              onNavigateToBadge={onNavigateToBadge}
            />
          ) : <SquadCornerDashboard onNavigateToBadge={onNavigateToBadge} />
        )
      )}
      {panelActiveView === 'real-diary' && (
        travelerMode ? (
          <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
            {isSpaceshipMode ? (
              <RealDiaryDashboard
                variant="cabin"
                activeTab={realDiaryActiveTab}
                onTabChange={setRealDiaryActiveTab}
                onNavigateToBadge={onNavigateToBadge}
                onScrollToInspector={() => {
                  setActiveTab('active');
                  setPanelActiveView(null);
                  setTimeout(() => document.getElementById('inspector-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
              />
            ) : (
              <RealDiaryDashboard
                onNavigateToBadge={onNavigateToBadge}
                onScrollToInspector={() => {
                  setActiveTab('active');
                  setPanelActiveView(null);
                  setTimeout(() => document.getElementById('inspector-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
              />
            )}
          </FeatureGate>
        ) : (
          isSpaceshipMode ? (
            <RealDiaryDashboard
              variant="cabin"
              activeTab={realDiaryActiveTab}
              onTabChange={setRealDiaryActiveTab}
              onNavigateToBadge={onNavigateToBadge}
              onScrollToInspector={() => {
                setActiveTab('active');
                setPanelActiveView(null);
                setTimeout(() => document.getElementById('inspector-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
            />
          ) : (
            <RealDiaryDashboard
              onNavigateToBadge={onNavigateToBadge}
              onScrollToInspector={() => {
                setActiveTab('active');
                setPanelActiveView(null);
                setTimeout(() => document.getElementById('inspector-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
            />
          )
        )
      )}
      {panelActiveView === 'team' && (
        travelerMode ? (
          <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
            {isSpaceshipMode ? (
              <TeamDashboard
                variant="cabin"
                activeTab={teamActiveTab}
                onTabChange={setTeamActiveTab}
                onNavigateToBadge={onNavigateToBadge}
                onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
              />
            ) : (
              <TeamDashboard
                forceExpanded={false}
                onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
              />
            )}
          </FeatureGate>
        ) : (
          isSpaceshipMode ? (
            <TeamDashboard
              variant="cabin"
              activeTab={teamActiveTab}
              onTabChange={setTeamActiveTab}
              onNavigateToBadge={onNavigateToBadge}
              onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
            />
          ) : (
            <TeamDashboard
              forceExpanded={false}
              onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
            />
          )
        )
      )}
      {panelActiveView === 'council' && (
        travelerMode ? (
          <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
            {isSpaceshipMode ? (
              <CouncilDashboard
                variant="cabin"
                activeTab={councilActiveTab}
                onTabChange={setCouncilActiveTab}
                onNavigateToBadge={onNavigateToBadge}
                onOpenTeamPanel={() => setPanelActiveView('team')}
                onScrollToTeam={() => setPanelActiveView('team')}
                onSuggestInitiative={undefined}
              />
            ) : (
              <CouncilDashboard
                onNavigateToBadge={onNavigateToBadge}
                onScrollToTeam={() => setPanelActiveView('team')}
                onSuggestInitiative={openInitiativeModal}
              />
            )}
          </FeatureGate>
        ) : (
          isSpaceshipMode ? (
            <CouncilDashboard
              variant="cabin"
              activeTab={councilActiveTab}
              onTabChange={setCouncilActiveTab}
              onNavigateToBadge={onNavigateToBadge}
              onOpenTeamPanel={() => setPanelActiveView('team')}
              onScrollToTeam={() => setPanelActiveView('team')}
              onSuggestInitiative={undefined}
            />
          ) : (
            <CouncilDashboard
              onNavigateToBadge={onNavigateToBadge}
              onScrollToTeam={() => setPanelActiveView('team')}
              onSuggestInitiative={openInitiativeModal}
            />
          )
        )
      )}
      {panelActiveView === 'bro' && (
        isSpaceshipMode ? (
          <div className="fade-in bro-cabin-content">
            {broActiveTab === 'initiation' ? (
              <div id="bro-section-passport" className="bro-cabin-section">
                {travelerMode ? (
                  <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                    <BroInitiation variant="cabin" />
                  </FeatureGate>
                ) : (
                  <BroInitiation variant="cabin" />
                )}
              </div>
            ) : (
              <div id="bro-section-wing" className="bro-cabin-section">
                {travelerMode ? (
                  <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                    <WingDashboard variant="cabin" onSuggestInitiative={undefined} />
                  </FeatureGate>
                ) : (
                  <FeatureGate
                    allowed={Boolean(userData?.broProgress?.isBro)}
                    reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
                    ctaLabel="К Бропаспорту"
                    onCta={() => setBroActiveTab('initiation')}
                  >
                    <WingDashboard variant="cabin" onSuggestInitiative={undefined} />
                  </FeatureGate>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="profile-view-bro-two-columns">
            <div id="bro-section-passport" className="profile-view-bro-column">
              {travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                  <BroInitiation />
                </FeatureGate>
              ) : (
                <BroInitiation />
              )}
            </div>
            <div id="bro-section-wing" className="profile-view-bro-column">
              {travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                  <WingDashboard onSuggestInitiative={openInitiativeModal} />
                </FeatureGate>
              ) : (
                <FeatureGate
                  allowed={Boolean(userData?.broProgress?.isBro)}
                  reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
                  ctaLabel="К Бропаспорту"
                  onCta={() => document.getElementById('bro-section-passport')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <WingDashboard onSuggestInitiative={openInitiativeModal} />
                </FeatureGate>
              )}
            </div>
          </div>
        )
      )}
      {panelActiveView === 'passport' && (
        <div className="profile-view-passport-column">
          <div id="profile-passport-card" className="profile-view-passport-two-col">
            <div className="profile-view-passport-avatar">
              <div className="avatar-circle">
                {isImageAvatar(showProfileEditor ? avatarInput : profile.avatar) ? <img src={(showProfileEditor ? avatarInput : profile.avatar) as string} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '44px' }}>{(showProfileEditor ? avatarInput : profile.avatar) || '🧑‍🚀'}</span>}
              </div>
              {showProfileEditor && (
                <div className="profile-view-passport-avatar-buttons">
                  <ImageSourceBlock
                    context="passport_avatar"
                    value={typeof avatarInput === 'string' && (avatarInput.startsWith('data:') || avatarInput.startsWith('http')) ? avatarInput : null}
                    onChange={setAvatarInput}
                    aspect="square"
                    hidePreview
                    buttonLayout="column"
                    onGenerate={async (opts) =>
                      requestImageGenerate({ mode: 'generate', context: 'passport', prompt: opts.prompt ?? '' }, accessToken ?? null)
                    }
                    onProcess={async (imageBase64, opts) =>
                      requestImageGenerate({ mode: 'process', context: 'passport', imageBase64, prompt: opts?.prompt ?? '' }, accessToken ?? null)
                    }
                    onUnlockRequest={openUnlockByCode}
                  />
                </div>
              )}
            </div>
            <div className="profile-view-passport-settings">
              <h2 className="profile-view-passport-title">Профиль</h2>
              {showProfileEditor ? (
                <>
                  <div className="profile-view-passport-row">
                    <label className="profile-view-passport-label">
                      Ник
                      <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} placeholder="Никнейм" className="w-input" />
                    </label>
                    <label className="profile-view-passport-label">
                      Направление
                      <input value={statusInput} maxLength={80} onChange={e => setStatusInput(e.target.value)} placeholder="Направление" className="w-input" />
                    </label>
                  </div>
                  <div className="profile-view-passport-divider" />
                  <label className="profile-view-passport-label profile-view-passport-label--full">
                    Сейчас делаю
                    <textarea value={bioInput} maxLength={160} onChange={e => setBioInput(e.target.value)} placeholder="Коротко. Одна мысль." className="w-input" style={{ minHeight: 80, resize: 'vertical' }} />
                  </label>
                  <p className="profile-view-passport-hint">Коротко. Одна мысль. Можно без точки. ({bioInput.length}/160)</p>
                </>
              ) : (
                <>
                  <div className="profile-view-passport-row">
                    <div className="profile-view-passport-label">
                      Ник
                      <div className="profile-view-passport-value">{profile.nickname}</div>
                    </div>
                    <div className="profile-view-passport-label">
                      Направление
                      <div className="profile-view-passport-value">{profile?.status || '—'}</div>
                    </div>
                  </div>
                  <div className="profile-view-passport-divider" />
                  <div className="profile-view-passport-label profile-view-passport-label--full">
                    Сейчас делаю
                    <div className="profile-view-passport-value">{profile?.bio || '—'}</div>
                  </div>
                </>
              )}
              <div className="profile-view-passport-divider" />
              <div className="profile-view-passport-label profile-view-passport-label--full">Ранг</div>
              <div className="profile-view-passport-rank-row">
                <span>Уровень {currentLevels}</span>
                <span>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${xpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #8B00FF, #FFD700)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
              </div>
              <div className="profile-view-passport-divider profile-view-passport-divider--short" />
              <div className="profile-view-passport-actions">
                {showProfileEditor ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setNicknameInput(profile.nickname || '');
                        setAvatarInput(profile.avatar || '🧑‍🚀');
                        setStatusInput(profile?.status || '');
                        setBioInput(profile?.bio || '');
                        setShowProfileEditor(false);
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="btn-primary-gold"
                      onClick={() => {
                        setNickname(nicknameInput);
                        setAvatar(avatarInput);
                        setProfileStatus(statusInput);
                        setProfileBio(bioInput.trim().slice(0, 160));
                        setShowProfileEditor(false);
                      }}
                    >
                      Сохранить
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-primary-gold" onClick={() => setShowProfileEditor(true)}>
                    Редактировать
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {panelActiveView === 'inspector' && (
        <InspectorDashboard
          variant="cabin"
          activeTab={inspectorActiveTab}
          onTabChange={setInspectorActiveTab}
          onOpenDiary={() => openCabinPanel('real-diary', 'left')}
          onNavigateToBadge={onNavigateToBadge}
        />
      )}
      {panelActiveView === 'profile4k' && (
        isSpaceshipMode ? (
          <Profile4KDashboard
            variant="cabin"
            activeTab={profile4kActiveTab}
            onTabChange={setProfile4kActiveTab}
            userData={userData}
            badges={badges}
            badgeTitlesInPath={badgeTitlesInPath}
            favoriteBadgeTitles={favoriteBadgeTitles}
            rank={rank}
            nickname={profile.nickname}
          />
        ) : (
          <Profile4KDashboard
            userData={userData}
            badges={badges}
            badgeTitlesInPath={badgeTitlesInPath}
            favoriteBadgeTitles={favoriteBadgeTitles}
            rank={rank}
            nickname={profile.nickname}
          />
        )
      )}
      {panelActiveView === 'counselor-squad' && (canCreateSquad || (role === 'counselor' || role === 'educator') || myJoinedSquad) && (
        isSpaceshipMode ? (
          <CounselorSquadDashboard
            variant="cabin"
            activeTab={counselorSquadActiveTab}
            onTabChange={setCounselorSquadActiveTab}
            onNavigateToBadge={onNavigateToBadge}
            onShowHint={showHint}
          />
        ) : (
        <div style={{ padding: 16, background: 'rgba(139, 0, 255, 0.06)', borderRadius: 16, border: '1px solid rgba(139, 0, 255, 0.2)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: '0 0 12px' }}>Отряд вожатых</h3>
          {myJoinedSquad && (<div style={{ marginBottom: 14 }}><p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Вы в отряде: <strong>{myJoinedSquad.squadName}</strong></p><button type="button" onClick={() => { leaveSquad(); setCounselorJoinCode(''); setCounselorJoinError(null); }} className="btn-secondary" style={{ marginTop: 8, padding: '6px 12px', fontSize: 12 }}>Выйти из отряда</button></div>)}
          {!myJoinedSquad && ((role === 'counselor' || role === 'educator') || (canCreateSquad && !myCreatedSquad)) && (
            <div style={{ marginBottom: 14 }} className={(role === 'counselor' || role === 'educator') ? 'organizer-empty-state' : ''}>
              {(role === 'counselor' || role === 'educator') && (
                <>
                  <div className="organizer-empty-state__icon" aria-hidden>🔑</div>
                  <p className="organizer-empty-state__title" style={{ margin: '0 0 6px', fontSize: 14 }}>Войти в отряд вожатых</p>
                  <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.85 }}>Старший Вожатый (или Разработчик в песочнице) создаёт отряд и даёт код приглашения. Вставьте код, чтобы присоединиться.</p>
                </>
              )}
              <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Войти по коду</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" value={counselorJoinCode} onChange={(e) => { setCounselorJoinCode(e.target.value); setCounselorJoinError(null); }} placeholder="Код приглашения" style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }} />
                <button type="button" onClick={() => { if (!counselorJoinCode.trim()) { setCounselorJoinError('Введите код'); return; } const ok = joinByCode(counselorJoinCode.trim()); setCounselorJoinError(ok ? null : 'Неверный код'); if (ok) setCounselorJoinCode(''); }} className="btn-primary-gold" style={{ padding: '8px 14px', fontSize: 12 }}>Войти</button>
              </div>
              {counselorJoinError && <span style={{ fontSize: 12, color: '#ff6b6b', display: 'block', marginTop: 4 }}>{counselorJoinError}</span>}
            </div>
          )}
          {canCreateSquad && (!myCreatedSquad ? (
            <div className="organizer-empty-state" style={{ padding: '12px 0' }}>
              <div className="organizer-empty-state__icon" aria-hidden>👥</div>
              <p className="organizer-empty-state__title" style={{ margin: '0 0 8px' }}>Создать отряд вожатых</p>
              <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85 }}>Введите название и создайте отряд, чтобы приглашать вожатых по коду или ссылке.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" value={counselorSquadName} onChange={(e) => setCounselorSquadName(e.target.value)} placeholder="Например: Отряд «Солнышко»" style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }} />
                <button type="button" disabled={!counselorSquadName.trim()} title={!counselorSquadName.trim() ? 'Введите название отряда' : undefined} onClick={() => { if (counselorSquadName.trim()) { createSquad(counselorSquadName.trim()); setCounselorSquadName(''); } else { showHint({ title: 'Введите название', content: 'Укажите название отряда, чтобы создать его.' }); } }} className="btn-primary-gold" style={{ padding: '8px 14px', fontSize: 12 }}>Создать отряд</button>
              </div>
            </div>
          ) : (
            <div><p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.9 }}><strong>{myCreatedSquad.name}</strong></p><p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.8 }}>Код приглашения:</p><p style={{ margin: '0 0 8px', fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all' }}>{getInviteCode()}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => { navigator.clipboard?.writeText(getInviteCode()); showHint({ title: 'Скопировано', content: 'Код скопирован' }); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Копировать код</button><button type="button" onClick={() => { navigator.clipboard?.writeText(getInviteLink()); showHint({ title: 'Скопировано', content: 'Ссылка скопирована' }); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Копировать ссылку</button><button type="button" onClick={() => setDisbandConfirmOpen(true)} style={{ padding: '6px 12px', fontSize: 12, background: 'rgba(255,77,77,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, cursor: 'pointer' }}>Распустить отряд</button></div></div>
          ))}
        </div>
        )
      )}
      {panelActiveView === 'workshop' && (
        <div className="workshop-view fade-in" role="tabpanel" id="workshop-tabpanel" aria-labelledby={`workshop-tab-${workshopActiveTab}`}>
          {workshopActiveTab === 'architect' && (
            <section id="workshop-section-architect" className="workshop-view__section">
              {hasWorkshopAccess ? (
                <SquadArchitect diarySquadName={userData?.diaryProgress?.squad?.name} onComplete={(trad) => showHint({ title: "Успех", content: `Сценарий "${trad.name}" создан! Используй его для посвящения отряда.` })} />
              ) : (
                <div className="workshop-locked workshop-locked--card">
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>Мастерская откроется, когда ты выберешь в путь значок <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.</p>
                  <button type="button" onClick={() => onNavigateToBadge('1.16.1')} className="btn-primary-gold" style={{ padding: '14px 24px' }}>Перейти к значку 1.16.1</button>
                </div>
              )}
            </section>
          )}
          {workshopActiveTab === 'forge' && (
            <section id="workshop-section-forge" className="workshop-view__section">
              {hasWorkshopAccess ? (
                <div className="workshop-form workshop-form--card">
                  <h3 style={{ color: '#FFD700', marginTop: 0 }}>Кузница Смыслов ⚒️</h3>
                  <p style={{ fontSize: 12, opacity: 0.8, marginTop: -4, marginBottom: 12 }}>Значок будет предложен в выбранную категорию (из ссылки или по умолчанию).</p>
                  <label htmlFor="workshop-form-title" className="sr-only">Название значка</label>
                  <input id="workshop-form-title" value={workshopForm.title} onChange={e => setWorkshopForm({...workshopForm, title: e.target.value})} placeholder="Название значка" className="w-input" aria-label="Название значка" />
                  <label htmlFor="workshop-form-description" className="sr-only">Опиши суть</label>
                  <textarea id="workshop-form-description" placeholder="Опиши суть..." className="w-input" style={{ minHeight: 80 }} value={workshopForm.description} onChange={e => setWorkshopForm({...workshopForm, description: e.target.value})} aria-label="Опиши суть" />
                  <div style={{ marginBottom: 12 }}>
                    <ImageSourceBlock
                      context="workshop_badge"
                      value={workshopForm.image}
                      onChange={(url) => setWorkshopForm(prev => ({ ...prev, image: url }))}
                      aspect="free"
                      onGenerate={async (opts) =>
                        requestImageGenerate({ mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' }, accessToken ?? null)
                      }
                      onProcess={async (imageBase64, opts) =>
                        requestImageGenerate({ mode: 'process', context: 'workshop', imageBase64, prompt: opts?.prompt ?? '' }, accessToken ?? null)
                      }
                      onUnlockRequest={openUnlockByCode}
                    />
                    {workshopForm.image && (
                      <button type="button" className="btn-secondary" style={{ marginTop: 8, fontSize: '12px' }} onClick={() => setWorkshopForm(prev => ({ ...prev, image: null }))}>
                        Удалить изображение
                      </button>
                    )}
                  </div>
                  <button onClick={handleWorkshopSubmit} disabled={workshopBusy} className="btn-primary-gold" style={{ width: '100%' }} aria-live="polite" aria-busy={workshopBusy}>{workshopBusy ? 'ГЕНЕРИРУЕМ...' : 'АКТИВИРОВАТЬ В ПУТЕВОДИТЕЛЕ'}</button>
                </div>
              ) : (
                <div className="workshop-locked workshop-locked--card">
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>Мастерская откроется, когда ты выберешь в путь значок <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.</p>
                  <button type="button" onClick={() => onNavigateToBadge('1.16.1')} className="btn-primary-gold" style={{ padding: '14px 24px' }}>Перейти к значку 1.16.1</button>
                </div>
              )}
            </section>
          )}
          {workshopActiveTab === 'ideas' && (
            <section id="workshop-section-community" className="workshop-view__section">
              <div className="workshop-community-feed workshop-community-feed--card">
                <h3 style={{ color: 'rgba(255,255,255,0.95)', marginTop: 0, fontSize: '16px' }}>Идеи отряда</h3>
                {typeof navigator !== 'undefined' && !navigator.onLine && <p style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.8 }}>Оффлайн. Отправки появятся после подключения.</p>}
                {communitySyncing && <p style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.8 }}>Синхронизация…</p>}
                {communityPendingCount > 0 && typeof navigator !== 'undefined' && navigator.onLine && !communitySyncing && <p style={{ margin: '0 0 8px', fontSize: '12px', opacity: 0.8 }}>В очереди: {communityPendingCount}</p>}
                {(communityBadges?.length ?? 0) === 0 && (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', opacity: 0.9 }}>Здесь появятся идеи, предложенные отрядом, когда они будут.</p>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', opacity: 0.7 }}>Предложи первый значок в Кузнице Смыслов.</p>
                  </>
                )}
                <div className="workshop-squad-ideas-carousel">
                  <button type="button" className="workshop-squad-ideas-carousel__btn workshop-squad-ideas-carousel__btn--prev" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const n = communityBadges?.length ?? 0; if (n <= 1) return; setSquadIdeasCarouselSteps((s) => s - 1); }} disabled={(communityBadges?.length ?? 0) <= 1} aria-label="Вращать влево"><Icons.ArrowLeft /></button>
                  <div className="workshop-squad-ideas-carousel__viewport">
                    <div className="workshop-squad-ideas-carousel__track" style={{ ['--squad-ideas-rotation-steps' as string]: squadIdeasCarouselSteps }}>
                      {(communityBadges?.length ?? 0) === 0 ? (
                        [0, 1, 2].map((slotIndex) => (
                          <div key={`squad-placeholder-${slotIndex}`} className="workshop-squad-ideas-carousel__item workshop-squad-ideas-carousel__item--placeholder" style={{ ['--slot-offset' as string]: slotIndex }}>
                            <div className="workshop-squad-ideas-carousel__cell" style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'rgba(255,255,255,0.5)' }}>?</div>
                          </div>
                        ))
                      ) : (
                        Array.from({ length: 21 }, (_, i) => i - 10).map((slotIndex) => {
                          const n = communityBadges!.length;
                          const itemIndex = ((slotIndex % n) + n) % n;
                          const b = communityBadges![itemIndex];
                          const badge = typeof b === 'object' && b && 'id' in b ? b as { id: string; title: string; emoji?: string; category_id?: string } : null;
                          if (!badge) return null;
                          return (
                            <div key={`squad-idea-${slotIndex}-${badge.id}`} className="workshop-squad-ideas-carousel__item" style={{ ['--slot-offset' as string]: slotIndex }}>
                              <div className="workshop-squad-ideas-carousel__cell" style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }} title={badge.title}>{badge.emoji || '✨'}</div>
                              {toggleCommunityLike && (
                                <button type="button" onClick={(ev) => { ev.stopPropagation(); toggleCommunityLike(badge.id); }} className="workshop-squad-ideas-carousel__like" aria-label={communityLikedIds?.has(badge.id) ? 'Убрать лайк' : 'Лайкнуть'} style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}><Icons.Heart filled={communityLikedIds?.has(badge.id)} /></button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button type="button" className="workshop-squad-ideas-carousel__btn workshop-squad-ideas-carousel__btn--next" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const n = communityBadges?.length ?? 0; if (n <= 1) return; setSquadIdeasCarouselSteps((s) => s + 1); }} disabled={(communityBadges?.length ?? 0) <= 1} aria-label="Вращать вправо"><Icons.ArrowRight /></button>
                </div>
              </div>
            </section>
          )}
          {workshopActiveTab === 'my' && (
            <section id="workshop-section-my" className="workshop-view__section">
              {hasWorkshopAccess ? (
                <div className="workshop-my-proposals workshop-my-proposals--card">
                  <h3 style={{ color: 'rgba(255,255,255,0.9)', marginTop: 0, fontSize: '16px' }}>Мои предложения</h3>
                  {(!customBadges || customBadges.length === 0) ? <div className="profile-empty-state"><p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Пока нет предложений. Создай первый выше.</p></div> : <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{customBadges.map((b: { id: string; title: string; emoji?: string; category_id?: string; level?: string }) => (<li key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ flex: 1 }}>{b.emoji || '⚒️'} {b.title}</span><div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{publishBadgeToCommunity && <button type="button" onClick={async () => { if ((communityBadges?.length ?? 0) >= 10) { setPathFavToast({ type: 'squad_limit' }); return; } const res = await publishBadgeToCommunity(b); if (res.ok) { setPathFavToast({ type: 'squad_added', squadSlotsLeft: 10 - (communityBadges?.length ?? 0) - 1 }); showHint({ title: res.queued ? 'Сохранено' : 'Отправлено', content: res.queued ? 'Предложение сохранено. Будет отправлено при появлении сети.' : 'Предложение отправлено в сообщество.' }); } else showHint({ title: 'Ошибка', content: res.error || 'Не удалось отправить. Попробуйте позже.' }); }} className="btn-secondary" style={{ flexShrink: 0 }} aria-label="Отправить в сообщество">Отправить в сообщество</button>}{removeCustomBadge && <button type="button" onClick={() => { removeCustomBadge(b.id); const baseId = b.id.replace(/\.\d+$/, ''); if (setCustomBadgeImage && baseId !== b.id) setCustomBadgeImage(baseId, null); showHint({ title: 'Удалено', content: 'Предложение удалено.' }); }} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} aria-label="Удалить предложение">Удалить</button>}</div></li>))}</ul>}
                </div>
              ) : (
                <div className="workshop-locked workshop-locked--card">
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>Мастерская откроется, когда ты выберешь в путь значок <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.</p>
                  <button type="button" onClick={() => onNavigateToBadge('1.16.1')} className="btn-primary-gold" style={{ padding: '14px 24px' }}>Перейти к значку 1.16.1</button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
      {panelActiveView === 'share' && (
        <div className="profile-view-share-row" role="tabpanel" id="share-tabpanel" aria-labelledby={`share-tab-${shareActiveTab}`} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {shareActiveTab === 'create-card' && (
            <div id="profile-share-center" className="share-center-v2">
              <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
              <h3>Шеринг достижений</h3>
              <label className="share-center-toggle">
                <input type="checkbox" className="share-center-toggle-input" checked={shareHideNickname} onChange={e => setShareHideNickname(e.target.checked)} />
                <span className="share-center-toggle-track" aria-hidden />
                <span>Скрыть ник</span>
              </label>
              <button onClick={async () => { if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl); if (shareWideUrl) URL.revokeObjectURL(shareWideUrl); setShareStoryUrl(null); setShareWideUrl(null); setShareStoryResult(null); setShareWideResult(null); setShareBusy(true); setShareStatus('Генерируем…'); try { const raw = await fetchAiSlogan({ kind: 'progress_summary', nickname: profile.nickname, rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted, badgeTitlesInPath, favoriteBadgeTitles }); const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan; const pedagogy4kLine = await fetchPedagogy4k({ badgeTitlesInPath, favoriteBadgeTitles, rank, nickname: profile.nickname ?? undefined }); const storyMemeRaw = await fetchAiSlogan({ kind: 'stories_reels_meme', nickname: profile.nickname ?? undefined, rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted }); const customStoriesLine = typeof storyMemeRaw === 'string' && storyMemeRaw.trim() ? storyMemeRaw.trim() : undefined; const vibeRaw = await fetchVibeCheck({ variant: 'profile', rank, nickname: profile.nickname ?? undefined, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted, badgeTitlesInPath, favoriteBadgeTitles }); const vibeCheck = vibeRaw ? { memeHeader: vibeRaw.meme_header, memeText: vibeRaw.meme_text, statBuff: vibeRaw.stat_buff } : undefined; const profilePayload = { nickname: profile.nickname ?? undefined, avatar: profile.avatar ?? '', rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted }; const storyRes = await generateSocialCard({ kind: 'progress_summary', profile: profilePayload, format: 'story', hideNickname: shareHideNickname, customCaption: slogan ?? undefined, customCallout: pedagogy4kLine ?? undefined, customStoriesLine, vibeCheck, badgeCarouselItems, createdAt: new Date().toISOString() }); const wideRes = await generateSocialCard({ kind: 'progress_summary', profile: profilePayload, format: 'wide', hideNickname: shareHideNickname, customCaption: slogan ?? undefined, customCallout: pedagogy4kLine ?? undefined, customStoriesLine, vibeCheck, badgeCarouselItems, createdAt: new Date().toISOString() }); setShareStoryResult(storyRes); setShareWideResult(wideRes); setShareStoryUrl(URL.createObjectURL(storyRes.blob)); setShareWideUrl(URL.createObjectURL(wideRes.blob)); setShareStatus('Готово'); } catch (e) { setShareStatus('Ошибка'); } finally { setShareBusy(false); } }} disabled={shareBusy} className="btn-generate">{shareBusy ? 'Генерируем…' : 'Создать карточку'}</button>
              {(shareStoryUrl || shareWideUrl) && shareStoryResult && shareWideResult && (
                <div className="share-center-results">
                  {shareStatus && <div style={{ fontSize: 13, opacity: 0.9 }}>{shareStatus}</div>}
                  {shareStoryUrl && <div><button type="button" onClick={() => shareOrDownloadSocialCard(shareStoryResult)} className="btn-secondary" style={{ marginTop: 8 }}>Сторис: поделиться / скачать</button></div>}
                  {shareWideUrl && <div><button type="button" onClick={() => shareOrDownloadSocialCard(shareWideResult)} className="btn-secondary" style={{ marginTop: 8 }}>Пост 16:9: поделиться / скачать</button></div>}
                </div>
              )}
            </div>
          )}
          {shareActiveTab === 'invite' && (
            <div id="share-section-invite" style={{ padding: 20, background: 'rgba(77, 172, 255, 0.08)', borderRadius: 24, border: '1px solid rgba(77, 172, 255, 0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Пригласить друзей</h3>
              <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>{myTeam ? 'Скопируй ссылку и отправь участникам Движка.' : 'Создай Движок и приглашай друзей по ссылке.'}</p>
              <button type="button" onClick={() => { const url = generateInviteUrl(); navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!')); }} style={{ padding: 12, background: 'linear-gradient(90deg, #4dacff, #8b00ff)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Пригласить друзей</button>
            </div>
          )}
        </div>
      )}
      {panelActiveView === 'vozhatifikator' && (
        isSpaceshipMode ? (
          <div className="fade-in vozhatifikator-cabin-content">
            {vozhatifikatorSubView === 'book' ? (
              <section id="vozhatifikator-section-book" className="vozhatifikator-cabin-section">
                <div className="vozhatifikator-panel">
                  <aside className="vozhatifikator-toc" aria-label="Оглавление">
                    <div className="vozhatifikator-badge-block">
                      {getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined) && (
                        <img src={getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined)!} alt="" className="vozhatifikator-badge-block__img" />
                      )}
                      <a href="#" className="vozhatifikator-badge-block__link" onClick={(e) => { e.preventDefault(); onNavigateToBadge('9.10'); }}>Значок «Вожатификатор» в каталоге</a>
                    </div>
                    <div className="vozhatifikator-downloads">
                      <a href={VOZHATIFIKATOR_DOCX_URL} download={VOZHATIFIKATOR_DOCX_FILE} className="vozhatifikator-download vozhatifikator-download--docx" title="Редактируемая версия (Word)">
                        Скачать
                      </a>
                    </div>
                    <nav className="vozhatifikator-toc-nav" aria-label="Оглавление книги">
                      {vozhatifikatorToc.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="vozhatifikator-toc-item"
                          onClick={(e) => {
                            e.preventDefault();
                            vozhatifikatorBookRef.current?.querySelector(`#${CSS.escape(item.id)}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <span className="vozhatifikator-toc-item-title">{item.title}</span>
                        </a>
                      ))}
                    </nav>
                  </aside>
                  <div className="vozhatifikator-viewer">
                    <div ref={vozhatifikatorBookRef} className="vozhatifikator-book">
                      {vozhatifikatorLoading && <p className="vozhatifikator-book__loading">Загрузка книги…</p>}
                      {vozhatifikatorError && <p className="vozhatifikator-book__error">{vozhatifikatorError}</p>}
                      {!vozhatifikatorLoading && !vozhatifikatorError && vozhatifikatorHtml && (
                        <div className="vozhatifikator-book__content" dangerouslySetInnerHTML={{ __html: vozhatifikatorHtml }} />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section id="vozhatifikator-section-lights" className="vozhatifikator-cabin-section">
                <div className="vozhatifikator-panel vozhatifikator-panel--cabin-lights">
                  <aside className="vozhatifikator-toc" aria-label="Информация о значке">
                    <div className="vozhatifikator-badge-block">
                      {getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined) && (
                        <img src={getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined)!} alt="" className="vozhatifikator-badge-block__img" />
                      )}
                      <a href="#" className="vozhatifikator-badge-block__link" onClick={(e) => { e.preventDefault(); onNavigateToBadge('9.10'); }}>Значок «Вожатификатор» в каталоге</a>
                    </div>
                  </aside>
                  <div className="vozhatifikator-viewer">
                    <VozhatifikatorChecklist
                      completedIds={userData.vozhatifikatorChecklist?.completedIds ?? []}
                      onToggle={updateVozhatifikatorChecklist}
                    />
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="vozhatifikator-panel">
            <aside className="vozhatifikator-toc" aria-label="Оглавление">
              <div className="vozhatifikator-badge-block">
                {getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined) && (
                  <img src={getBadgeImagePath('9.10', 'Вожатификатор', '9', undefined, undefined)!} alt="" className="vozhatifikator-badge-block__img" />
                )}
                <a href="#" className="vozhatifikator-badge-block__link" onClick={(e) => { e.preventDefault(); onNavigateToBadge('9.10'); }}>Значок «Вожатификатор» в каталоге</a>
                <button type="button" className="vozhatifikator-badge-block__btn" onClick={() => setVozhatifikatorSubView('lights')}>Путеводные огни — анкета</button>
              </div>
              <div className="vozhatifikator-tabs">
                <button
                  type="button"
                  className={`vozhatifikator-tab ${vozhatifikatorSubView === 'book' ? 'vozhatifikator-tab--active' : ''}`}
                  onClick={() => setVozhatifikatorSubView('book')}
                >
                  Книга
                </button>
                <button
                  type="button"
                  className={`vozhatifikator-tab ${vozhatifikatorSubView === 'lights' ? 'vozhatifikator-tab--active' : ''}`}
                  onClick={() => setVozhatifikatorSubView('lights')}
                >
                  Путеводные огни
                </button>
              </div>
              <div className="vozhatifikator-downloads">
                <a href={VOZHATIFIKATOR_DOCX_URL} download={VOZHATIFIKATOR_DOCX_FILE} className="vozhatifikator-download vozhatifikator-download--docx" title="Редактируемая версия (Word)">
                  DOCX
                </a>
              </div>
              {vozhatifikatorSubView === 'book' && (
                <nav className="vozhatifikator-toc-nav" aria-label="Оглавление книги">
                  {vozhatifikatorToc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="vozhatifikator-toc-item"
                      onClick={(e) => {
                        e.preventDefault();
                        vozhatifikatorBookRef.current?.querySelector(`#${CSS.escape(item.id)}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <span className="vozhatifikator-toc-item-title">{item.title}</span>
                    </a>
                  ))}
                </nav>
              )}
            </aside>
            <div className="vozhatifikator-viewer">
              {vozhatifikatorSubView === 'book' ? (
                <div ref={vozhatifikatorBookRef} className="vozhatifikator-book">
                  {vozhatifikatorLoading && <p className="vozhatifikator-book__loading">Загрузка книги…</p>}
                  {vozhatifikatorError && <p className="vozhatifikator-book__error">{vozhatifikatorError}</p>}
                  {!vozhatifikatorLoading && !vozhatifikatorError && vozhatifikatorHtml && (
                    <div className="vozhatifikator-book__content" dangerouslySetInnerHTML={{ __html: vozhatifikatorHtml }} />
                  )}
                </div>
              ) : (
                <VozhatifikatorChecklist
                  completedIds={userData.vozhatifikatorChecklist?.completedIds ?? []}
                  onToggle={updateVozhatifikatorChecklist}
                />
              )}
            </div>
          </div>
        )
      )}
      {panelActiveView === 'parents' && role === 'parent' && (
        <div id="parents-section" className="profile-view-parents-section">
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Для родителей</h2>
          {campFactsLoading && <p className="parents-section-block__text" style={{ margin: 0 }}>Данные загружаются…</p>}
          {campFactsError && <p style={{ fontSize: 13, margin: 0, color: '#f59e0b' }}>{campFactsError}</p>}
          {!campFactsLoading && !campFactsError && campFacts && (
            <div className="parents-section-block">
              <h3 className="parents-section-block__heading">Смена</h3>
              {campFacts.currentSeason?.name && <p className="parents-section-block__text">{campFacts.currentSeason.name}</p>}
              {campFacts.currentSeason?.dates && <p className="parents-section-block__text">Даты: {campFacts.currentSeason.dates}</p>}
            </div>
          )}
          <CampProgramByDays />
        </div>
      )}
    </>
  );

  const tabsNavItems = [
    { id: 'active' as const, label: 'В пути', icon: '🧭' },
    { id: 'favorites' as const, label: 'Избранное', icon: '⭐' },
    { id: 'collection' as const, label: 'Коллекция', icon: '🗂️' },
    { id: 'journal' as const, label: 'Журнал', icon: '📓' },
  ] satisfies Array<{ id: Tab; label: string; icon: string }>;

  const squadCornerTabItems = [
    { id: 'squad' as const, label: 'Отряд', icon: '🏕️' },
    { id: 'photos' as const, label: 'Фото', icon: '📷' },
    { id: 'planner' as const, label: 'Планёрка', icon: '📋' },
    { id: 'flag-badges' as const, label: 'Значки на флаг', icon: '🚩' },
  ] satisfies Array<{ id: SquadCornerTabId; label: string; icon: string }>;

  const shareTabItems = [
    { id: 'create-card' as const, label: 'Создать карточку', icon: '📤' },
    { id: 'invite' as const, label: 'Пригласить друзей', icon: '🤝' },
  ] satisfies Array<{ id: ShareTabId; label: string; icon: string }>;

  const workshopTabItems = [
    { id: 'architect' as const, label: 'Архитектор отряда', icon: '🏛️' },
    { id: 'forge' as const, label: 'Кузница смыслов', icon: '⚒️' },
    { id: 'ideas' as const, label: 'Идеи отряда', icon: '💡' },
    { id: 'my' as const, label: 'Мои предложения', icon: '📋' },
  ] satisfies Array<{ id: WorkshopTabId; label: string; icon: string }>;

  const inspectorTabItems = [
    { id: 'friendship' as const, label: 'Инспектор Дружбы', icon: '🤝' },
    { id: 'politeness' as const, label: 'Инспектор Вежливости', icon: '🎩' },
    { id: 'comfort' as const, label: 'Инспектор Уюта', icon: '🏠' },
    { id: 'help' as const, label: 'Инспектор Помощи', icon: '🚀' },
    { id: 'involvement' as const, label: 'Инспектор Вовлечённости', icon: '🎲' },
    { id: 'peacemaker' as const, label: 'Инспектор Спокойствия', icon: '🕊' },
    { id: 'mood' as const, label: 'Инспектор Настроения', icon: '😊' },
    { id: 'chief' as const, label: 'Главный Инспектор', icon: '👑' },
  ] satisfies Array<{ id: InspectorTabId; label: string; icon: string }>;

  const counselorSquadTabItems = [
    { id: 'squad' as const, label: 'Отряд', icon: '🏕️' },
    { id: 'photos' as const, label: 'Фото', icon: '📷' },
    { id: 'planner' as const, label: 'Планёрка', icon: '📋' },
    { id: 'schedule' as const, label: 'Беспорядок дня', icon: '🕒' },
    { id: 'flag-badges' as const, label: 'Значки на флаг', icon: '🚩' },
  ] satisfies Array<{ id: CounselorSquadTabId; label: string; icon: string }>;

  const realDiaryTabItems = [
    { id: 'diary' as const, label: 'Дневник', icon: '📖' },
    { id: 'reflection' as const, label: 'Рефлексия', icon: '🪞' },
    { id: 'schedule' as const, label: 'Беспорядок дня', icon: '🕒' },
    { id: 'diary-card' as const, label: 'Карточка дневника', icon: '🪪' },
  ] satisfies Array<{ id: RealDiaryTabId; label: string; icon: string }>;

  const profile4kTabItems = [
    { id: 'skills' as const, label: 'Твои 4К навыки', icon: '🧩' },
    { id: 'camp-progress' as const, label: 'Реальный Лагерь прогресс', icon: '📊' },
  ] satisfies Array<{ id: Profile4KTabId; label: string; icon: string }>;

  const broTabItems = [
    { id: 'initiation' as const, label: 'БРОСВЯЩЕНИЕ', icon: '📘' },
    { id: 'wing' as const, label: 'Крыло', icon: '🦅' },
  ] satisfies Array<{ id: BroTabId; label: string; icon: string }>;

  const teamTabItems = [
    { id: 'engine' as const, label: 'Мой Движок', icon: '🚀' },
    { id: 'engine-plan' as const, label: 'План Движка', icon: '🗓️' },
    { id: 'engine-path' as const, label: 'Путь Движка', icon: '🧩' },
    { id: 'camp-control' as const, label: 'Управление Лагерем', icon: '🏕️' },
  ] satisfies Array<{ id: TeamTabId; label: string; icon: string }>;

  const councilTabItems = [
    { id: 'council' as const, label: 'Совет', icon: '👑' },
    { id: 'engines' as const, label: 'Движки', icon: '🚀' },
    { id: 'camp-management' as const, label: 'Управление Лагерем', icon: '🏕️' },
    { id: 'badge' as const, label: 'Значок', icon: '🎖️' },
  ] satisfies Array<{ id: CouncilTabId; label: string; icon: string }>;

  const vozhatifikatorTabItems = [
    { id: 'book' as const, label: 'Вожатификатор', icon: '📘' },
    { id: 'lights' as const, label: 'Путеводные огни', icon: '🕯️' },
  ] satisfies Array<{ id: 'book' | 'lights'; label: string; icon: string }>;

  const renderTabsNav = (className = 'profile-tabs-nav') => (
    <div className={className} role="tablist" aria-label="Разделы личного кабинета">
      {tabsNavItems.map((t) => (
        <button
          key={t.id}
          id={`profile-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === t.id}
          aria-controls="profile-tabpanel"
          data-label={t.label}
          className={activeTab === t.id ? 'active' : ''}
          onClick={() => setActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderSquadCornerTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--squad-corner') => (
    <div className={className} role="tablist" aria-label="Разделы отрядного уголка">
      {squadCornerTabItems.map((t) => (
        <button
          key={t.id}
          id={`squad-corner-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={squadCornerActiveTab === t.id}
          aria-controls="squad-corner-tabpanel"
          data-label={t.label}
          className={squadCornerActiveTab === t.id ? 'active' : ''}
          onClick={() => setSquadCornerActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderRealDiaryTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--real-diary') => (
    <div className={className} role="tablist" aria-label="Разделы реального дневника">
      {realDiaryTabItems.map((t) => (
        <button
          key={t.id}
          id={`real-diary-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={realDiaryActiveTab === t.id}
          aria-controls="real-diary-tabpanel"
          data-label={t.label}
          className={realDiaryActiveTab === t.id ? 'active' : ''}
          onClick={() => setRealDiaryActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderProfile4kTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--profile4k') => (
    <div className={className} role="tablist" aria-label="Разделы 4К навыков">
      {profile4kTabItems.map((t) => (
        <button
          key={t.id}
          id={`profile4k-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={profile4kActiveTab === t.id}
          aria-controls="profile4k-tabpanel"
          data-label={t.label}
          className={profile4kActiveTab === t.id ? 'active' : ''}
          onClick={() => setProfile4kActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderBroTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--bro') => (
    <div className={className} role="tablist" aria-label="Разделы БРО">
      {broTabItems.map((t) => (
        <button
          key={t.id}
          id={`bro-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={broActiveTab === t.id}
          aria-controls="bro-tabpanel"
          data-label={t.label}
          className={broActiveTab === t.id ? 'active' : ''}
          onClick={() => setBroActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderTeamTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--team') => (
    <div className={className} role="tablist" aria-label="Разделы движка">
      {teamTabItems.map((t) => (
        <button
          key={t.id}
          id={`team-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={teamActiveTab === t.id}
          aria-controls="team-tabpanel"
          data-label={t.label}
          className={teamActiveTab === t.id ? 'active' : ''}
          onClick={() => setTeamActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderCouncilTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--council') => (
    <div className={className} role="tablist" aria-label="Разделы совета лагеря">
      {councilTabItems.map((t) => (
        <button
          key={t.id}
          id={`council-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={councilActiveTab === t.id}
          aria-controls="council-tabpanel"
          data-label={t.label}
          className={councilActiveTab === t.id ? 'active' : ''}
          onClick={() => setCouncilActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderVozhatifikatorTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--vozhatifikator') => (
    <div className={className} role="tablist" aria-label="Разделы Вожатификатора">
      {vozhatifikatorTabItems.map((t) => (
        <button
          key={t.id}
          id={`vozhatifikator-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={vozhatifikatorSubView === t.id}
          aria-controls={t.id === 'book' ? 'vozhatifikator-section-book' : 'vozhatifikator-section-lights'}
          data-label={t.label}
          className={vozhatifikatorSubView === t.id ? 'active' : ''}
          onClick={() => setVozhatifikatorSubView(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderCounselorSquadTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--counselor-squad') => (
    <div className={className} role="tablist" aria-label="Разделы отряда вожатых">
      {counselorSquadTabItems.map((t) => (
        <button
          key={t.id}
          id={`counselor-squad-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={counselorSquadActiveTab === t.id}
          aria-controls="counselor-squad-tabpanel"
          data-label={t.label}
          className={counselorSquadActiveTab === t.id ? 'active' : ''}
          onClick={() => setCounselorSquadActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderShareTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--share') => (
    <div className={className} role="tablist" aria-label="Разделы карточек прогресса">
      {shareTabItems.map((t) => (
        <button
          key={t.id}
          id={`share-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={shareActiveTab === t.id}
          aria-controls="share-tabpanel"
          data-label={t.label}
          className={shareActiveTab === t.id ? 'active' : ''}
          onClick={() => setShareActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderWorkshopTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--workshop') => (
    <div className={className} role="tablist" aria-label="Разделы Мастерской">
      {workshopTabItems.map((t) => (
        <button
          key={t.id}
          id={`workshop-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={workshopActiveTab === t.id}
          aria-controls="workshop-tabpanel"
          data-label={t.label}
          className={workshopActiveTab === t.id ? 'active' : ''}
          onClick={() => setWorkshopActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const isInspectorTabUnlocked = (tabId: InspectorTabId): boolean => {
    const idx = INSPECTOR_TAB_IDS.indexOf(tabId);
    if (idx <= 0) return true;
    const userProgress = userData?.progress || {};
    if (tabId === 'chief') {
      return [14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8].every(
        (base) => userProgress[`${base}.1`]?.status === 'achieved'
      );
    }
    const prevTab = INSPECTOR_TAB_IDS[idx - 1];
    const prevBadgeId = INSPECTOR_TAB_BADGE_IDS[prevTab];
    return userProgress[prevBadgeId]?.status === 'achieved';
  };

  const renderInspectorTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--inspector') => (
    <div className={className} role="tablist" aria-label="Разделы Инспектора Пользы">
      {inspectorTabItems.map((t) => {
        const unlocked = isInspectorTabUnlocked(t.id);
        const isActive = inspectorActiveTab === t.id;
        return (
          <button
            key={t.id}
            id={`inspector-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="inspector-tabpanel"
            aria-disabled={!unlocked}
            data-label={t.label}
            title={!unlocked ? 'Сначала заверши предыдущую миссию' : undefined}
            className={isActive ? 'active' : ''}
            disabled={!unlocked}
            onClick={() => unlocked && setInspectorActiveTab(t.id)}
            style={!unlocked ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
            <span className="profile-tabs-nav__label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderFavoritesShelf = () => (
    <div className="active-tab-content__favorites-wrap">
      <div className="favorites-shelf-container">
        <div className="shelf-header">Избранное ⭐</div>
        {favorites.length > 0 ? (
          favorites.length <= CAROUSEL_STATIC_MAX ? (
            <div className="shelf-carousel shelf-carousel--static" aria-label="Избранные значки">
              <div className="shelf-carousel__static-track">
                {favorites.map((id, slotIndex) => {
                  const baseId = getBaseId(id);
                  return (
                    <div key={`shelf-${slotIndex}-${baseId}`} className="shelf-item shelf-item--static">
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onNavigateToBadge(baseId); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToBadge(baseId); } }}><BadgeIcon badgeId={baseId} badgeTitle="" categoryId={(badgeLookupMap.get(baseId)?.category_id || baseId.split('.')[0] || '1')} emoji={badgeLookupMap.get(baseId)?.emoji || '🏆'} size="small" /></div>
                      <button className="btn-shelf-remove" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }}><Icons.XCircle /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <div className="shelf-carousel shelf-carousel--cylinder">
            <button type="button" className="shelf-carousel__btn shelf-carousel__btn--prev" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCarouselRotationSteps((s) => s - 1); }} aria-label="Вращать влево"><Icons.ArrowLeft /></button>
            <div className="shelf-viewport shelf-viewport--cylinder">
              <div className="shelf-track shelf-track--cylinder" style={{ ['--carousel-rotation-steps' as string]: carouselRotationSteps, ['--step-deg' as string]: `${360 / Math.max(1, favorites.length)}deg`, ['--radius' as string]: `${(128 + 16) / (2 * Math.sin(Math.PI / Math.max(1, favorites.length)))}px` }}>
                {favorites.map((id, slotIndex) => {
                  const baseId = getBaseId(id);
                  return (
                    <div key={`shelf-${slotIndex}-${baseId}`} className="shelf-item shelf-item--cylinder" style={{ ['--slot-offset' as string]: slotIndex }}>
                      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onNavigateToBadge(baseId); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToBadge(baseId); } }}><BadgeIcon badgeId={baseId} badgeTitle="" categoryId={(badgeLookupMap.get(baseId)?.category_id || baseId.split('.')[0] || '1')} emoji={badgeLookupMap.get(baseId)?.emoji || '🏆'} size="small" /></div>
                      <button className="btn-shelf-remove" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }}><Icons.XCircle /></button>
                    </div>
                  );
                })}
              </div>
            </div>
            <button type="button" className="shelf-carousel__btn shelf-carousel__btn--next" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCarouselRotationSteps((s) => s + 1); }} aria-label="Вращать вправо"><Icons.ArrowRight /></button>
          </div>
          )
        ) : (
          <p className="favorites-shelf-container__empty">Пока пусто</p>
        )}
      </div>
    </div>
  );

  const renderTabsPanel = (options?: { hideNav?: boolean }) => (
    <div id="profile-tabs-section" className="profile-view-tabs-section">
      <div className={`profile-view-tabs-shell${options?.hideNav ? ' profile-view-tabs-shell--no-nav' : ''}`}>
        {!options?.hideNav && renderTabsNav()}
        <div className="tab-pane" role="tabpanel" id="profile-tabpanel" aria-labelledby={`profile-tab-${activeTab}`}>
        {activeTab === 'active' && (
          <div className="active-tab-content fade-in">
            <div className="active-tab-content__badges-list">
              {pathItems.length > 0 ? (
                pathItems.length <= CAROUSEL_STATIC_MAX ? (
                  <div className="path-carousel path-carousel--static" aria-label="Значки в пути">
                    <div className="path-carousel__static-track">
                      {pathItems.map(({ baseId, levelId: id }, slotIndex) => {
                        const levelBadge = badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
                        const titleFromFind = badges?.find((b: Badge) => String(b.id) === id || String(b.id) === baseId || String(b.id).startsWith(baseId + '.'))?.title;
                        const displayTitle = levelBadge?.title || titleFromFind || (id && id.includes('.') ? `Значок ${baseId}` : id);
                        const badgeTitleForImage = levelBadge?.title || titleFromFind || '';
                        const isFav = isFavorite(baseId);
                        const hubAnchorId = slotIndex === 0 ? `hub-badge-${id.replace(/\./g, '-')}` : undefined;
                        return (
                          <div key={`path-slot-${slotIndex}-${baseId}`} id={hubAnchorId} className="path-carousel__item path-carousel__item--static">
                            <div className="path-card path-card--vertical">
                              <div className="path-card__avatar-wrap">
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }} className={`path-card__star ${isFav ? 'fav' : ''}`} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}><Icons.Star filled={isFav} /></button>
                                <div className="path-card__avatar" onClick={() => onNavigateToBadge(baseId)}>
                                  <BadgeIcon badgeId={baseId} badgeTitle={badgeTitleForImage} categoryId={levelBadge?.category_id || baseId.split('.')[0] || '1'} emoji={levelBadge?.emoji || '🏆'} size="responsive" levelId={id !== baseId ? id : undefined} levelTitle={id !== baseId ? (levelBadge?.level || undefined) : undefined} />
                                </div>
                              </div>
                              <div className="path-card__actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setPlanFormBadge({ id, title: displayTitle, level: levelBadge?.level, criteria: levelBadge?.criteria || levelBadge?.howToBecome, nameExplanation: levelBadge?.nameExplanation, skillTips: levelBadge?.skillTips, confirmation: levelBadge?.confirmation }); setPlanForm({ currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)), shiftLength: 21, squadProgramGrid: '', squadPlan3d: '', campProgram3d: '', priority: 'both', myPlanDraft: '' }); setPlanResult(null); setPlanError(null); setPlanStep('context'); setPlanChecklistItems([]); }} className="btn-pill btn-pill--secondary">Составить план</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setProofForm({ learned: '', impact: '', link: '' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = ''); setProofBadge({ id, title: displayTitle }); }} className="btn-pill btn-pill--primary">Подтвердить <Icons.Send /></button>
                              </div>
                              <div className="path-card__footer">
                                <button type="button" onClick={(e) => { e.stopPropagation(); if(confirm("Удалить?")) removeRoute(baseId); }} className="btn-action-round trash" aria-label="Удалить из пути"><Icons.Trash /></button>
                                <button type="button" className="btn-action-round btn-go-badge" onClick={(e) => { e.stopPropagation(); onNavigateToBadge(baseId); }} title="Перейти к значку" aria-label="Перейти к значку"><Icons.ArrowRight /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                <div className="path-carousel path-carousel--cylinder">
                  <button type="button" className="path-carousel__btn path-carousel__btn--prev" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPathCarouselRotationSteps((s) => s - 1); }} aria-label="Вращать влево"><Icons.ArrowLeft /></button>
                  <div className="path-carousel__viewport path-carousel__viewport--cylinder">
                    <div className="path-carousel__track path-carousel__track--cylinder" style={{ ['--path-rotation-steps' as string]: pathCarouselRotationSteps, ['--step-deg' as string]: `${360 / Math.max(1, pathItems.length)}deg`, ['--radius' as string]: `${(144 + 20) / (2 * Math.sin(Math.PI / Math.max(1, pathItems.length)))}px` }}>
                      {pathItems.map(({ baseId, levelId: id }, slotIndex) => {
                        const levelBadge = badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
                        const titleFromFind = badges?.find((b: Badge) => String(b.id) === id || String(b.id) === baseId || String(b.id).startsWith(baseId + '.'))?.title;
                        const displayTitle = levelBadge?.title || titleFromFind || (id && id.includes('.') ? `Значок ${baseId}` : id);
                        const badgeTitleForImage = levelBadge?.title || titleFromFind || '';
                        const isFav = isFavorite(baseId);
                        const hubAnchorId = slotIndex === 0 ? `hub-badge-${id.replace(/\./g, '-')}` : undefined;
                        return (
                          <div key={`path-slot-${slotIndex}-${baseId}`} id={hubAnchorId} className="path-carousel__item path-carousel__item--cylinder" style={{ ['--slot-offset' as string]: slotIndex }}>
                            <div className="path-card path-card--vertical">
                              <div className="path-card__avatar-wrap">
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(baseId); }} className={`path-card__star ${isFav ? 'fav' : ''}`} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}><Icons.Star filled={isFav} /></button>
                                <div className="path-card__avatar" onClick={() => onNavigateToBadge(baseId)}>
                                  <BadgeIcon badgeId={baseId} badgeTitle={badgeTitleForImage} categoryId={levelBadge?.category_id || baseId.split('.')[0] || '1'} emoji={levelBadge?.emoji || '🏆'} size="responsive" levelId={id !== baseId ? id : undefined} levelTitle={id !== baseId ? (levelBadge?.level || undefined) : undefined} />
                                </div>
                              </div>
                              <div className="path-card__actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setPlanFormBadge({ id, title: displayTitle, level: levelBadge?.level, criteria: levelBadge?.criteria || levelBadge?.howToBecome, nameExplanation: levelBadge?.nameExplanation, skillTips: levelBadge?.skillTips, confirmation: levelBadge?.confirmation }); setPlanForm({ currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)), shiftLength: 21, squadProgramGrid: '', squadPlan3d: '', campProgram3d: '', priority: 'both', myPlanDraft: '' }); setPlanResult(null); setPlanError(null); setPlanStep('context'); setPlanChecklistItems([]); }} className="btn-pill btn-pill--secondary">Составить план</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setProofForm({ learned: '', impact: '', link: '' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = ''); setProofBadge({ id, title: displayTitle }); }} className="btn-pill btn-pill--primary">Подтвердить <Icons.Send /></button>
                              </div>
                              <div className="path-card__footer">
                                <button type="button" onClick={(e) => { e.stopPropagation(); if(confirm("Удалить?")) removeRoute(baseId); }} className="btn-action-round trash" aria-label="Удалить из пути"><Icons.Trash /></button>
                                <button type="button" className="btn-action-round btn-go-badge" onClick={(e) => { e.stopPropagation(); onNavigateToBadge(baseId); }} title="Перейти к значку" aria-label="Перейти к значку"><Icons.ArrowRight /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button type="button" className="path-carousel__btn path-carousel__btn--next" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPathCarouselRotationSteps((s) => s + 1); }} aria-label="Вращать вправо"><Icons.ArrowRight /></button>
                </div>
                )
              ) : (
                <p className="profile-route-details__empty">Нет значков в пути. Добавь значок в путь или в избранное.</p>
              )}
            </div>
          </div>
        )}
        {activeTab === 'favorites' && (
          <div className="favorites-view fade-in">
            {renderFavoritesShelf()}
          </div>
        )}
        {activeTab === 'journal' && (
          <div className="journal-view fade-in">
            {achievedSorted.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>История пуста</p> : achievedSorted.map(([id, p]) => (
              <div key={id} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '20px', paddingBottom: '24px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-7px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#8B00FF' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(p.achievedAt || '').toLocaleDateString()}</div><div style={{ fontWeight: 700 }}>{badgeLookupMap.get(getBaseId(id))?.title || id}</div>{p.reflection && <div style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.8 }}>"{p.reflection}"</div>}</div>
                <button type="button" onClick={() => { setProofForm({ learned: p.reflection || p.evidence?.find((e: { type: string }) => e.type === 'text')?.value || '', impact: '', link: p.evidence?.find((e: { type: string }) => e.type === 'link')?.value || '' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = ''); setProofBadge({ id, title: badgeLookupMap.get(getBaseId(id))?.title || id }); }} className="btn-confirm-main" style={{ flexShrink: 0, fontSize: 12 }}>Отправить в Telegram <Icons.Send /></button>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'collection' && (
          <div className="collection-view fade-in">
            {achievedSorted.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>Коллекция пуста</p> : achievedSorted.map(([id, p]) => (
              <div
                key={id}
                role="button"
                tabIndex={0}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                onClick={() => onNavigateToBadge(getBaseId(id))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToBadge(getBaseId(id)); } }}
                aria-label={`Перейти к значку ${badgeLookupMap.get(getBaseId(id))?.title || id}`}
              >
                <BadgeIcon badgeId={getBaseId(id)} badgeTitle={badgeLookupMap.get(getBaseId(id))?.title || id} categoryId={badgeLookupMap.get(getBaseId(id))?.category_id || getBaseId(id).split('.')[0] || '1'} emoji={badgeLookupMap.get(getBaseId(id))?.emoji || '🏆'} size="small" />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{badgeLookupMap.get(getBaseId(id))?.title || id}</div><div style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(p.achievedAt || '').toLocaleDateString()}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );

  const profileOuterContent = isSpaceshipMode ? (
          <>
          {panelActiveView === null && seeOtradBlocksInView && (
            <div className="profile-view-cabin-top-inspector-page profile-view-cabin-top-inspector-page--desktop-only">
              <button
                type="button"
                className={`profile-view-cabin-top-inspector ${panelActiveView === 'inspector' ? 'profile-view-cabin-top-inspector--active' : ''}`}
                onClick={() => openCabinPanel('inspector', 'top')}
                aria-label="Инспектор Пользы"
                aria-pressed={panelActiveView === 'inspector'}
              >
                <span className="profile-view-cabin-top-inspector__title">Инспектор Пользы</span>
                <span className="profile-view-cabin-top-inspector__subtitle">Игровая система полезных дел. Прокачивает 4К и культуру заботы.</span>
                <div className="profile-view-cabin-top-inspector__progress" aria-hidden="true">
                  <div
                    className="profile-view-cabin-top-inspector__progress-bar"
                    style={{ width: `${inspectorProgressPercent}%` }}
                  />
                </div>
              </button>
            </div>
          )}
          <div className="profile-view-cabin-layout">
            {cabinNavExpanded && (
              <div className="profile-view-cabin-nav-overlay" aria-hidden="true">
                <div
                  className="profile-view-cabin-nav-overlay__backdrop"
                  onClick={() => setCabinNavExpanded(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setCabinNavExpanded(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="Свернуть навигацию"
                />
              </div>
            )}
            <div className={`profile-view-cabin-left ${isCabinProfileExpanded ? 'profile-view-cabin-left--profile-expanded' : 'profile-view-cabin-left--profile-collapsed'}`}>
                <div className="profile-view-cabin-header-content">
                <div className="profile-view-cabin-avatar-col" style={{ position: 'relative' }}>
                  <div className="profile-view-cabin-avatar-shell" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      ref={avatarWrapRef}
                      className={`profile-view-cabin-avatar-wrap profile-view-cabin-avatar-wrap--hero ${panelActiveView === 'passport' ? 'profile-view-cabin-nav-btn--active' : ''}`}
                      onClick={() => openCabinPanel('passport', 'left')}
                      aria-label="Паспорт"
                    >
                      {isImageAvatar(profile.avatar)
                        ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                        : <span className="profile-view-cabin-avatar-emoji" style={{ fontSize: 44 }}>{profile.avatar || '🧑‍🚀'}</span>}
                    </button>
                    <button
                      type="button"
                      className="profile-view-cabin-avatar-upload profile-view-cabin-avatar-upload--desktop"
                      aria-label="Загрузить аватар"
                      title="Загрузить аватар"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAvatarUploadConfirm(true);
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="profile-view-cabin-avatar-gear profile-view-cabin-avatar-gear--desktop"
                      aria-label="Открыть настройки профиля"
                      title="Настройки профиля"
                      style={{
                        position: 'absolute',
                        right: -26,
                        bottom: 10,
                        width: 30,
                        height: 30,
                        borderRadius: 9999,
                        border: '1px solid rgba(112, 195, 235, 0.55)',
                        background: 'linear-gradient(145deg, rgba(10, 28, 48, 0.92), rgba(4, 12, 26, 0.92))',
                        boxShadow: '0 10px 20px rgba(1, 6, 14, 0.48), 0 0 16px rgba(112, 195, 235, 0.18)',
                        color: 'rgba(238, 248, 255, 0.98)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 2,
                        padding: 0
                      }}
                      onClick={() => {
                        openCabinPanel('passport', 'left');
                        setShowProfileEditor(true);
                      }}
                    >
                      <span
                        className="profile-view-cabin-avatar-gear-icon profile-view-cabin-avatar-gear-icon--vertical-dots"
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                          <circle cx="5" cy="3" r="1.5" fill="currentColor" opacity={0.95} />
                          <circle cx="5" cy="8" r="1.5" fill="currentColor" opacity={0.95} />
                          <circle cx="5" cy="13" r="1.5" fill="currentColor" opacity={0.95} />
                        </svg>
                      </span>
                    </button>
                    <input
                      ref={avatarUploadInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = typeof reader.result === 'string' ? reader.result : null;
                          if (!result) return;
                          setAvatar(result);
                          setAvatarInput(result);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  <div
                    className="profile-view-cabin-profile-chips"
                    style={{
                      position: 'absolute',
                      left: 54,
                      top: -20,
                      zIndex: 2,
                      pointerEvents: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      alignItems: 'flex-start',
                      lineHeight: 1.2,
                      maxWidth: 160
                    }}
                  >
                    {/* Десктоп: роль/ранг + уровень */}
                    <div className="profile-view-cabin-profile--desktop-only">
                      <div className={`profile-view-cabin-profile-rank ${rank.includes('Легенда') ? 'profile-view-cabin-profile-rank--legendary' : ''}`}>
                        {role ? ROLE_LABELS[role] : rank}
                      </div>
                      <div className="profile-view-cabin-profile-level-row">
                        <span>Уровень {currentLevels}</span>
                      </div>
                    </div>
                    {/* Мобильная: никнейм + статус + био */}
                    <div className="profile-view-cabin-profile--mobile-only">
                      <div className={`profile-view-cabin-profile-rank ${rank.includes('Легенда') ? 'profile-view-cabin-profile-rank--legendary' : ''}`}>
                        {cabinDisplayName}
                      </div>
                      <div className="profile-view-cabin-profile-level-row">
                        {cabinStatusText}
                      </div>
                      <div className="profile-view-cabin-profile-bio-line">
                        {cabinBioText}
                      </div>
                    </div>
                  </div>
                  <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--thick" style={{ transform: 'translate(60px, -65px)' }}>
                    <div className="profile-view-cabin-card-progress" style={{ width: `${xpPercent}%` }} />
                  </div>
                </div>
                <div className="profile-view-cabin-profile-meta" style={{ transform: 'translate(-150px, 30px)' }}>
                  {/* Десктоп: никнейм + статус + био */}
                  <div className="profile-view-cabin-profile--desktop-only">
                    <div className="profile-view-cabin-profile-primary">
                      <div
                        className="profile-view-cabin-profile-name-wrap"
                        title={cabinDisplayName}
                        data-full-name={cabinDisplayName}
                        aria-label={cabinDisplayName}
                        tabIndex={0}
                      >
                        <h2 className="profile-view-cabin-profile-nickname profile-autofit">{cabinDisplayName}</h2>
                      </div>
                      <p
                        className="profile-view-cabin-profile-status"
                        title={cabinStatusText}
                        role="button"
                        tabIndex={0}
                        onClick={openCabinProfileEditor}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openCabinProfileEditor();
                        }}
                      >
                        {cabinStatusText}
                      </p>
                    </div>
                    <div className="profile-view-cabin-profile-secondary">
                      <p className="profile-view-cabin-profile-bio">{cabinBioText}</p>
                    </div>
                  </div>
                  {/* Мобильная: роль + уровень */}
                  <div className="profile-view-cabin-profile--mobile-only">
                    <div className="profile-view-cabin-profile-primary">
                      <div
                        className="profile-view-cabin-profile-name-wrap"
                        title={role ? ROLE_LABELS[role] : rank}
                        data-full-name={role ? ROLE_LABELS[role] : rank}
                        aria-label={role ? ROLE_LABELS[role] : rank}
                        tabIndex={0}
                      >
                        <h2 className="profile-view-cabin-profile-nickname profile-autofit">{role ? ROLE_LABELS[role] : rank}</h2>
                      </div>
                      <p
                        className="profile-view-cabin-profile-status"
                        title={`Уровень ${currentLevels}`}
                        role="button"
                        tabIndex={0}
                        onClick={openCabinProfileEditor}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openCabinProfileEditor();
                        }}
                      >
                        Уровень {currentLevels}
                      </p>
                    </div>
                    <div className="profile-view-cabin-profile-secondary">
                      <p className="profile-view-cabin-profile-bio" style={{ display: 'none' }} />
                    </div>
                  </div>
                </div>
                </div>
                <div className="profile-view-cabin-header-actions">
                  <button
                    type="button"
                    className="profile-view-cabin-avatar-gear"
                    aria-label="Открыть настройки профиля"
                    title="Настройки профиля"
                    style={{
                      position: 'relative',
                      width: 30,
                      height: 30,
                      borderRadius: 9999,
                      border: '1px solid rgba(112, 195, 235, 0.55)',
                      background: 'linear-gradient(145deg, rgba(10, 28, 48, 0.92), rgba(4, 12, 26, 0.92))',
                      boxShadow: '0 10px 20px rgba(1, 6, 14, 0.48), 0 0 16px rgba(112, 195, 235, 0.18)',
                      color: 'rgba(238, 248, 255, 0.98)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 2,
                      padding: 0
                    }}
                    onClick={() => {
                      openCabinPanel('passport', 'left');
                      setShowProfileEditor(true);
                    }}
                  >
                    <span
                      className="profile-view-cabin-avatar-gear-icon profile-view-cabin-avatar-gear-icon--vertical-dots"
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}
                    >
                      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                        <circle cx="5" cy="3" r="1.5" fill="currentColor" opacity={0.95} />
                        <circle cx="5" cy="8" r="1.5" fill="currentColor" opacity={0.95} />
                        <circle cx="5" cy="13" r="1.5" fill="currentColor" opacity={0.95} />
                      </svg>
                    </span>
                  </button>
                </div>
            </div>
            <div
              className={`profile-view-cabin-center profile-view-cabin-center--offset ${panelActiveView === null ? 'profile-view-cabin-center--hub' : ''} ${panelActiveView === 'squad-corner' ? 'profile-view-cabin-center--squad-corner' : ''} ${panelActiveView === 'real-diary' ? 'profile-view-cabin-center--real-diary' : ''} ${panelActiveView === 'profile4k' ? 'profile-view-cabin-center--profile4k' : ''} ${panelActiveView === 'team' ? 'profile-view-cabin-center--team' : ''} ${panelActiveView === 'council' ? 'profile-view-cabin-center--council' : ''} ${panelActiveView === 'bro' ? 'profile-view-cabin-center--bro' : ''} ${panelActiveView === 'vozhatifikator' ? 'profile-view-cabin-center--vozhatifikator' : ''} ${panelActiveView === 'counselor-squad' ? 'profile-view-cabin-center--counselor-squad' : ''} ${panelActiveView === 'share' ? 'profile-view-cabin-center--share' : ''} ${panelActiveView === 'workshop' ? 'profile-view-cabin-center--workshop' : ''} ${panelActiveView === 'inspector' ? 'profile-view-cabin-center--inspector' : ''}`}
            >
              {(panelActiveView === null || panelActiveView === 'squad-corner' || panelActiveView === 'real-diary' || panelActiveView === 'profile4k' || panelActiveView === 'team' || panelActiveView === 'council' || panelActiveView === 'bro' || panelActiveView === 'vozhatifikator' || panelActiveView === 'counselor-squad' || panelActiveView === 'share' || panelActiveView === 'workshop' || panelActiveView === 'inspector') && (
                <div className="profile-view-cabin-tabs-docked">
                  {panelActiveView === null
                    ? renderTabsNav('profile-tabs-nav profile-tabs-nav--docked')
                    : panelActiveView === 'squad-corner'
                      ? renderSquadCornerTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--squad-corner')
                      : panelActiveView === 'real-diary'
                        ? renderRealDiaryTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--real-diary')
                        : panelActiveView === 'profile4k'
                          ? renderProfile4kTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--profile4k')
                        : panelActiveView === 'team'
                          ? renderTeamTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--team')
                          : panelActiveView === 'council'
                            ? renderCouncilTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--council')
                            : panelActiveView === 'bro'
                              ? renderBroTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--bro')
                              : panelActiveView === 'counselor-squad'
                                ? renderCounselorSquadTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--counselor-squad')
                                : panelActiveView === 'share'
                                  ? renderShareTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--share')
                                  : panelActiveView === 'workshop'
                                    ? renderWorkshopTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--workshop')
                                    : panelActiveView === 'inspector'
                                      ? renderInspectorTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--inspector')
                                      : renderVozhatifikatorTabsNav('profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--vozhatifikator')}
                </div>
              )}
              <div className={`profile-view-cabin-center-shell ${panelCompanions ? 'profile-view-cabin-center-shell--companions' : ''}`} style={{ background: 'transparent' }}>
                {panelCompanions?.left && (
                  <aside className="profile-view-cabin-side-screen profile-view-cabin-side-screen--left">
                    <p className="profile-view-cabin-side-screen__label">Ветка раздела</p>
                    <button type="button" className="profile-view-cabin-side-screen__btn" onClick={panelCompanions.left.action}>
                      <span>{panelCompanions.left.title}</span>
                      <small>{panelCompanions.left.subtitle}</small>
                    </button>
                    <div className="profile-view-cabin-card-progress-wrap">
                      <div className="profile-view-cabin-card-progress" style={{ width: `${panelCompanions.left.progress}%` }} />
                    </div>
                  </aside>
                )}
                <div
                  ref={centerScrollRef}
                  className={`profile-view-cabin-center-scroll profile-view-scroll-container profile-view-panel-scroll${panelActiveView === null && (activeTab === 'active' || activeTab === 'favorites') ? ' profile-view-cabin-center-scroll--locked' : ''}${panelActiveView === 'passport' ? ' profile-view-cabin-center-scroll--no-scroll' : ''}${panelActiveView === 'squad-corner' || panelActiveView === 'real-diary' || panelActiveView === 'profile4k' || panelActiveView === 'team' || panelActiveView === 'council' || panelActiveView === 'bro' || panelActiveView === 'vozhatifikator' || panelActiveView === 'counselor-squad' || panelActiveView === 'share' || panelActiveView === 'workshop' || panelActiveView === 'inspector' ? ' profile-view-cabin-center-scroll--content-fit' : ''}`}
                  style={{ background: 'transparent' }}
                >
                    {pendingApprovalsCount > 0 && !approvalsSyncPromptDismissed && canRequestApprovals && (
                      <div className="profile-approvals-sync-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 14px', marginBottom: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}>
                        <span style={{ fontSize: 13, opacity: 0.95 }}>
                          Вожатый подтвердил {pendingApprovalsCount} {pluralizeRu(pendingApprovalsCount, ['уровень', 'уровня', 'уровней'])}. Синхронизировать прогресс?
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn-primary-gold" style={{ padding: '6px 14px', fontSize: 12 }} disabled={approvalsSyncBusy} onClick={() => void syncApprovedLevels()}>
                            {approvalsSyncBusy ? 'Синхронизация...' : 'Синхронизировать'}
                          </button>
                          <button type="button" className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setApprovalsSyncPromptDismissed(true)}>
                            Позже
                          </button>
                        </div>
                      </div>
                    )}
                    {panelActiveView ? (
                      <div key={panelActiveView} className={`profile-view-cabin-content profile-view-cabin-content--from-${panelOrigin || 'left'}`}>
                        {panelActiveView !== 'passport' && panelActiveView !== 'squad-corner' && panelActiveView !== 'real-diary' && panelActiveView !== 'profile4k' && panelActiveView !== 'team' && panelActiveView !== 'council' && panelActiveView !== 'bro' && panelActiveView !== 'vozhatifikator' && panelActiveView !== 'counselor-squad' && panelActiveView !== 'share' && panelActiveView !== 'workshop' && panelActiveView !== 'inspector' && (
                          <header className="profile-view-cabin-panel-header">
                            <button type="button" className="profile-view-cabin-panel-header__back" onClick={() => { setActiveTab('active'); openCabinPanel(null, null); }} aria-label="В путь (стартовый экран)">
                              В пути
                            </button>
                            <span className="profile-view-cabin-panel-header__title">{panelTitleMap[panelActiveView]}</span>
                          </header>
                        )}
                        {renderPanelContent()}
                      </div>
                    ) : (
                      <div key={`hub-${activeTab}`} className="profile-view-cabin-content profile-view-cabin-content--from-top profile-view-cabin-content--hub">
                        <div className="profile-view-cabin-progress-hub">
                          {renderTabsPanel({ hideNav: true })}
                        </div>
                      </div>
                    )}
                </div>
                {panelCompanions?.right && (
                  <aside className="profile-view-cabin-side-screen profile-view-cabin-side-screen--right">
                    <p className="profile-view-cabin-side-screen__label">Ветка раздела</p>
                    <button type="button" className="profile-view-cabin-side-screen__btn" onClick={panelCompanions.right.action}>
                      <span>{panelCompanions.right.title}</span>
                      <small>{panelCompanions.right.subtitle}</small>
                    </button>
                    <div className="profile-view-cabin-card-progress-wrap">
                      <div className="profile-view-cabin-card-progress" style={{ width: `${panelCompanions.right.progress}%` }} />
                    </div>
                  </aside>
                )}
              </div>
            </div>
            <div className={`profile-view-cabin-right profile-view-cabin-right--raised-sections${cabinNavExpanded ? ' profile-view-cabin-right--nav-expanded' : ''}`}>
              <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                <div
                  className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--cyan"
                  style={{ ['--progress-value' as string]: panelActiveView === null ? '100%' : '0%' }}
                  aria-hidden="true"
                >
                  <div className="profile-view-cabin-right-rail-progress__fill" />
                </div>
                <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--hub ${panelActiveView === null ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => { setActiveTab('active'); openCabinPanel(null, null); }} aria-label="Главный экран">
                  <span className="profile-view-cabin-nav-icon" aria-hidden>🏠</span>
                  <span className="profile-view-cabin-card-subtitle">Главный экран</span>
                </button>
              </div>
              {seeOtradBlocksInView && (
                <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide profile-view-cabin-nav-item--inspector">
                  <div
                    className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--cyan"
                    style={{ ['--progress-value' as string]: `${inspectorProgressPercent}%` }}
                    aria-hidden="true"
                  >
                    <div className="profile-view-cabin-right-rail-progress__fill" />
                  </div>
                  <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--inspector ${panelActiveView === 'inspector' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('inspector', 'top')} aria-label="Инспектор Пользы">
                    <span className="profile-view-cabin-nav-icon" aria-hidden>📋</span>
                    <span className="profile-view-cabin-card-subtitle">Инспектор</span>
                  </button>
                </div>
              )}
              <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                <div
                  className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--cyan"
                  style={{ ['--progress-value' as string]: `${profile4kProgressPercent}%` }}
                  aria-hidden="true"
                >
                  <div className="profile-view-cabin-right-rail-progress__fill" />
                </div>
                <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'profile4k' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('profile4k', 'right')} aria-label="4К">
                  <span className="profile-view-cabin-nav-icon" aria-hidden>4К</span>
                  <span className="profile-view-cabin-card-subtitle">Навыки и рост</span>
                  <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                    <div
                      className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                      style={{ width: `${profile4kProgressPercent}%`, '--progress-value': `${profile4kProgressPercent}%` } as React.CSSProperties}
                    />
                  </div>
                  <span className="profile-view-cabin-card-hint">{badgeTitlesInPath.length} значков в пути</span>
                </button>
              </div>
              <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                <div
                  className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--magenta"
                  style={{ ['--progress-value' as string]: `${vozhProgressPercent}%` }}
                  aria-hidden="true"
                >
                  <div className="profile-view-cabin-right-rail-progress__fill" />
                </div>
                <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--vozhatifikator ${panelActiveView === 'vozhatifikator' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('vozhatifikator', 'right')} aria-label="Вожатификатор">
                  <span className="profile-view-cabin-card__img-bg">
                    <img
                      src={vozhatifikatorCardImageUrl}
                      alt=""
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        if (el.src.includes('-card')) {
                          el.src = `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}вжтфктр%202.jpg`;
                        }
                      }}
                    />
                  </span>
                  <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                    <div
                      className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                      style={{ width: `${vozhProgressPercent}%`, '--progress-value': `${vozhProgressPercent}%` } as React.CSSProperties}
                    />
                  </div>
                  <span className="profile-view-cabin-card-hint">{vozhCompletedCount}/{VOZHATIFIKATOR_CHECKLIST_ITEMS.length} легендарность</span>
                </button>
              </div>
              {(canCreateSquad || (role === 'counselor' || role === 'educator') || myJoinedSquad) && (
                <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                  <div
                    className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--purple"
                    style={{ ['--progress-value' as string]: `${myJoinedSquad || myCreatedSquad ? 100 : 18}%` }}
                    aria-hidden="true"
                  >
                    <div className="profile-view-cabin-right-rail-progress__fill" />
                  </div>
                  <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'counselor-squad' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('counselor-squad', 'right')} aria-label="Отряд вожатых">
                    <span className="profile-view-cabin-nav-icon" aria-hidden>👥</span>
                    <span className="profile-view-cabin-card-subtitle">Вожатский Отряд</span>
                    <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                      <div
                        className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                        style={{ width: `${myJoinedSquad || myCreatedSquad ? 100 : 18}%`, '--progress-value': `${myJoinedSquad || myCreatedSquad ? 100 : 18}%` } as React.CSSProperties}
                      />
                    </div>
                    <span className="profile-view-cabin-card-hint">
                      {myJoinedSquad?.squadName || myCreatedSquad?.name || 'Войти / Создать'}
                    </span>
                  </button>
                </div>
              )}
              <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                <div
                  className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--orange"
                  style={{ ['--progress-value' as string]: `${shareProgressPercent}%` }}
                  aria-hidden="true"
                >
                  <div className="profile-view-cabin-right-rail-progress__fill" />
                </div>
                <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'share' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('share', 'right')} aria-label="Шеринг">
                  <span className="profile-view-cabin-nav-icon" aria-hidden>📤</span>
                  <span className="profile-view-cabin-card-subtitle">Карточки прогресса</span>
                  <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                    <div
                      className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                      style={{ width: `${shareProgressPercent}%`, '--progress-value': `${shareProgressPercent}%` } as React.CSSProperties}
                    />
                  </div>
                  <span className="profile-view-cabin-card-hint">{shareStoryResult || shareWideResult ? 'Готов к публикации' : 'Собираем материалы'}</span>
                </button>
              </div>
              {role === 'parent' && (
                <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
                  <button type="button" className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide ${panelActiveView === 'parents' ? 'profile-view-cabin-nav-btn--active' : ''}`} onClick={() => openCabinPanel('parents', 'right')} aria-label="Для родителей">
                    <span className="profile-view-cabin-nav-icon" aria-hidden>👨‍👩‍👧</span>
                    <span className="profile-view-cabin-card-subtitle">Родительский кабинет</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {isCabinProfileExpanded && (
            <div className="profile-view-cabin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-cabin-editor-title">
              <button
                type="button"
                className="profile-view-cabin-profile-modal__backdrop"
                onClick={closeCabinProfileEditor}
                aria-label="Закрыть редактирование профиля"
              />
              <section className="profile-view-cabin-profile-modal__window">
                <header className="profile-view-cabin-profile-modal__header">
                  <h3 id="profile-cabin-editor-title">Редактирование профиля</h3>
                  <button type="button" className="profile-view-cabin-profile-modal__close" onClick={closeCabinProfileEditor} aria-label="Закрыть окно">
                    <Icons.Close />
                  </button>
                </header>
                <p className="profile-view-cabin-profile-modal__hint">Измени статус и описание экипажа. После сохранения карточка останется свёрнутой.</p>
                <label className="profile-view-cabin-profile-field">
                  <span>Статус экипажа</span>
                  <input
                    type="text"
                    value={statusInput}
                    maxLength={80}
                    onChange={(e) => setStatusInput(e.target.value)}
                    placeholder="Например: на смене, в поиске идей"
                  />
                </label>
                <label className="profile-view-cabin-profile-field">
                  <span>Пара слов о себе</span>
                  <textarea
                    value={bioInput}
                    maxLength={220}
                    rows={4}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Чем живёшь в лагере, что развиваешь, что важно."
                  />
                </label>
                <div className="profile-view-cabin-profile-modal__actions">
                  <button type="button" className="btn-secondary" onClick={closeCabinProfileEditor}>
                    Отмена
                  </button>
                  <button type="button" className="btn-secondary" disabled={!hasCabinProfileDraftChanges} onClick={saveCabinProfileText}>
                    Сохранить
                  </button>
                </div>
              </section>
            </div>
          )}
          <div className="profile-view-console" aria-label="Пульт навигации">
            <div className="console-cluster console-cluster--left">
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'squad-corner' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('squad-corner', 'left')} title="Отрядный уголок">
                  <span className="console-btn-icon">🏕️</span>
                  <span className="console-btn-label">Отрядный уголок</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${squadCornerProgressPercent}%`, '--progress-value': `${squadCornerProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'real-diary' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('real-diary', 'left')} title="Реальный Дневник">
                  <span className="console-btn-icon">📖</span>
                  <span className="console-btn-label">Реальный Дневник</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${diaryProgressPercent}%`, '--progress-value': `${diaryProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'team' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('team', 'left')} title="Движок">
                  <span className="console-btn-icon">🚀</span>
                  <span className="console-btn-label">Движок</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${teamProgressPercent}%`, '--progress-value': `${teamProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
            </div>
            <div className="console-terminal" aria-live="polite">
              <div className="console-terminal__title">{consoleCopy.title}</div>
              <div className="console-terminal__meta">{consoleCopy.meta}</div>
            </div>
            <div className="console-cluster console-cluster--right">
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'council' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('council', 'right')} title="Совет Лагеря">
                  <span className="console-btn-icon">🏛️</span>
                  <span className="console-btn-label">Совет Лагеря</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${councilProgressPercent}%`, '--progress-value': `${councilProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'bro' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('bro', 'right')} title="БРО">
                  <span className="console-btn-icon">🎖️</span>
                  <span className="console-btn-label">БРО</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${broProgressPercent}%`, '--progress-value': `${broProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
              <div className="console-btn-wrap">
                <button type="button" className={`console-btn ${panelActiveView === 'workshop' ? 'console-btn--active' : ''}`} onClick={() => openCabinPanel('workshop', 'right')} title="Мастерская">
                  <span className="console-btn-icon">⚒️</span>
                  <span className="console-btn-label">Мастерская</span>
                </button>
                <div className="console-btn-meter console-btn-meter--vertical">
                  <span style={{ width: `${workshopProgressPercent}%`, '--progress-value': `${workshopProgressPercent}%` } as React.CSSProperties} />
                </div>
              </div>
            </div>
          </div>
          <div className="profile-view-mobile-where-panel" aria-live="polite">
            {consoleCopy.title}
          </div>
          </>
        ) : panelActiveView ? (
          <>
            <div className="profile-view-panel-header" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="button" className="btn-secondary" onClick={() => openCabinPanel(null, null)}>Назад</button>
              <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.95 }}>
                {panelActiveView === 'passport' && 'Паспорт'}
                {panelActiveView === 'inspector' && 'Инспектор'}
                {panelActiveView === 'profile4k' && '4К'}
                {panelActiveView === 'counselor-squad' && 'Отряд вожатых'}
                {panelActiveView === 'squad-corner' && 'Отрядный уголок'}
                {panelActiveView === 'real-diary' && 'Реальный Дневник'}
                {panelActiveView === 'team' && 'Движок'}
                {panelActiveView === 'council' && 'Совет Лагеря'}
                {panelActiveView === 'bro' && 'БРО'}
                {panelActiveView === 'workshop' && 'Мастерская'}
                {panelActiveView === 'share' && 'Шеринг'}
                {panelActiveView === 'vozhatifikator' && 'Вожатификатор'}
                {panelActiveView === 'parents' && 'Для родителей'}
              </span>
            </div>
            <div className="profile-view-scroll-container profile-view-panel-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {renderPanelContent()}
            </div>
          </>
        ) : (
        <div className="profile-view-content-wrapper">
        <div className="profile-view-top-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
          <button onClick={onBack} className="btn-secondary">Назад</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {userData?.meta?.hasCompletedTutorial && (
              <button type="button" onClick={() => startProfileTutorial(false)} className="btn-secondary">Показать подсказки</button>
            )}
            <button onClick={() => setShowProfileEditor(!showProfileEditor)} className="btn-secondary">{showProfileEditor ? 'Закрыть' : 'Редактировать'}</button>
          </div>
        </div>

        {showSandbox && !isSpaceshipMode && (
          <div className="profile-sandbox-role" role="group" aria-label="Роль для теста">
            <div className="profile-sandbox-role__row">
              <span className="profile-sandbox-role__label">Песочница: роль для теста —</span>
              <div className="profile-sandbox-role__dropdown-wrap" ref={roleDropdownRef}>
                <button
                  type="button"
                  className="profile-sandbox-role__trigger"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  aria-expanded={roleDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Выбор роли"
                  id="profile-sandbox-role-trigger"
                >
                  <span className="profile-sandbox-role__trigger-text">{ROLE_LABELS[role]}</span>
                  <span className={`profile-sandbox-role__trigger-chevron ${roleDropdownOpen ? 'is-open' : ''}`} aria-hidden>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M6 8L1 3h10z"/></svg>
                  </span>
                </button>
                <ul
                  className={`profile-sandbox-role__menu ${roleDropdownOpen ? 'is-open' : ''}`}
                  role="listbox"
                  aria-labelledby="profile-sandbox-role-trigger"
                  tabIndex={-1}
                >
                  {ROLE_ORDER.map((r) => (
                    <li
                      key={r}
                      role="option"
                      aria-selected={r === role}
                      className={`profile-sandbox-role__option ${r === role ? 'is-selected' : ''}`}
                      onClick={() => { setSandboxRole(r); setRoleDropdownOpen(false); }}
                    >
                      {ROLE_LABELS[r]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="profile-sandbox-role__current" aria-live="polite" aria-atomic="true">
              <div className="profile-sandbox-role__current-label">Сейчас:</div>
              {(() => {
                const { title, subtitle } = getRoleDisplay(role);
                return subtitle ? (
                  <>
                    <div className="profile-sandbox-role__title">{title}</div>
                    <div className="profile-sandbox-role__subtitle">{subtitle}</div>
                  </>
                ) : (
                  <span className="profile-sandbox-role__title">{title}</span>
                );
              })()}
            </div>
          </div>
        )}

        <div className="profile-view-backup-strip">
        {showSandbox && (() => {
          const levelsToApprove = Object.entries(progress || {}).filter(
            ([_, p]) => p && p.status === 'in_progress' && Array.isArray(p.evidence) && p.evidence.length > 0
          );
          if (levelsToApprove.length === 0) return null;
          return (
            <div id="profile-dev-approve-levels" className="sandbox-dev-approve" style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255, 165, 0, 0.12)', borderRadius: '12px', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Dev: быстрые одобрения</strong> <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.8 }}>Уровни в пути с evidence — одобрить:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {levelsToApprove.map(([id, p]) => {
                  const reflection = p?.reflection || (p?.evidence?.find((e: { type: string }) => e.type === 'text') as { value?: string } | undefined)?.value;
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{badgeLookupMap.get(getBaseId(id))?.title || id}</span>
                      <button
                        type="button"
                        onClick={() => updateLevelStatus(id, 'achieved', reflection)}
                        className="btn-confirm-main"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        Одобрить
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {showSandbox && role === 'developer' && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0, 255, 255, 0.06)', borderRadius: '12px', border: '1px solid rgba(0, 255, 255, 0.18)' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <strong>Dev: выдать уровень</strong> <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Level ID (можно списком через запятую)</label>
                <input
                  value={devGrantLevelId}
                  onChange={(e) => setDevGrantLevelId(e.target.value)}
                  placeholder="Например: 8.6.1, 8.6.2"
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Статус</label>
                <select
                  value={devGrantStatus}
                  onChange={(e) => setDevGrantStatus(e.target.value as 'locked' | 'in_progress' | 'achieved')}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                >
                  <option value="locked">locked</option>
                  <option value="in_progress">in_progress</option>
                  <option value="achieved">achieved</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Рефлексия (опционально)</label>
              <input
                value={devGrantReflection}
                onChange={(e) => setDevGrantReflection(e.target.value)}
                placeholder="Коротко: что сделал(а)"
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-confirm-main"
                onClick={() => {
                  const ids = String(devGrantLevelId || '')
                    .split(/[\s,;]+/)
                    .map((v) => v.trim())
                    .filter(Boolean);
                  if (ids.length === 0) return;
                  ids.forEach((id) => {
                    updateLevelStatus(id as any, devGrantStatus, devGrantReflection.trim() || undefined);
                  });
                  showHint({
                    title: 'Dev',
                    content: `Применено ${ids.length} ${ids.length === 1 ? 'уровень' : 'уровней'} со статусом ${devGrantStatus}.`
                  });
                  setDevGrantLevelId('');
                  setDevGrantReflection('');
                }}
              >
                Применить
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setDevGrantLevelId(''); setDevGrantReflection(''); }}
              >
                Очистить
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => resetProgress()}
              >
                Сбросить прогресс
              </button>
            </div>
          </div>
        )}
        <input type="file" ref={importInputRef} accept=".json" style={{ display: 'none' }} onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f && importData) {
            const result = await importData(f);
            if (result.success) {
              if (result.data?.customBadges != null && Array.isArray(result.data.customBadges) && restoreCustomBadges) {
                restoreCustomBadges(result.data.customBadges as { id: string; title: string; emoji?: string; category_id?: string; level?: string; criteria?: string; description?: string }[]);
              }
              showHint({ title: 'Готово', content: 'Прогресс и предложения Мастерской восстановлены.' });
            }
          }
          e.target.value = '';
        }} />
        </div>

        <div className="profile-view-main">
        <div className="profile-view-scroll-container">
        <div className="profile-view-passport-column">
        <div id="profile-passport-card" className="profile-view-passport-two-col">
          <div className="profile-view-passport-avatar">
            <div className="avatar-circle">
              {isImageAvatar(showProfileEditor ? avatarInput : profile.avatar) ? (
                <img src={(showProfileEditor ? avatarInput : profile.avatar) as string} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '44px' }}>{(showProfileEditor ? avatarInput : profile.avatar) || '🧑‍🚀'}</span>
              )}
            </div>
            {showProfileEditor && (
              <div className="profile-view-passport-avatar-buttons">
                <ImageSourceBlock
                  context="passport_avatar"
                  value={typeof avatarInput === 'string' && (avatarInput.startsWith('data:') || avatarInput.startsWith('http')) ? avatarInput : null}
                  onChange={setAvatarInput}
                  aspect="square"
                  hidePreview
                  buttonLayout="column"
                  onGenerate={async (opts) =>
                    requestImageGenerate({ mode: 'generate', context: 'passport', prompt: opts.prompt ?? '' }, accessToken ?? null)
                  }
                  onProcess={async (imageBase64, opts) =>
                    requestImageGenerate({ mode: 'process', context: 'passport', imageBase64, prompt: opts?.prompt ?? '' }, accessToken ?? null)
                  }
                  onUnlockRequest={openUnlockByCode}
                />
              </div>
            )}
          </div>
          <div className="profile-view-passport-settings">
            <h2 className="profile-view-passport-title">Профиль</h2>
            {showProfileEditor ? (
              <>
                <div className="profile-view-passport-row">
                  <label className="profile-view-passport-label">
                    Ник
                    <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} placeholder="Никнейм" className="w-input" />
                  </label>
                  <label className="profile-view-passport-label">
                    Направление
                    <input value={statusInput} maxLength={80} onChange={e => setStatusInput(e.target.value)} placeholder="Направление" className="w-input" />
                  </label>
                </div>
                <div className="profile-view-passport-divider" />
                <label className="profile-view-passport-label profile-view-passport-label--full">
                  Сейчас делаю
                  <textarea value={bioInput} maxLength={160} onChange={e => setBioInput(e.target.value)} placeholder="Коротко. Одна мысль." className="w-input" style={{ minHeight: 80, resize: 'vertical' }} />
                </label>
                <p className="profile-view-passport-hint">Коротко. Одна мысль. Можно без точки. ({bioInput.length}/160)</p>
              </>
            ) : (
              <>
                <div className="profile-view-passport-row">
                  <div className="profile-view-passport-label">
                    Ник
                    <div className="profile-view-passport-value">{profile.nickname}</div>
                  </div>
                  <div className="profile-view-passport-label">
                    Направление
                    <div className="profile-view-passport-value">{profile?.status || '—'}</div>
                  </div>
                </div>
                <div className="profile-view-passport-divider" />
                <div className="profile-view-passport-label profile-view-passport-label--full">
                  Сейчас делаю
                  <div className="profile-view-passport-value">{profile?.bio || '—'}</div>
                </div>
                {['counselor', 'educator', 'shift_leader', 'camp_director', 'developer'].includes(role) && (() => {
                  const { title, subtitle } = getRoleDisplay(role);
                  return (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                      {title}
                      {subtitle && <div style={{ fontSize: 10, opacity: 0.85 }}>{subtitle}</div>}
                    </div>
                  );
                })()}
              </>
            )}
            <div className="profile-view-passport-divider" />
            <div className="profile-view-passport-label profile-view-passport-label--full">Ранг</div>
            <div className="profile-view-passport-rank-row">
              <span>Уровень {currentLevels}</span>
              <span>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${xpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #8B00FF, #FFD700)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <div className="profile-view-passport-divider profile-view-passport-divider--short" />
            <div className="profile-view-passport-actions">
              {showProfileEditor ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setNicknameInput(profile.nickname || '');
                      setAvatarInput(profile.avatar || '🧑‍🚀');
                      setStatusInput(profile?.status || '');
                      setBioInput(profile?.bio || '');
                      setShowProfileEditor(false);
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="btn-primary-gold"
                    onClick={() => {
                      setNickname(nicknameInput);
                      setAvatar(avatarInput);
                      setProfileStatus(statusInput);
                      setProfileBio(bioInput.trim().slice(0, 160));
                      setShowProfileEditor(false);
                    }}
                  >
                    Сохранить
                  </button>
                </>
              ) : (
                <button type="button" className="btn-primary-gold" onClick={() => setShowProfileEditor(true)}>
                  Редактировать
                </button>
              )}
            </div>
          </div>
        </div>
        </div>

        {role === 'parent' && (
          <div id="parents-section" className="profile-view-parents-section" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Для родителей</h2>
            {campFactsLoading && <p className="parents-section-block__text" style={{ margin: 0 }}>Данные загружаются…</p>}
            {campFactsError && <p style={{ fontSize: 13, margin: 0, color: '#f59e0b' }}>Проверьте подключение. {campFactsError}</p>}
            {!campFactsLoading && !campFactsError && campFacts && (
              <>
                <div className="parents-section-block">
                  <h3 className="parents-section-block__heading">Смена</h3>
                  {(campFacts.currentSeason?.name || campFacts.currentSeason?.theme) && (
                    <div>
                      {campFacts.currentSeason?.name && <p className="parents-section-block__text" style={{ margin: 0, fontWeight: 600 }}>{campFacts.currentSeason.name}</p>}
                      {campFacts.currentSeason?.theme && <p style={{ fontSize: 12, margin: '4px 0 0' }}>{campFacts.currentSeason.theme}</p>}
                    </div>
                  )}
                  {campFacts.currentSeason?.dates && (
                    <div>
                      <span className="parents-section-block__label">Даты смен</span>
                      <p className="parents-section-block__text">{campFacts.currentSeason.dates}</p>
                    </div>
                  )}
                  {campFacts.currentSeason?.price && (
                    <div>
                      <span className="parents-section-block__label">Стоимость</span>
                      <p className="parents-section-block__text">{campFacts.currentSeason.price}</p>
                    </div>
                  )}
                </div>
                <div className="parents-section-block">
                  <h3 className="parents-section-block__heading">Документы</h3>
                  {campFacts.documents && campFacts.documents.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.9 }}>
                      {campFacts.documents.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="parents-section-block__text">Уточняйте у организаторов.</p>
                  )}
                </div>
                {campFacts.address && (campFacts.address.campName || campFacts.address.base || campFacts.address.address || campFacts.address.route) && (
                  <div className="parents-section-block">
                    <h3 className="parents-section-block__heading">Адрес и как добраться</h3>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      {(campFacts.address.campName || campFacts.address.base) && (
                        <p style={{ margin: 0 }}>{[campFacts.address.campName, campFacts.address.base].filter(Boolean).join(', ')}</p>
                      )}
                      {campFacts.address.address && <p style={{ margin: '4px 0 0' }}>{campFacts.address.address}</p>}
                      {campFacts.address.route && <p style={{ margin: '4px 0 0' }}>Как добраться: {campFacts.address.route}</p>}
                    </div>
                  </div>
                )}
                {campFacts.contacts && (
                  <div className="parents-section-block">
                    <h3 className="parents-section-block__heading">Контакты</h3>
                    <div className="parents-section__contacts">
                      {campFacts.contacts.phone && (
                        <a href={`tel:${campFacts.contacts.phone.replace(/\s/g, '')}`}>{campFacts.contacts.phone}</a>
                      )}
                      {campFacts.contacts.email && (
                        <a href={`mailto:${campFacts.contacts.email}`}>{campFacts.contacts.email}</a>
                      )}
                      {campFacts.contacts.telegram && (
                        <a href={campFacts.contacts.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
                      )}
                      {campFacts.contacts.site && (
                        <a href={campFacts.contacts.site} target="_blank" rel="noopener noreferrer">Сайт</a>
                      )}
                      {campFacts.contacts.vk && (
                        <a href={campFacts.contacts.vk} target="_blank" rel="noopener noreferrer">ВКонтакте</a>
                      )}
                      {campFacts.contacts.organizer && (
                        <a href={campFacts.contacts.organizer} target="_blank" rel="noopener noreferrer">Организатор (Telegram)</a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {!campFactsLoading && !campFactsError && !campFacts && (
              <p className="parents-section-block__text" style={{ margin: 0 }}>По вопросам документов и бронирования — контакты в разделе «О лагере».</p>
            )}
            {typeof onNavigateToRegistrationForm === 'function' && (
              <button type="button" onClick={onNavigateToRegistrationForm} className="btn-primary-gold" style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>
                Забронировать путевку
              </button>
            )}
            <h3 className="parents-section__program-title">Программа смены</h3>
            <CampProgramByDays />
            <div className="parents-section__actions">
              <button type="button" onClick={() => setShowChildBadges(true)} className="parents-section__btn-child">
                Значки моего ребёнка
              </button>
              <button type="button" onClick={() => setShowChildRouteForm(true)} className="parents-section__btn-route">
                Предложить маршрут развития для ребёнка
              </button>
              <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>Предложить идею для лагеря — в блоке «Совет Лагеря» ниже.</p>
            </div>
          </div>
        )}

        {showOrganizerPanel && (
          <div id="organizer-shifts-section" className="profile-view-parents-section organizer-shifts-section">
            <h2 className="organizer-shifts-section__heading">Смены и отряды</h2>
            {organizerLoading && <p className="organizer-loading">Загрузка…</p>}
            {organizerError && <div className="organizer-error">{organizerError}</div>}
            {!organizerLoading && (
              <>
                <div className="organizer-shifts-list">
                  {organizerShifts.map((shift) => (
                    <div key={shift.id} className="organizer-shift-card parents-section-block">
                      <div className="organizer-shift-card__header">
                        <div>
                          <h3 className="organizer-shift-card__title parents-section-block__heading">{shift.name}</h3>
                          <p className="organizer-shift-card__dates parents-section-block__text">{shift.startDate} — {shift.endDate}</p>
                        </div>
                        <button type="button" className="btn-secondary" style={{ padding: '6px 12px' }} aria-label="Добавить отряд в смену" onClick={() => { setOrganizerSquadFormShiftId(shift.id); setOrganizerSquadFormName(''); setOrganizerSquadFormOpen(true); }}>Добавить отряд</button>
                      </div>
                      {(organizerSquadsMap[shift.id] || []).length > 0 ? (
                        <ul className="organizer-squads-list">
                          {(organizerSquadsMap[shift.id] || []).map((s) => (
                            <li key={s.id}>{s.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="organizer-empty-state organizer-empty-state--squads">
                          <p className="organizer-empty-state__title">Пока нет отрядов</p>
                          <p className="organizer-empty-state__text">Добавьте первый отряд, чтобы участники могли выбирать его при входе по коду.</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {organizerShifts.length === 0 && (
                    <div className="organizer-empty-state">
                      {!accessToken ? (
                        <>
                          <div className="organizer-empty-state__icon" aria-hidden>🔐</div>
                          <p className="organizer-empty-state__title">Вход для руководителя смены</p>
                          <p className="organizer-empty-state__text">Войдите через код верификации для управления сменами и отрядами.</p>
                        </>
                      ) : (
                        <>
                          <div className="organizer-empty-state__icon" aria-hidden>📅</div>
                          <p className="organizer-empty-state__title">Пока нет смен</p>
                          <p className="organizer-empty-state__text">Создайте первую смену, чтобы добавлять отряды и выдавать коды участникам и вожатым.</p>
                          <button type="button" className="btn-primary-gold" style={{ padding: '10px 20px' }} aria-label="Создать смену" onClick={() => { setOrganizerShiftForm({ name: '', startDate: '', endDate: '' }); setOrganizerShiftFormOpen(true); }}>Создать смену</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {accessToken && (
                  <div className="organizer-shifts-actions">
                    <button type="button" className="btn-primary-gold" style={{ padding: '10px 20px' }} aria-label="Создать смену" onClick={() => { setOrganizerShiftForm({ name: '', startDate: '', endDate: '' }); setOrganizerShiftFormOpen(true); }}>Создать смену</button>
                    <button type="button" className="btn-secondary" style={{ padding: '10px 20px' }} aria-label="Обновить список смен и отрядов" disabled={organizerLoading} onClick={() => loadOrganizerData()}>Обновить</button>
                    <button type="button" className="btn-secondary" style={{ padding: '10px 20px' }} aria-label="Выдать код верификации" onClick={() => { setOrganizerCodeForm({ deviceId: deviceId || '', role: 'participant', shiftId: organizerShifts[0]?.id || '' }); setOrganizerCodeResult(null); setOrganizerCodeModalOpen(true); }}>Выдать код</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {organizerShiftFormOpen && (
          <div className="profile-utility-panel-overlay" onClick={() => setOrganizerShiftFormOpen(false)} aria-hidden="true" />
        )}
        {organizerShiftFormOpen && (
          <div className="profile-utility-panel profile-utility-panel--modal-centered" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-shift-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-shift-title">Создать смену</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => setOrganizerShiftFormOpen(false)} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label htmlFor="organizer-shift-name" style={{ fontSize: 12, opacity: 0.8 }}>Название смены</label>
                  <input id="organizer-shift-name" value={organizerShiftForm.name} onChange={e => setOrganizerShiftForm(f => ({ ...f, name: e.target.value }))} placeholder="Название смены" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <div>
                  <label htmlFor="organizer-shift-start" style={{ fontSize: 12, opacity: 0.8 }}>Дата начала</label>
                  <input id="organizer-shift-start" type="date" value={organizerShiftForm.startDate} onChange={e => setOrganizerShiftForm(f => ({ ...f, startDate: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <div>
                  <label htmlFor="organizer-shift-end" style={{ fontSize: 12, opacity: 0.8 }}>Дата окончания</label>
                  <input id="organizer-shift-end" type="date" value={organizerShiftForm.endDate} onChange={e => setOrganizerShiftForm(f => ({ ...f, endDate: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Создать смену" disabled={!organizerShiftForm.name.trim() || !organizerShiftForm.startDate || !organizerShiftForm.endDate || organizerLoading} onClick={async () => {
                  if (!accessToken) return;
                  setOrganizerLoading(true);
                  setOrganizerError(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/shifts`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ name: organizerShiftForm.name.trim(), startDate: organizerShiftForm.startDate, endDate: organizerShiftForm.endDate }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 401) { setOrganizerError('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerError(data?.error || `Ошибка ${res.status}`); return; }
                    setOrganizerShifts(prev => [...prev, data]);
                    setOrganizerShiftFormOpen(false);
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Создать</button>
              </div>
            </div>
          </div>
        )}

        {organizerSquadFormOpen && (
          <div className="profile-utility-panel-overlay" onClick={() => setOrganizerSquadFormOpen(false)} aria-hidden="true" />
        )}
        {organizerSquadFormOpen && (
          <div className="profile-utility-panel profile-utility-panel--modal-centered" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-squad-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-squad-title">Добавить отряд</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => setOrganizerSquadFormOpen(false)} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label htmlFor="organizer-squad-name" style={{ fontSize: 12, opacity: 0.8 }}>Название отряда</label>
                  <input id="organizer-squad-name" value={organizerSquadFormName} onChange={e => setOrganizerSquadFormName(e.target.value)} placeholder="Название отряда" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Добавить отряд" disabled={!organizerSquadFormName.trim() || organizerLoading} onClick={async () => {
                  if (!accessToken || !organizerSquadFormShiftId) return;
                  setOrganizerLoading(true);
                  setOrganizerError(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/shifts/${organizerSquadFormShiftId}/squads`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ name: organizerSquadFormName.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 401) { setOrganizerError('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerError(data?.error || `Ошибка ${res.status}`); return; }
                    setOrganizerSquadsMap(prev => ({ ...prev, [organizerSquadFormShiftId]: [...(prev[organizerSquadFormShiftId] || []), data] }));
                    setOrganizerSquadFormOpen(false);
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Добавить</button>
              </div>
            </div>
          </div>
        )}

        {organizerCodeModalOpen && (
          <div className="profile-utility-panel-overlay" onClick={() => { setOrganizerCodeModalOpen(false); setOrganizerCodeResult(null); }} aria-hidden="true" />
        )}
        {organizerCodeModalOpen && (
          <div className="profile-utility-panel profile-utility-panel--modal-centered" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-code-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-code-title">Выдать код</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => { setOrganizerCodeModalOpen(false); setOrganizerCodeResult(null); }} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>deviceId</label>
                  <p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.75 }}>Идентификатор устройства участника, к которому привязывается код (обычно подставляется автоматически).</p>
                  <input value={organizerCodeForm.deviceId} onChange={e => setOrganizerCodeForm(f => ({ ...f, deviceId: e.target.value }))} placeholder="UUID устройства" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Роль</label>
                  <select value={organizerCodeForm.role} onChange={e => setOrganizerCodeForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}>
                    {(['participant', 'parent', 'counselor', 'shift_leader'] as const).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Смена (опционально)</label>
                  <select value={organizerCodeForm.shiftId} onChange={e => setOrganizerCodeForm(f => ({ ...f, shiftId: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}>
                    <option value="">— без смены —</option>
                    {organizerShifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Сгенерировать код верификации" disabled={!organizerCodeForm.deviceId.trim() || organizerLoading} onClick={async () => {
                  if (!accessToken) return;
                  setOrganizerLoading(true);
                  setOrganizerError(null);
                  setOrganizerCodeResult(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/organizer/generate-code`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ deviceId: organizerCodeForm.deviceId.trim(), role: organizerCodeForm.role, shiftId: organizerCodeForm.shiftId || undefined }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 401) { setOrganizerError('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerError(data?.error || `Ошибка ${res.status}`); return; }
                    setOrganizerCodeResult(data.code || '');
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Сгенерировать код</button>
                {organizerCodeResult && (
                  <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.8 }}>Код:</p>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace' }}>{organizerCodeResult}</p>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(organizerCodeResult).then(() => showHint({ title: 'Скопировано', content: 'Код скопирован в буфер обмена' })); }} className="btn-secondary" style={{ marginTop: 8, padding: '8px 16px' }}>Копировать</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="profile-view-dashboards-grid">
        <div className="dashboards-stack" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
           {seeOtradBlocksInView && <InspectorDashboard onOpenDiary={() => openCabinPanel('real-diary', 'left')} />}
           <Profile4KDashboard
             userData={userData}
             badges={badges}
             badgeTitlesInPath={badgeTitlesInPath}
             favoriteBadgeTitles={favoriteBadgeTitles}
             rank={rank}
             nickname={profile.nickname}
           />
           {!isSpaceshipMode && (
             travelerMode ? (
               <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                 <TeamDashboard
                  onSuggestInitiative={seeOtradBlocksInView ? () => {
                    setInitiativeForm({
                      topicDraft: '',
                      currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
                      shiftLength: 21,
                      campProgram3d: ''
                    });
                    setInitiativeResult(null);
                    setInitiativeError(null);
                    setInitiativeModalOpen(true);
                  } : undefined}
                />
               </FeatureGate>
             ) : (
               <TeamDashboard
                onSuggestInitiative={seeOtradBlocksInView ? () => {
                  setInitiativeForm({
                    topicDraft: '',
                    currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
                    shiftLength: 21,
                    campProgram3d: ''
                  });
                  setInitiativeResult(null);
                  setInitiativeError(null);
                  setInitiativeModalOpen(true);
                } : undefined}
              />
             )
           )}

           {(canCreateSquad || (role === 'counselor' || role === 'educator') || myJoinedSquad) && (
             <div id="counselor-squad-section" style={{ marginTop: 0, padding: 16, background: 'rgba(139, 0, 255, 0.06)', borderRadius: 16, border: '1px solid rgba(139, 0, 255, 0.2)' }}>
               <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: '0 0 12px' }}>Отряд вожатых</h3>
               {myJoinedSquad && (
                 <div style={{ marginBottom: 14 }}>
                   <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Вы в отряде: <strong>{myJoinedSquad.squadName}</strong></p>
                   <button type="button" onClick={() => { leaveSquad(); setCounselorJoinCode(''); setCounselorJoinError(null); }} className="btn-secondary" style={{ marginTop: 8, padding: '6px 12px', fontSize: 12 }}>Выйти из отряда</button>
                 </div>
               )}
               {!myJoinedSquad && ((role === 'counselor' || role === 'educator') || (canCreateSquad && !myCreatedSquad)) && (
                 <div style={{ marginBottom: 14 }} className={(role === 'counselor' || role === 'educator') ? 'organizer-empty-state' : ''}>
                   {(role === 'counselor' || role === 'educator') && (
                     <>
                       <div className="organizer-empty-state__icon" aria-hidden>🔑</div>
                       <p className="organizer-empty-state__title" style={{ margin: '0 0 6px', fontSize: 14 }}>Войти в отряд вожатых</p>
                       <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.85 }}>Старший Вожатый (или Разработчик в песочнице) создаёт отряд и даёт код приглашения. Вставьте код, чтобы присоединиться.</p>
                     </>
                   )}
                   <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Войти в отряд вожатых по коду</label>
                   <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                     <input
                       type="text"
                       value={counselorJoinCode}
                       onChange={(e) => { setCounselorJoinCode(e.target.value); setCounselorJoinError(null); }}
                       placeholder="Вставьте код приглашения"
                       style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                     />
                     <button
                       type="button"
                       onClick={() => {
                         if (!counselorJoinCode.trim()) { setCounselorJoinError('Введите код'); return; }
                         const ok = joinByCode(counselorJoinCode.trim());
                         setCounselorJoinError(ok ? null : 'Неверный код');
                         if (ok) setCounselorJoinCode('');
                       }}
                       className="btn-primary-gold"
                       style={{ padding: '8px 14px', fontSize: 12 }}
                     >
                       Войти
                     </button>
                   </div>
                   {counselorJoinError && <span style={{ fontSize: 12, color: '#ff6b6b', display: 'block', marginTop: 4 }}>{counselorJoinError}</span>}
                 </div>
               )}
               {canCreateSquad && (
                 <div>
                   {!myCreatedSquad ? (
                     <div className="organizer-empty-state" style={{ padding: '12px 0' }}>
                       <div className="organizer-empty-state__icon" aria-hidden>👥</div>
                       <p className="organizer-empty-state__title" style={{ margin: '0 0 8px' }}>Создать отряд вожатых</p>
                       <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85 }}>Введите название и создайте отряд, чтобы приглашать вожатых по коду или ссылке.</p>
                       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                         <input
                           type="text"
                           value={counselorSquadName}
                           onChange={(e) => setCounselorSquadName(e.target.value)}
                           placeholder="Например: Отряд «Солнышко»"
                           style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                         />
                         <button type="button" disabled={!counselorSquadName.trim()} title={!counselorSquadName.trim() ? 'Введите название отряда' : undefined} onClick={() => { if (counselorSquadName.trim()) { createSquad(counselorSquadName.trim()); setCounselorSquadName(''); } else { showHint({ title: 'Введите название', content: 'Укажите название отряда, чтобы создать его.' }); } }} className="btn-primary-gold" style={{ padding: '8px 14px', fontSize: 12 }}>Создать отряд</button>
                       </div>
                     </div>
                   ) : (
                     <div>
                       <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.9 }}><strong>{myCreatedSquad.name}</strong></p>
                       <p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.8 }}>Код приглашения:</p>
                       <p style={{ margin: '0 0 8px', fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all' }}>{getInviteCode()}</p>
                       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                         <button type="button" onClick={() => { navigator.clipboard?.writeText(getInviteCode()); showHint({ title: 'Скопировано', content: 'Код скопирован' }); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Копировать код</button>
                         <button type="button" onClick={() => { navigator.clipboard?.writeText(getInviteLink()); showHint({ title: 'Скопировано', content: 'Ссылка скопирована' }); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Копировать ссылку</button>
                         <button type="button" onClick={() => setDisbandConfirmOpen(true)} style={{ padding: '6px 12px', fontSize: 12, background: 'rgba(255,77,77,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, cursor: 'pointer' }}>Распустить отряд</button>
                       </div>
                       <p style={{ margin: '12px 0 0', fontSize: 11, opacity: 0.7 }}>Список участников будет доступен при синхронизации с сервером.</p>
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}

           {seeOtradBlocksInView && (
             <div id="wing-dashboard">
              {travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                  <WingDashboard
                    onSuggestInitiative={() => {
                      setInitiativeForm({
                        topicDraft: '',
                        currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
                        shiftLength: 21,
                        campProgram3d: ''
                      });
                      setInitiativeResult(null);
                      setInitiativeError(null);
                      setInitiativeModalOpen(true);
                    }}
                  />
                </FeatureGate>
              ) : (
                <FeatureGate
                  allowed={Boolean(userData?.broProgress?.isBro)}
                  reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
                  ctaLabel="К Бропаспорту"
                  onCta={() => document.getElementById('bro-section-passport')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  mode="replace"
                >
                  <WingDashboard
                    onSuggestInitiative={() => {
                      setInitiativeForm({
                        topicDraft: '',
                        currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
                        shiftLength: 21,
                        campProgram3d: ''
                      });
                      setInitiativeResult(null);
                      setInitiativeError(null);
                      setInitiativeModalOpen(true);
                    }}
                  />
                </FeatureGate>
              )}
             </div>
           )}
        </div>
        </div>

        {renderTabsPanel()}

        <div className="profile-view-share-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(77, 172, 255, 0.08)', borderRadius: '24px', border: '1px solid rgba(77, 172, 255, 0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Пригласить друзей</h3>
          <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '12px' }}>{myTeam ? 'Скопируй ссылку и отправь участникам Движка.' : 'Создай Движок в блоке выше и приглашай друзей по ссылке.'}</p>
          <button type="button" onClick={() => { const url = generateInviteUrl(); navigator.clipboard.writeText(url).then(() => alert('Ссылка приглашения скопирована в буфер обмена!')); }} style={{ padding: '12px', background: 'linear-gradient(90deg, #4dacff, #8b00ff)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>🔗 Пригласить друзей</button>
        </div>

        <div id="profile-share-center" className="share-center-v2">
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤</div>
          <h3>Шеринг достижений</h3>
          <label className="share-center-toggle">
            <input type="checkbox" className="share-center-toggle-input" checked={shareHideNickname} onChange={e => setShareHideNickname(e.target.checked)} />
            <span className="share-center-toggle-track" aria-hidden />
            <span>Скрыть ник</span>
          </label>
          <button onClick={async () => {
            if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl);
            if (shareWideUrl) URL.revokeObjectURL(shareWideUrl);
            setShareStoryUrl(null);
            setShareWideUrl(null);
            setShareStoryResult(null);
            setShareWideResult(null);
            setShareBusy(true);
            setShareStatus('Генерируем слоган…');
            try {
              const raw = await fetchAiSlogan({ kind: 'progress_summary', nickname: profile.nickname, rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted, badgeTitlesInPath, favoriteBadgeTitles });
              const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan;
              setShareStatus('Генерируем характеристику 4К…');
              const pedagogy4kLine = await fetchPedagogy4k({ badgeTitlesInPath, favoriteBadgeTitles, rank, nickname: profile.nickname ?? undefined });
              setShareStatus('Генерируем мем для сторис…');
              const storiesMemeRaw = await fetchAiSlogan({ kind: 'stories_reels_meme', nickname: profile.nickname ?? undefined, rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted });
              const customStoriesLine = typeof storiesMemeRaw === 'string' && storiesMemeRaw.trim() ? storiesMemeRaw.trim() : undefined;
              setShareStatus('Генерируем вайб-чек…');
              const vibeRaw = await fetchVibeCheck({ variant: 'profile', rank, nickname: profile.nickname ?? undefined, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted, badgeTitlesInPath, favoriteBadgeTitles });
              const vibeCheck = vibeRaw ? { memeHeader: vibeRaw.meme_header, memeText: vibeRaw.meme_text, statBuff: vibeRaw.stat_buff } : undefined;
              const createdAt = new Date().toISOString();
              const profilePayload = { nickname: profile.nickname ?? undefined, avatar: profile.avatar ?? '', rank, totalLevelsAchieved: profile?.stats?.totalLevelsAchieved, totalBadgesStarted: profile?.stats?.totalBadgesStarted };
              const storyRes = await generateSocialCard({ kind: 'progress_summary', profile: profilePayload, format: 'story', hideNickname: shareHideNickname, customCaption: slogan ?? undefined, customCallout: pedagogy4kLine ?? undefined, customStoriesLine, vibeCheck, badgeCarouselItems, createdAt });
              const wideRes = await generateSocialCard({ kind: 'progress_summary', profile: profilePayload, format: 'wide', hideNickname: shareHideNickname, customCaption: slogan ?? undefined, customCallout: pedagogy4kLine ?? undefined, customStoriesLine, vibeCheck, badgeCarouselItems, createdAt });
              setShareStoryResult(storyRes);
              setShareWideResult(wideRes);
              setShareStoryUrl(URL.createObjectURL(storyRes.blob));
              setShareWideUrl(URL.createObjectURL(wideRes.blob));
              setShareStatus('Карточки готовы: 9:16 и 16:9.');
            } catch (e) {
              console.error(e);
              setShareStatus('Не удалось сгенерировать карточки. Попробуй ещё раз.');
            } finally { setShareBusy(false); }
          }} disabled={shareBusy} className="btn-generate">{shareBusy ? 'Генерируем…' : 'Создать карточку'}</button>
          {(shareStoryUrl || shareWideUrl) && (
            <div className="share-center-results">
              {shareStatus && <div style={{ fontSize: '13px', opacity: 0.9 }}>{shareStatus}</div>}
              {shareStoryUrl && shareStoryResult && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Сторис 9:16</div>
                  <img src={shareStoryUrl} alt="Сторис" style={{ width: '100%', maxWidth: '280px', borderRadius: '20px', display: 'block' }} />
                  <button type="button" onClick={() => shareOrDownloadSocialCard(shareStoryResult)} className="btn-secondary" style={{ marginTop: '8px' }}>Поделиться / скачать</button>
                </div>
              )}
              {shareWideUrl && shareWideResult && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Пост 16:9</div>
                  <img src={shareWideUrl} alt="Пост" style={{ width: '100%', borderRadius: '20px', display: 'block' }} />
                  <button type="button" onClick={() => shareOrDownloadSocialCard(shareWideResult)} className="btn-secondary" style={{ marginTop: '8px' }}>Поделиться / скачать</button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        </div>
        </div>
        </div>
        );

  return (
    <section className={`profile-view profile-view--one-screen profile-view--mobile-scope${cabinNavExpanded ? ' profile-view--cabin-nav-expanded' : ''}`}>
      {roleSelectorVisible && (
        <div className="profile-role-selector-overlay" role="dialog" aria-modal="true" aria-label="Выбор роли">
          <div className="profile-role-selector__screen">
            <h2 className="profile-role-selector__title">Выбери роль</h2>
            <div className="profile-role-selector__list" role="tablist" aria-label="Выбор роли">
              {ROLE_ORDER.map((r) => {
                const { title, subtitle } = getRoleDisplay(r);
                return (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    className="profile-role-selector__tab"
                    onClick={() => {
                      try { localStorage.setItem('rl_profile_role_selector_seen', '1'); } catch {}
                      setSandboxRole(r);
                      setShowRoleSelector(false);
                    }}
                  >
                    <span className="profile-role-selector__tab-label">{title}</span>
                    {subtitle && <span className="profile-role-selector__tab-subtitle">{subtitle}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="profile-view-nav-decor" aria-hidden="true" />

      <div className="profile-utility-bubbles">
        {!canUseChat && (
          <button type="button" className="profile-utility-bubble profile-utility-bubble--bot" onClick={() => setOpenBubble(openBubble === 'bot' ? null : 'bot')} title="Разблокировать бота">
            ИИ‑чат
          </button>
        )}
        {showSandbox && (
          <button type="button" className="profile-utility-bubble profile-utility-bubble--code" onClick={() => setOpenBubble(openBubble === 'code' ? null : 'code')} title="Сгенерировать код подтверждения">
            Код
          </button>
        )}
        {(showSandbox || showEventsForRole) && utilityBubblesExpanded && (
          <button type="button" className="profile-utility-bubble profile-utility-bubble--events" onClick={() => setOpenBubble(openBubble === 'events' ? null : 'events')} title="Входящие заявки">
            Заявки
          </button>
        )}
        {utilityBubblesExpanded && (
          <button type="button" className="profile-utility-bubble profile-utility-bubble--backup" onClick={() => setOpenBubble(openBubble === 'backup' ? null : 'backup')} title="Резервная копия">
            Бэкап
          </button>
        )}
        {showSandbox && utilityBubblesExpanded && (
          <button type="button" className="profile-utility-bubble profile-utility-bubble--role" onClick={() => setOpenBubble(openBubble === 'role' ? null : 'role')} title="Роль для теста">
            Роль
          </button>
        )}
        {(showSandbox || showEventsForRole) && (
          <button
            type="button"
            className="profile-utility-bubble profile-utility-bubble--expand"
            onClick={() => setUtilityBubblesExpanded((prev) => !prev)}
            aria-expanded={utilityBubblesExpanded}
            title={utilityBubblesExpanded ? 'Свернуть утилиты' : 'Развернуть утилиты'}
          >
            {utilityBubblesExpanded ? '▴' : '▾'}
          </button>
        )}
      </div>

      {openBubble && (
        <div className="profile-utility-panel-overlay" onClick={() => setOpenBubble(null)} aria-hidden="true" />
      )}
      {openBubble === 'bot' && (
        <div id="profile-unlock-bot" className="profile-utility-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-unlock-bot-title" onClick={e => e.stopPropagation()}>
          <div className="profile-utility-panel-header">
            <span id="profile-panel-unlock-bot-title">Разблокировать бота</span>
            <button type="button" className="profile-utility-panel-close" onClick={() => setOpenBubble(null)} aria-label="Закрыть"><Icons.Close /></button>
          </div>
          <div className="profile-utility-panel-body">
            <p style={{ margin: '0 0 12px', fontSize: '13px', opacity: 0.9 }}>
              ИИ-чат доступен участникам смены. Запроси код у вожатого и введи его ниже.
            </p>
            <a
              href={`https://t.me/Stivanovv?text=${encodeURIComponent(`Запрос кода верификации. Устройство: ${deviceId || '—'}. Псевдоним: ${profile?.nickname || 'Искатель'}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-gold"
              style={{ display: 'inline-block', padding: '10px 20px', marginBottom: 8 }}
            >
              Запросить код в Telegram
            </a>
            <p style={{ margin: '8px 0 0', fontSize: '12px', opacity: 0.7 }}>
              Вожатый пришлёт код — введи его в приложении для доступа к чату.
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => { setVerifyCode(e.target.value); setVerifyError(null); }}
                placeholder="Введите код"
                maxLength={12}
                style={{
                  padding: '10px 14px',
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                  width: 140,
                  textTransform: 'uppercase'
                }}
              />
              <button
                type="button"
                disabled={verifyBusy || !verifyCode.trim()}
                onClick={async () => {
                  setVerifyError(null);
                  setVerifyBusy(true);
                  try {
                    const res = await fetch('/api/auth/verify-code', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        code: verifyCode.trim(),
                        deviceId: deviceId || '',
                        campId: undefined
                      })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setVerifyError(data?.error || (res.status === 401 ? 'Неверный или истёкший код' : 'Ошибка верификации'));
                      return;
                    }
                    setAuth({
                      role: (data.role || 'participant') as import('../types/authRole').UserRole,
                      accessToken: data.accessToken,
                      campId: data.campId || undefined,
                      exp: data.exp
                    });
                    setVerifyCode('');
                    setVerifyError(null);
                  } catch (e) {
                    setVerifyError('Не удалось подключиться к серверу');
                  } finally {
                    setVerifyBusy(false);
                  }
                }}
                className="btn-primary-gold"
                style={{ padding: '10px 20px' }}
              >
                {verifyBusy ? 'Проверка...' : 'Подтвердить'}
              </button>
              {verifyError && (
                <span style={{ fontSize: 12, color: '#ff6b6b' }}>{verifyError}</span>
              )}
            </div>
          </div>
        </div>
      )}
      {openBubble === 'code' && (
        <div id="profile-generate-code" className="profile-utility-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-generate-code-title" onClick={e => e.stopPropagation()}>
          <div className="profile-utility-panel-header">
            <span id="profile-panel-generate-code-title">Сгенерировать код подтверждения <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span></span>
            <button type="button" className="profile-utility-panel-close" onClick={() => setOpenBubble(null)} aria-label="Закрыть"><Icons.Close /></button>
          </div>
          <div className="profile-utility-panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>deviceId</label>
                <input
                  type="text"
                  value={genDeviceId}
                  onChange={(e) => setGenDeviceId(e.target.value)}
                  placeholder="UUID устройства"
                  style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Роль</label>
                <select
                  value={genRole}
                  onChange={(e) => setGenRole(e.target.value as UserRole)}
                  style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                >
                  {ROLE_ORDER.filter((r) => r !== 'traveler').map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Секрет (AUTH_GENERATE_SECRET)</label>
                <input
                  type="password"
                  value={genSecret}
                  onChange={(e) => {
                    const v = e.target.value;
                    setGenSecret(v);
                    if (typeof window !== 'undefined') {
                      if (v) sessionStorage.setItem('rl_gen_secret', v);
                      else sessionStorage.removeItem('rl_gen_secret');
                    }
                  }}
                  placeholder="Введите секрет из .env"
                  style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                />
              </div>
              <button
                type="button"
                disabled={genBusy || !genDeviceId.trim() || !genSecret.trim()}
                onClick={async () => {
                  setGenError(null);
                  setGenResult(null);
                  setGenBusy(true);
                  try {
                    const res = await fetch('/api/auth/generate-code', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Generate-Code-Secret': genSecret.trim()
                      },
                      body: JSON.stringify({ deviceId: genDeviceId.trim(), role: genRole, campId: '' })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setGenError(data?.error || 'Ошибка генерации');
                      return;
                    }
                    setGenResult(data.code || '');
                  } catch (e) {
                    setGenError('Не удалось подключиться к серверу');
                  } finally {
                    setGenBusy(false);
                  }
                }}
                className="btn-primary-gold"
                style={{ padding: '10px 20px', alignSelf: 'flex-start' }}
              >
                {genBusy ? 'Генерация...' : 'Сгенерировать'}
              </button>
              {genError && <span style={{ fontSize: 12, color: '#ff6b6b' }}>{genError}</span>}
              {genResult && (
                <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.8 }}>Код:</p>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace' }}>{genResult}</p>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(genResult).then(() => showHint({ title: 'Скопировано', content: 'Код скопирован в буфер обмена' })); }}
                    className="btn-secondary"
                    style={{ marginTop: 8, padding: '8px 16px' }}
                  >
                    Копировать
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {openBubble === 'events' && (
        <div id="profile-events-panel" className="profile-utility-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-events-title" onClick={e => e.stopPropagation()}>
          <div className="profile-utility-panel-header">
            <span id="profile-panel-events-title">Входящие заявки {showSandbox ? <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span> : showEventsForRole ? <span style={{ fontSize: 11, opacity: 0.7 }}>(вожатый/орг.)</span> : null}</span>
            <button type="button" className="profile-utility-panel-close" onClick={() => setOpenBubble(null)} aria-label="Закрыть"><Icons.Close /></button>
          </div>
          <div className="profile-utility-panel-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', opacity: eventsTab === 'approvals' ? 1 : 0.7 }} onClick={() => setEventsTab('approvals')}>
                Подтверждения значков
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', opacity: eventsTab === 'legacy' ? 1 : 0.7 }} onClick={() => setEventsTab('legacy')}>
                События webhook
              </button>
            </div>

            {eventsTab === 'legacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Секрет (TELEGRAM_WEBHOOK_SECRET)</label>
                  <input
                    type="password"
                    value={eventsSecret}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEventsSecret(v);
                      if (typeof window !== 'undefined') {
                        if (v) sessionStorage.setItem('rl_events_secret', v);
                        else sessionStorage.removeItem('rl_events_secret');
                      }
                    }}
                    placeholder="Секрет для /api/webhook/confirmation-events"
                    style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                  />
                </div>
                <button
                  type="button"
                  disabled={eventsBusy || !eventsSecret.trim()}
                  onClick={() => loadEvents()}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', alignSelf: 'flex-start' }}
                >
                  {eventsBusy ? 'Загрузка...' : 'Обновить'}
                </button>
                {eventsError && (
                  <div className="profile-error profile-error--not-found" style={{ marginBottom: 12 }}>
                    {eventsError}
                    <button type="button" className="btn-secondary" style={{ marginTop: 8 }} disabled={eventsBusy} onClick={() => loadEvents()}>Повторить</button>
                  </div>
                )}
                {!eventsBusy && eventsData.length === 0 && !eventsError && (
                  <div className="profile-empty-state profile-empty-state--squads">
                    {!eventsSecret.trim() ? (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>🔐</div>
                        <p className="profile-empty-state__title">Введите секрет</p>
                        <p className="profile-empty-state__text">Введите секрет TELEGRAM_WEBHOOK_SECRET и нажмите «Обновить».</p>
                      </>
                    ) : eventsHasLoaded ? (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>📬</div>
                        <p className="profile-empty-state__title">Заявок пока нет</p>
                        <p className="profile-empty-state__text">Новые заявки появятся здесь после их отправки.</p>
                      </>
                    ) : (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>📬</div>
                        <p className="profile-empty-state__title">Загрузить заявки</p>
                        <p className="profile-empty-state__text">Нажмите «Обновить» для загрузки списка.</p>
                      </>
                    )}
                  </div>
                )}
                {eventsData.length > 0 && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8 }}>
                    {eventsData.map((ev, i) => (
                      <div key={i} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}>
                        <div style={{ opacity: 0.7 }}>{ev.userId || ev.username || '—'} · {ev.timestamp || ''}</div>
                        <div style={{ marginTop: 4, wordBreak: 'break-word' }}>{ev.text || '(пусто)'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {eventsTab === 'approvals' && (
              travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode} mode="replace">
                  <div />
                </FeatureGate>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} disabled={badgeRequestsBusy || mySquadBusy} onClick={async () => { await loadBadgeApprovalsData(); await loadMySquadInfo(); }}>
                      {badgeRequestsBusy || mySquadBusy ? 'Загрузка...' : 'Обновить'}
                    </button>
                    {canRequestApprovals && (
                      <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} disabled={approvalsSyncBusy} onClick={() => void syncApprovedLevels()}>
                        {approvalsSyncBusy ? 'Синхронизация...' : 'Синхронизировать одобрения'}
                      </button>
                    )}
                  </div>
                  {badgeRequestsError && <div className="profile-error profile-error--not-found">{badgeRequestsError}</div>}
                  {approvalsSyncStatus && <div style={{ fontSize: 12, opacity: 0.88 }}>{approvalsSyncStatus}</div>}

                  <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Мой отряд</div>
                    {!accessToken && <div style={{ fontSize: 12, opacity: 0.8 }}>Войдите по коду, чтобы привязать устройство к отряду.</div>}
                    {accessToken && (
                      <>
                        {mySquadError && <div className="profile-error profile-error--not-found" style={{ marginBottom: 8 }}>{mySquadError}</div>}
                        {mySquadInfo?.membership ? (
                          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                            <div>Смена: <strong>{mySquadInfo.shift?.name || mySquadInfo.membership.campId || '—'}</strong></div>
                            <div>Отряд: <strong>{mySquadInfo.squad?.name || mySquadInfo.membership.squadId || '—'}</strong></div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Вы пока не состоите в отряде.</div>
                        )}
                        {(role === 'participant' || role === 'developer') && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                            <input
                              type="text"
                              value={mySquadJoinId}
                              onChange={(e) => { setMySquadJoinId(e.target.value); setMySquadJoinStatus(null); }}
                              placeholder="Введите squadId"
                              style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                            />
                            <button type="button" className="btn-primary-gold" style={{ padding: '8px 14px' }} disabled={mySquadJoinBusy} onClick={() => void joinMySquadById()}>
                              {mySquadJoinBusy ? 'Вступаем...' : 'Вступить'}
                            </button>
                          </div>
                        )}
                        {mySquadJoinStatus && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>{mySquadJoinStatus}</div>}
                        {canModerateApprovals && (mySquadInfo?.participants?.length || 0) > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>Участники отряда</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                              {(mySquadInfo?.participants || []).map((p) => (
                                <div key={p.deviceId} style={{ fontSize: 12, opacity: 0.92 }}>{p.nickname || 'Без ника'} · {p.deviceId}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {canRequestApprovals && (
                    <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Мои заявки на подтверждение</div>
                      {badgeRequestsMine.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Заявок пока нет. Отправьте заявку из карточки уровня.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                          {badgeRequestsMine.map((req) => (
                            <div key={req.id} style={{ padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{req.levelId} {req.badgeTitle ? `· ${req.badgeTitle}` : ''}</div>
                              <div style={{ fontSize: 11, opacity: 0.75 }}>
                                {new Date(req.createdAt).toLocaleString('ru-RU')} · {req.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {canModerateApprovals && (
                    <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Inbox подтверждений значков</div>
                      {badgeRequestsInbox.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Входящих заявок нет.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                          {badgeRequestsInbox.map((req) => (
                            <div key={req.id} style={{ padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{req.levelId} {req.badgeTitle ? `· ${req.badgeTitle}` : ''}</div>
                              <div style={{ fontSize: 11, opacity: 0.8 }}>
                                {req.requestedBy?.nickname || req.requestedBy?.deviceId || '—'} · {req.status}
                              </div>
                              {req.evidence?.reflection && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{req.evidence.reflection}</div>}
                              {req.status === 'pending' && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    className="btn-primary-gold"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    disabled={badgeRequestsBusy}
                                    onClick={async () => {
                                      setBadgeRequestsBusy(true);
                                      setBadgeRequestsError(null);
                                      try {
                                        await approveBadgeRequest(accessToken || '', req.id);
                                        await loadBadgeApprovalsData();
                                      } catch (e) {
                                        setBadgeRequestsError(e instanceof Error ? e.message : 'Не удалось подтвердить заявку.');
                                      } finally {
                                        setBadgeRequestsBusy(false);
                                      }
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    disabled={badgeRequestsBusy}
                                    onClick={async () => {
                                      setBadgeRequestsBusy(true);
                                      setBadgeRequestsError(null);
                                      try {
                                        await rejectBadgeRequest(accessToken || '', req.id);
                                        await loadBadgeApprovalsData();
                                      } catch (e) {
                                        setBadgeRequestsError(e instanceof Error ? e.message : 'Не удалось отклонить заявку.');
                                      } finally {
                                        setBadgeRequestsBusy(false);
                                      }
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
      {openBubble === 'backup' && (
        <div className="profile-utility-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-backup-title" onClick={e => e.stopPropagation()}>
          <div className="profile-utility-panel-header">
            <span id="profile-panel-backup-title">Резервная копия</span>
            <button type="button" className="profile-utility-panel-close" onClick={() => setOpenBubble(null)} aria-label="Закрыть"><Icons.Close /></button>
          </div>
          <div className="profile-utility-panel-body">
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              Прогресс хранится на этом устройстве. Сохрани резервную копию, чтобы не потерять данные. Предложения Мастерской (Мои предложения) входят в копию.
              {lastUpdated && (
                <span style={{ display: 'block', marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Данные актуальны на {lastUpdated}
                </span>
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button type="button" onClick={() => exportData({ customBadges })} className="btn-primary-gold" style={{ minWidth: '180px' }}>Сделать резервную копию</button>
              <button type="button" onClick={() => importInputRef.current?.click()} className="btn-secondary">Восстановить из файла</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const payload = buildParentReportPayload(userData ?? null);
                  if (!payload) return;
                  const json = JSON.stringify(payload, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `putevoditel-parent-report-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  const base64 = btoa(unescape(encodeURIComponent(json)));
                  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                  const params = new URLSearchParams(window.location.search);
                  params.set('parent_view', base64url);
                  const parentViewLink = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                  if (parentViewLink.length <= 2000) {
                    navigator.clipboard?.writeText(parentViewLink).then(() => {
                      showHint({ title: 'Готово', content: 'Ссылка скопирована. Отправьте её родителю.' });
                    });
                  } else {
                    showHint({ title: 'Файл сохранён', content: 'Ссылка слишком длинная — передайте родителю файл отчёта.' });
                  }
                }}
              >
                Создать отчёт для родителя
              </button>
              {accessToken && (role === 'participant' || role === 'parent') && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={parentCodeBusy}
                  onClick={async () => {
                    const payload = buildParentReportPayload(userData ?? null);
                    if (!payload) return;
                    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
                    const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
                    const apiUrl = useLocalApi ? '/api/parent-snapshot' : `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
                    setParentCodeBusy(true);
                    setParentCodeResult(null);
                    try {
                      const res = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: JSON.stringify({ progress: payload.progress, profile: payload.profile, exportedAt: payload.exportedAt }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        if (res.status === 401) showHint({ title: 'Ошибка', content: 'Войдите как участник смены, чтобы создать код для родителя.' });
                        else showHint({ title: 'Ошибка', content: data?.error || `Ошибка ${res.status}` });
                        return;
                      }
                      if (data.parentLinkCode != null) {
                        setParentCodeResult({ parentLinkCode: data.parentLinkCode, expiresAt: data.expiresAt || 0 });
                        setShowParentCodeModal(true);
                      } else {
                        showHint({ title: 'Ошибка', content: 'Неверный ответ сервера.' });
                      }
                    } catch (e) {
                      showHint({ title: 'Ошибка', content: 'Не удалось создать код. Проверьте подключение.' });
                    } finally {
                      setParentCodeBusy(false);
                    }
                  }}
                >
                  {parentCodeBusy ? 'Создаём...' : 'Создать код для родителя'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {openBubble === 'role' && (
        <div id="profile-role-panel" className="profile-utility-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-role-title" onClick={e => e.stopPropagation()}>
          <div className="profile-utility-panel-header">
            <span id="profile-panel-role-title">Песочница: роль для теста</span>
            <button type="button" className="profile-utility-panel-close" onClick={() => setOpenBubble(null)} aria-label="Закрыть"><Icons.Close /></button>
          </div>
          <div className="profile-utility-panel-body">
            <div className="profile-sandbox-role" role="group" aria-label="Роль для теста">
              <div className="profile-sandbox-role__row">
                <span className="profile-sandbox-role__label">Роль —</span>
                <div className="profile-sandbox-role__dropdown-wrap" ref={roleDropdownRef}>
                  <button
                    type="button"
                    className="profile-sandbox-role__trigger"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    aria-expanded={roleDropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="Выбор роли"
                    id="profile-sandbox-role-trigger"
                  >
                    <span className="profile-sandbox-role__trigger-text">{ROLE_LABELS[role]}</span>
                    <span className={`profile-sandbox-role__trigger-chevron ${roleDropdownOpen ? 'is-open' : ''}`} aria-hidden>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M6 8L1 3h10z"/></svg>
                    </span>
                  </button>
                  <ul
                    className={`profile-sandbox-role__menu ${roleDropdownOpen ? 'is-open' : ''}`}
                    role="listbox"
                    aria-labelledby="profile-sandbox-role-trigger"
                    tabIndex={-1}
                  >
                    {ROLE_ORDER.map((r) => (
                      <li
                        key={r}
                        role="option"
                        aria-selected={r === role}
                        className={`profile-sandbox-role__option ${r === role ? 'is-selected' : ''}`}
                      onClick={() => { setSandboxRole(r); setRoleDropdownOpen(false); }}
                    >
                      {ROLE_LABELS[r]}
                    </li>
                  ))}
                </ul>
                </div>
              </div>
              <div className="profile-sandbox-role__current" aria-live="polite" aria-atomic="true">
                <div className="profile-sandbox-role__current-label">Сейчас:</div>
                {(() => {
                  const { title, subtitle } = getRoleDisplay(role);
                  return subtitle ? (
                    <>
                      <div className="profile-sandbox-role__title">{title}</div>
                      <div className="profile-sandbox-role__subtitle">{subtitle}</div>
                    </>
                  ) : (
                    <span className="profile-sandbox-role__title">{title}</span>
                  );
                })()}
              </div>
              {showSandbox && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>Dev login (localhost)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(['participant', 'parent', 'counselor', 'shift_leader'] as UserRole[]).map((targetRole) => (
                      <button
                        key={targetRole}
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px 12px' }}
                        disabled={devLoginBusyRole !== null}
                        onClick={() => void handleDevLoginAs(targetRole)}
                      >
                        {devLoginBusyRole === targetRole ? 'Логинимся...' : `Dev login: ${ROLE_LABELS[targetRole]}`}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '8px 12px' }}
                      disabled={devLoginBusyRole !== null}
                      onClick={clearDevLogin}
                    >
                      Dev logout
                    </button>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>JWT: {accessToken ? 'активен' : 'нет токена'}</div>
                  {devLoginError && <div className="profile-error profile-error--not-found">{devLoginError}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSpaceshipMode && (
        <button
          type="button"
          className={`profile-view-cabin-nav-toggle${cabinNavExpanded ? ' profile-view-cabin-nav-toggle--expanded' : ''}`}
          onClick={() => setCabinNavExpanded((v) => !v)}
          aria-label={cabinNavExpanded ? 'Свернуть навигацию' : 'Развернуть навигацию'}
          aria-expanded={cabinNavExpanded}
        >
          <span className={`profile-view-cabin-nav-toggle-icon profile-view-cabin-nav-toggle-icon--${cabinNavExpanded ? 'right' : 'left'}`} aria-hidden>
            {cabinNavExpanded ? <Icons.ArrowRight /> : <Icons.ArrowLeft />}
          </span>
        </button>
      )}
      <div className="profile-view-outer" ref={profileOuterRef}>
        {profileOuterContent}
      </div>

      {showRankUpOverlay && (
        <div className="proof-modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="proof-modal fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-rank-up-title" style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '8px' }}>Новый ранг</div>
            <h3 id="profile-modal-rank-up-title" className={rank.includes('Легенда') ? 'profile-view-rank--legendary' : ''} style={{ margin: '0 0 24px', color: rank.includes('Легенда') ? 'var(--legendary-accent, #b088c8)' : '#FFD700', fontSize: '22px' }}>{rank}</h3>
            <button type="button" onClick={() => markRankUpSeen(currentLevels)} className="btn-primary-gold" style={{ width: '100%' }}>Круто!</button>
          </div>
        </div>
      )}

      {planFormBadge && (
        <div className="proof-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setPlanFormBadge(null); setPlanResult(null); setPlanError(null); setPlanStep('context'); setPlanChecklistItems([]); } }}>
          <div className="proof-modal proof-modal--mobile-sheet fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-plan-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-plan-title" style={{ marginTop: 0, marginBottom: 8 }}>План получения: {planFormBadge.title}</h3>
            {planApiAvailable === false && !planResult && (
              <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
                Для работы ИИ нужен запущенный backend. Запусти: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>npm run start:backend</code>
              </div>
            )}
            {planError && (
              <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
                {planError}
                <button type="button" onClick={() => setPlanError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Скрыть</button>
              </div>
            )}
            {planResult && planStep !== 'context' ? (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{planResult.planText}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>{planResult.checklistItems.map((item, i) => <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>• {item}</li>)}</ul>
                {(!planForm.squadProgramGrid?.trim() && !planForm.campProgram3d?.trim()) && (
                  <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 12, padding: 8, background: 'rgba(255,215,0,0.08)', borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)' }}>Программа отряда и лагеря не указаны — использовалась типовая программа. Для точной привязки шагов к мероприятиям нажми «Изменить контекст» и заполни программу.</p>
                )}
                <button onClick={() => setPlanStep('context')} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} title="Добавить или изменить программу отряда/лагеря, день смены">Изменить контекст</button>
                <button onClick={async () => {
                  if (!planFormBadge) return;
                  setPlanBusy(true);
                  try {
                    const res = await fetchBadgePlan({
                      badgeId: planFormBadge.id,
                      badgeTitle: planFormBadge.title,
                      badgeLevel: planFormBadge.level,
                      badgeCriteria: planFormBadge.criteria,
                      badgeNameExplanation: planFormBadge.nameExplanation,
                      badgeSkillTips: planFormBadge.skillTips,
                      badgeConfirmation: planFormBadge.confirmation,
                      currentDay: planForm.currentDay,
                      shiftLength: planForm.shiftLength,
                      squadProgramGrid: planForm.squadProgramGrid || undefined,
                      squadPlan3d: planForm.squadPlan3d || undefined,
                      campProgram3d: planForm.campProgram3d || undefined,
                      priority: planForm.priority,
                      existingChecklist: planResult.checklistItems
                    });
                    if (res) { setPlanResult(res); setPlanStep('result'); }
                    else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
                  } catch (e) {
                    console.error('fetchBadgePlan (Дополнить):', e);
                    showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
                  } finally { setPlanBusy(false); }
                }} disabled={planBusy} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} title="Доработать план с учётом программы отряда, дня смены и мероприятий">{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
                <button onClick={() => {
                  if (!planFormBadge) return;
                  const plan: import('../types/userProgress').IBadgePlan = {
                    badgeId: planFormBadge.id,
                    status: 'pending_approval',
                    context: { currentDay: planForm.currentDay, shiftLength: planForm.shiftLength, squadProgramGrid: planForm.squadProgramGrid || undefined, squadPlan3d: planForm.squadPlan3d || undefined, campProgram3d: planForm.campProgram3d || undefined, priority: planForm.priority },
                    planText: planResult.planText,
                    checklistItems: planResult.checklistItems,
                    completedItems: [],
                    createdAt: new Date().toISOString(),
                    myPlanDraft: planForm.myPlanDraft?.trim() || undefined
                  };
                  saveBadgePlan(plan);
                  const text = `📋 План получения значка «${planFormBadge.title}»\n\n${planResult.planText}\n\nШаги:\n${planResult.checklistItems.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                  window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                  showHint({ title: 'Отправлено', content: 'План открыт в Telegram. После подтверждения вожатым нажми «Вожатый утвердил».' });
                }} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>Отправить на утверждение вожатому</button>
                <button onClick={() => {
                  if (!planFormBadge) return;
                  const plan: import('../types/userProgress').IBadgePlan = {
                    badgeId: planFormBadge.id,
                    status: 'approved',
                    context: { currentDay: planForm.currentDay, shiftLength: planForm.shiftLength, squadProgramGrid: planForm.squadProgramGrid || undefined, squadPlan3d: planForm.squadPlan3d || undefined, campProgram3d: planForm.campProgram3d || undefined, priority: planForm.priority },
                    planText: planResult.planText,
                    checklistItems: planResult.checklistItems,
                    completedItems: [],
                    createdAt: new Date().toISOString(),
                    approvedAt: new Date().toISOString(),
                    myPlanDraft: planForm.myPlanDraft?.trim() || undefined
                  };
                  saveBadgePlan(plan);
                  updateBadgePlanStatus(planFormBadge.id, 'approved');
                  showHint({ title: 'Готово', content: 'План утверждён. Отмечай выполнение шагов в карточке.' });
                  setPlanFormBadge(null);
                  setPlanResult(null);
                }} className="btn-secondary" style={{ width: '100%' }}>Вожатый утвердил</button>
              </>
            ) : planStep === 'context' && planResult ? (
              <>
                <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 12, lineHeight: 1.5 }}>Измени программу, день смены — и нажми «Дополнить», чтобы пересобрать план с учётом контекста.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Длина смены</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 21} onChange={() => setPlanForm({ ...planForm, shiftLength: 21, currentDay: Math.min(21, planForm.currentDay) })} /> 21 день</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 9} onChange={() => setPlanForm({ ...planForm, shiftLength: 9, currentDay: Math.min(9, planForm.currentDay) })} /> 9 дней</label>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>День смены (1–{planForm.shiftLength})</label>
                    <input type="number" min={1} max={planForm.shiftLength} value={planForm.currentDay} onChange={e => setPlanForm({ ...planForm, currentDay: Math.min(planForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)) })} className="w-input" style={{ width: '80px', padding: 8 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа отряда по план-сетке</label>
                    <textarea placeholder="План-сетка отряда на ближайшие дни…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadProgramGrid} onChange={e => setPlanForm({ ...planForm, squadProgramGrid: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>План вожатых на 3 дня</label>
                    <textarea placeholder="План вожатых на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadPlan3d} onChange={e => setPlanForm({ ...planForm, squadPlan3d: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа лагеря на 3 дня</label>
                    <textarea placeholder="Общая план-сетка лагеря на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.campProgram3d} onChange={e => setPlanForm({ ...planForm, campProgram3d: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Что важнее</label>
                    <select value={planForm.priority} onChange={e => setPlanForm({ ...planForm, priority: e.target.value })} className="w-input" style={{ width: '100%', padding: 10 }}>
                      <option value="squad">Программа отряда</option>
                      <option value="camp">Программа лагеря</option>
                      <option value="both">Оба равны</option>
                    </select>
                  </div>
                </div>
                <button onClick={async () => {
                  if (!planFormBadge) return;
                  setPlanBusy(true);
                  try {
                    const res = await fetchBadgePlan({
                      badgeId: planFormBadge.id,
                      badgeTitle: planFormBadge.title,
                      badgeLevel: planFormBadge.level,
                      badgeCriteria: planFormBadge.criteria,
                      badgeNameExplanation: planFormBadge.nameExplanation,
                      badgeSkillTips: planFormBadge.skillTips,
                      badgeConfirmation: planFormBadge.confirmation,
                      currentDay: planForm.currentDay,
                      shiftLength: planForm.shiftLength,
                      squadProgramGrid: planForm.squadProgramGrid || undefined,
                      squadPlan3d: planForm.squadPlan3d || undefined,
                      campProgram3d: planForm.campProgram3d || undefined,
                      priority: planForm.priority,
                      existingChecklist: planResult!.checklistItems
                    });
                    if (res) { setPlanResult(res); setPlanStep('result'); }
                    else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
                  } catch (e) {
                    console.error('fetchBadgePlan (Дополнить из контекста):', e);
                    showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
                  } finally { setPlanBusy(false); }
                }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
                <button onClick={() => setPlanStep('result')} className="btn-secondary" style={{ width: '100%' }}>Вернуться к плану</button>
              </>
            ) : planStep === 'structured' ? (
              <>
                <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 12, lineHeight: 1.5 }}>Редактируй шаги, добавляй свои, или дополни план с учётом программы смены.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {planChecklistItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <input type="text" className="w-input" value={item} onChange={e => setPlanChecklistItems(prev => { const n = [...prev]; n[i] = e.target.value; return n; })} placeholder={`Шаг ${i + 1}`} style={{ flex: 1, padding: 8 }} />
                      <button type="button" onClick={() => setPlanChecklistItems(prev => prev.filter((_, j) => j !== i))} className="btn-action-round trash" style={{ flexShrink: 0 }} title="Удалить"><Icons.Trash /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPlanChecklistItems(prev => [...prev, ''])} className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: 12 }}>+ Добавить шаг</button>
                </div>
                <button onClick={async () => {
                  if (!planFormBadge) return;
                  setPlanBusy(true);
                  try {
                    const res = await fetchBadgePlan({
                      badgeId: planFormBadge.id,
                      badgeTitle: planFormBadge.title,
                      badgeLevel: planFormBadge.level,
                      badgeCriteria: planFormBadge.criteria,
                      badgeNameExplanation: planFormBadge.nameExplanation,
                      badgeSkillTips: planFormBadge.skillTips,
                      badgeConfirmation: planFormBadge.confirmation,
                      currentDay: planForm.currentDay,
                      shiftLength: planForm.shiftLength,
                      squadProgramGrid: planForm.squadProgramGrid || undefined,
                      squadPlan3d: planForm.squadPlan3d || undefined,
                      campProgram3d: planForm.campProgram3d || undefined,
                      priority: planForm.priority,
                      userPlanDraft: planForm.myPlanDraft?.trim() || undefined,
                      existingChecklist: planChecklistItems.filter(s => s.trim()).length > 0 ? planChecklistItems.filter(s => s.trim()) : undefined
                    });
                    if (res) { setPlanResult(res); setPlanStep('result'); }
                    else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
                  } catch (e) {
                    console.error('fetchBadgePlan (Дополнить):', e);
                    showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
                  } finally { setPlanBusy(false); }
                }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
                <button onClick={() => {
                  const items = planChecklistItems.filter(s => s.trim());
                  if (items.length === 0) { showHint({ title: 'Добавь шаги', content: 'Добавь хотя бы один шаг в чек-лист.' }); return; }
                  setPlanResult({
                    planText: `Мой план:\n\n${items.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                    checklistItems: items
                  });
                  setPlanStep('result');
                }} className="btn-secondary" style={{ width: '100%' }}>Отправить без дополнения</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>Заполни контекст и напиши свои мысли — ИИ поможет структурировать и дополнить план.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Длина смены</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 21} onChange={() => setPlanForm({ ...planForm, shiftLength: 21, currentDay: Math.min(21, planForm.currentDay) })} /> 21 день</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 9} onChange={() => setPlanForm({ ...planForm, shiftLength: 9, currentDay: Math.min(9, planForm.currentDay) })} /> 9 дней</label>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>День смены (1–{planForm.shiftLength})</label>
                    <input type="number" min={1} max={planForm.shiftLength} value={planForm.currentDay} onChange={e => setPlanForm({ ...planForm, currentDay: Math.min(planForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)) })} className="w-input" style={{ width: '80px', padding: 8 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа отряда по план-сетке</label>
                    <textarea placeholder="План-сетка отряда на ближайшие дни…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadProgramGrid} onChange={e => setPlanForm({ ...planForm, squadProgramGrid: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>План вожатых на 3 дня</label>
                    <textarea placeholder="План вожатых на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadPlan3d} onChange={e => setPlanForm({ ...planForm, squadPlan3d: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа лагеря на 3 дня</label>
                    <textarea placeholder="Общая план-сетка лагеря на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.campProgram3d} onChange={e => setPlanForm({ ...planForm, campProgram3d: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Что важнее</label>
                    <select value={planForm.priority} onChange={e => setPlanForm({ ...planForm, priority: e.target.value })} className="w-input" style={{ width: '100%', padding: 10 }}>
                      <option value="squad">Программа отряда</option>
                      <option value="camp">Программа лагеря</option>
                      <option value="both">Оба равны</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Мой план</label>
                    <textarea placeholder="Как ты видишь свой путь к этому значку? Запиши мысли, идеи, первые шаги…" className="w-input" rows={3} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.myPlanDraft} onChange={e => setPlanForm({ ...planForm, myPlanDraft: e.target.value })} />
                  </div>
                </div>
                {planForm.myPlanDraft?.trim() ? (
                  <button onClick={async () => {
                    if (!planFormBadge) return;
                    setPlanBusy(true);
                    try {
                      const res = await structureUserPlan({ badgeId: planFormBadge.id, badgeTitle: planFormBadge.title, myPlanDraft: planForm.myPlanDraft.trim() });
                      if (res && res.checklistItems.length > 0) {
                        setPlanChecklistItems(res.checklistItems);
                        setPlanStep('structured');
                      } else showHint({ title: 'Ошибка API', content: 'Не удалось структурировать план. Проверь, что backend запущен: npm run start:backend' });
                    } catch (e) {
                      console.error('structureUserPlan:', e);
                      showHint({ title: 'Ошибка API', content: 'Не удалось структурировать план. Запусти backend: npm run start:backend' });
                    } finally { setPlanBusy(false); }
                  }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginTop: 16, marginBottom: 8 }}>{planBusy ? 'Структурируем…' : 'Структурировать'}</button>
                ) : (
                  <button onClick={async () => {
                    if (!planFormBadge) return;
                    setPlanBusy(true);
                    setPlanError(null);
                    try {
                      const res = await fetchBadgePlan({
                        badgeId: planFormBadge.id,
                        badgeTitle: planFormBadge.title,
                        badgeLevel: planFormBadge.level,
                        badgeCriteria: planFormBadge.criteria,
                        badgeNameExplanation: planFormBadge.nameExplanation,
                        badgeSkillTips: planFormBadge.skillTips,
                        badgeConfirmation: planFormBadge.confirmation,
                        currentDay: planForm.currentDay,
                        shiftLength: planForm.shiftLength,
                        squadProgramGrid: planForm.squadProgramGrid || undefined,
                        squadPlan3d: planForm.squadPlan3d || undefined,
                        campProgram3d: planForm.campProgram3d || undefined,
                        priority: planForm.priority
                      });
                      if (res) {
                        setPlanResult(res);
                        setPlanStep('result');
                        setPlanError(null);
                      } else {
                        setPlanError('Не удалось сгенерировать план. Убедись, что backend запущен: npm run start:backend');
                        showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать план. Убедись, что backend запущен: npm run start:backend' });
                      }
                    } catch (e) {
                      console.error('fetchBadgePlan (Сгенерировать):', e);
                      setPlanError('Не удалось сгенерировать план. Backend не отвечает или произошла ошибка сети. Запусти: npm run start:backend');
                      showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать план. Запусти backend: npm run start:backend' });
                    } finally { setPlanBusy(false); }
                  }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginTop: 16 }} title={planApiAvailable === false ? 'Backend не запущен — при клике покажем подсказку' : ''}>{planBusy ? 'Генерируем…' : 'Сгенерировать план'}</button>
                )}
              </>
            )}
            <button onClick={() => { setPlanFormBadge(null); setPlanResult(null); setPlanError(null); setPlanStep('context'); setPlanChecklistItems([]); }} style={{ width: '100%', background: 'none', border: 'none', color: 'white', marginTop: 12, cursor: 'pointer', opacity: 0.5, fontSize: 13 }}>Закрыть</button>
          </div>
        </div>
      )}

      {workshopSuccessPending && (
        <div className="proof-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { handleWorkshopSuccessOnlySave(); } }}>
          <div className="proof-modal fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-workshop-success-title" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚒️</div>
            <h3 id="profile-modal-workshop-success-title" style={{ marginTop: 0, marginBottom: 8 }}>Концепт успешно выкован!</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 20 }}>Отправить заявку вожатым в Telegram и создать карточку Созидателя?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={handleWorkshopSuccessSendTelegramAndCard} disabled={workshopBusy} className="btn-primary-gold" style={{ width: '100%' }} aria-live="polite">
                {workshopBusy ? 'ГЕНЕРИРУЕМ...' : 'Отправить в Telegram и создать карточку'}
              </button>
              <button type="button" onClick={handleWorkshopSuccessOnlySave} className="btn-secondary" style={{ width: '100%' }}>Только сохранить</button>
            </div>
          </div>
        </div>
      )}

      {initiativeModalOpen && (
        <div className="proof-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setInitiativeModalOpen(false); setInitiativeResult(null); setInitiativeError(null); } }}>
          <div className="proof-modal proof-modal--mobile-sheet fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-initiative-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-initiative-title" style={{ marginTop: 0, marginBottom: 8 }}>💡 Предложить инициативу в совет лагеря</h3>
            {initiativeError && (
              <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
                {initiativeError}
                <button type="button" onClick={() => setInitiativeError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Скрыть</button>
              </div>
            )}
            {initiativeResult ? (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{initiativeResult.initiativeText}</div>
                {initiativeResult.steps.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>{initiativeResult.steps.map((item, i) => <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>• {item}</li>)}</ul>
                )}
                <button onClick={() => {
                  const text = `💡 Инициатива в Совет Лагеря\n\n${initiativeResult.initiativeText}\n\nШаги:\n${initiativeResult.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                  navigator.clipboard.writeText(text).then(() => showHint({ title: 'Скопировано', content: 'Текст инициативы скопирован в буфер обмена.' }));
                }} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }}>Скопировать</button>
                <button onClick={() => {
                  const text = `💡 Инициатива в Совет Лагеря\n\n${initiativeResult.initiativeText}\n\nШаги:\n${initiativeResult.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                  window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                  showHint({ title: 'Открыто', content: 'Инициатива открыта в Telegram. Отправь в чат Совета или вожатым.' });
                }} className="btn-primary-gold" style={{ width: '100%' }}>Отправить в Telegram</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>Опиши идею — ИИ поможет оформить её в инициативу для Совета (суть + шаги).</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Идея / тема инициативы</label>
                    <textarea placeholder="Новая игра, мероприятие, улучшение традиций, идея от Движка…" className="w-input" rows={3} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={initiativeForm.topicDraft} onChange={e => setInitiativeForm({ ...initiativeForm, topicDraft: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>День смены</label>
                      <input type="number" min={1} max={initiativeForm.shiftLength} value={initiativeForm.currentDay} onChange={e => setInitiativeForm({ ...initiativeForm, currentDay: Math.min(initiativeForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)) })} className="w-input" style={{ width: '70px', padding: 8 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Смена</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={initiativeForm.shiftLength === 21} onChange={() => setInitiativeForm({ ...initiativeForm, shiftLength: 21, currentDay: Math.min(21, initiativeForm.currentDay) })} /> 21 дн.</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={initiativeForm.shiftLength === 9} onChange={() => setInitiativeForm({ ...initiativeForm, shiftLength: 9, currentDay: Math.min(9, initiativeForm.currentDay) })} /> 9 дн.</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа лагеря на 3 дня (по желанию)</label>
                    <textarea placeholder="План-сетка лагеря на ближайшие дни…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={initiativeForm.campProgram3d} onChange={e => setInitiativeForm({ ...initiativeForm, campProgram3d: e.target.value })} />
                  </div>
                </div>
                <button onClick={async () => {
                  if (!initiativeForm.topicDraft.trim()) { showHint({ title: 'Напиши идею', content: 'Опиши тему или идею инициативы в поле выше.' }); return; }
                  setInitiativeBusy(true);
                  setInitiativeError(null);
                  try {
                    const res = await fetchCouncilInitiative({
                      teamName: myTeam?.name,
                      topicDraft: initiativeForm.topicDraft.trim(),
                      currentDay: initiativeForm.currentDay,
                      shiftLength: initiativeForm.shiftLength,
                      campProgram3d: initiativeForm.campProgram3d.trim() || undefined
                    });
                    if (res) {
                      setInitiativeResult(res);
                      setInitiativeError(null);
                    } else {
                      setInitiativeError('Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend');
                      showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend' });
                    }
                  } catch (e) {
                    console.error('fetchCouncilInitiative:', e);
                    setInitiativeError('Ошибка сети или backend не запущен. Запусти: npm run start:backend');
                    showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать инициативу. Запусти backend: npm run start:backend' });
                  } finally {
                    setInitiativeBusy(false);
                  }
                }} disabled={initiativeBusy} className="btn-primary-gold" style={{ width: '100%', marginTop: 16 }}>{initiativeBusy ? 'Генерируем…' : 'Сгенерировать инициативу'}</button>
              </>
            )}
            <button onClick={() => { setInitiativeModalOpen(false); setInitiativeResult(null); setInitiativeError(null); }} style={{ width: '100%', background: 'none', border: 'none', color: 'white', marginTop: 12, cursor: 'pointer', opacity: 0.5, fontSize: 13 }}>Закрыть</button>
          </div>
        </div>
      )}

      {proofBadge && (
        <div className="proof-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setProofBadge(null); setProofForm({ learned: '', impact: '', link: '' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = ''); } }}>
          <div className="proof-modal fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-proof-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-proof-title" style={{ marginTop: 0, marginBottom: 4 }}>Подтверждение: {proofBadge.title}</h3>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 20, lineHeight: 1.5 }}>Опыт и рефлексия помогают зафиксировать достижение. Вожатый получит твою заявку в Telegram.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 6 }}>Чему научился(лась)?</label>
                <textarea placeholder="Чему научился(лась)? Что освоил(а)?" className="w-input" style={{ height: 72, width: '100%', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', resize: 'vertical' }} value={proofForm.learned} onChange={e => setProofForm({ ...proofForm, learned: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 6 }}>Реальный вклад</label>
                <textarea placeholder="Как повлияло на лагерь и тебя? Что изменилось?" className="w-input" style={{ height: 72, width: '100%', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', resize: 'vertical' }} value={proofForm.impact} onChange={e => setProofForm({ ...proofForm, impact: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 6 }}>Ссылка (пост, доказательство)</label>
                <input type="url" placeholder="Ссылка (посты в соцсетях лагеря, отряда, вашей страницы и т.д.)" className="w-input" style={{ width: '100%', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} value={proofForm.link} onChange={e => setProofForm({ ...proofForm, link: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 6 }}>Фото</label>
                <button type="button" onClick={() => proofPhotoInputRef.current?.click()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  📁 {proofPhotoCount > 0 ? `Выбрано ${proofPhotoCount}` : 'Загрузить фото'}
                </button>
                <input type="file" ref={proofPhotoInputRef} accept="image/*" multiple style={{ display: 'none' }} onChange={e => setProofPhotoCount(e.target.files?.length ?? 0)} />
                <p style={{ fontSize: 11, opacity: 0.65, marginTop: 6, lineHeight: 1.4 }}>После открытия Telegram прикрепите выбранные файлы вручную, если нужно. Текст и ссылка будут подставлены автоматически.</p>
              </div>
            </div>
            <button onClick={async () => {
              const hasAny = proofForm.learned.trim() || proofForm.impact.trim() || proofForm.link.trim();
              if (!hasAny && !confirm('Отправить только заголовок? Рекомендуем заполнить опыт и реальный вклад.')) return;
              const parts: string[] = [`✅ Подтверждение: ${proofBadge.title}`];
              if (proofForm.learned.trim()) parts.push(`\nЧему я научился(лась): ${proofForm.learned.trim()}`);
              if (proofForm.impact.trim()) parts.push(`\nРеальный вклад (что изменилось в лагере): ${proofForm.impact.trim()}`);
              if (proofForm.link.trim()) parts.push(`\nСсылка: ${proofForm.link.trim()}`);
              if (proofPhotoCount > 0) parts.push('\n\n(Прикрепите фото вручную в Telegram.)');
              const text = parts.join('');
              try {
                const res = await fetch('/api/telegram/notify-achievement', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    levelId: proofBadge.id,
                    levelLabel: proofBadge.title,
                    reflection: proofForm.learned.trim() || undefined,
                    impact: proofForm.impact.trim() || undefined,
                    link: proofForm.link.trim() || undefined,
                  }),
                });
                if (res.ok) {
                  showHint({ title: 'Отправлено', content: 'Заявка отправлена в канал. Вожатый получит твоё подтверждение.' });
                } else {
                  showHint({ title: 'Частично', content: 'Сообщение в канал не ушло. Открываю Telegram для ручной отправки.' });
                }
              } catch {
                showHint({ title: 'Частично', content: 'Сервер недоступен. Открываю Telegram для ручной отправки.' });
              }
              window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(text || `✅ Подтверждение: ${proofBadge.title}`)}`, '_blank', 'noopener,noreferrer');
              if (proofBadge.id && progress?.[proofBadge.id] && updateLevelEvidence) {
                const evidence: { type: 'link' | 'text'; value: string }[] = [];
                if (proofForm.learned.trim()) evidence.push({ type: 'text', value: proofForm.learned.trim() });
                if (proofForm.impact.trim()) evidence.push({ type: 'text', value: proofForm.impact.trim() });
                if (proofForm.link.trim()) evidence.push({ type: 'link', value: proofForm.link.trim() });
                if (evidence.length > 0) updateLevelEvidence(proofBadge.id, evidence);
              }
              setProofBadge(null);
              setProofForm({ learned: '', impact: '', link: '' });
              setProofPhotoCount(0);
              proofPhotoInputRef.current && (proofPhotoInputRef.current.value = '');
            }} className="btn-primary-gold" style={{ width: '100%', marginTop: 24 }}>Отправить в Telegram</button>
            <button onClick={() => { setProofBadge(null); setProofForm({ learned: '', impact: '', link: '' }); setProofPhotoCount(0); proofPhotoInputRef.current && (proofPhotoInputRef.current.value = ''); }} style={{ width: '100%', background: 'none', border: 'none', color: 'white', marginTop: 10, cursor: 'pointer', opacity: 0.5, fontSize: 13 }}>Отмена</button>
          </div>
        </div>
      )}

      {showChildBadges && (
        <div className="proof-modal-overlay" onClick={() => { setShowChildBadges(false); setChildProgressFromFile(null); setChildReportMeta(null); }}>
          <div className="proof-modal proof-modal--mobile-sheet proof-modal--wide fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-child-badges-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-child-badges-title" style={{ marginTop: 0, marginBottom: 8 }}>Значки моего ребёнка</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Ребёнок может создать отчёт по кнопке «Создать отчёт для родителя» в своём профиле и передать вам файл, ссылку или код.</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Ввести код от ребёнка</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <input
                  type="text"
                  value={parentCodeInput}
                  onChange={e => setParentCodeInput(e.target.value)}
                  placeholder="6–8 символов"
                  style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    const code = parentCodeInput.trim();
                    if (!code) return;
                    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
                    const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
                    const apiUrl = useLocalApi ? '/api/parent-snapshot' : `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
                    try {
                      const res = await fetch(`${apiUrl}?code=${encodeURIComponent(code)}`);
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        showHint({ title: 'Ошибка', content: res.status === 404 || res.status === 410 ? 'Код не найден или срок действия истёк.' : (data?.error || 'Ошибка загрузки') });
                        return;
                      }
                      if (data && typeof data.progress === 'object') {
                        setChildProgressFromFile(data.progress);
                        setChildReportMeta(data.profile?.nickname != null || data.exportedAt ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt } : null);
                        setParentCodeInput('');
                      }
                    } catch {
                      showHint({ title: 'Ошибка', content: 'Не удалось загрузить данные по коду.' });
                    }
                  }}
                >
                  Открыть
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Открыть по ссылке от ребёнка</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={parentViewLinkInput}
                  onChange={e => setParentViewLinkInput(e.target.value)}
                  placeholder="Вставьте ссылку или только parent_view=..."
                  style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const raw = parentViewLinkInput.trim();
                    if (!raw) return;
                    try {
                      const encoded = raw.startsWith('http') ? new URL(raw).searchParams.get('parent_view') : new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw).get('parent_view');
                      if (!encoded) throw new Error('Нет параметра parent_view');
                      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
                      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
                      const json = decodeURIComponent(escape(typeof atob !== 'undefined' ? atob(padded) : ''));
                      const data = JSON.parse(json) as ParentReportPayload;
                      if (!data || typeof data.progress !== 'object') throw new Error('Неверный формат');
                      setChildProgressFromFile(data.progress);
                      setChildReportMeta(data.profile?.nickname != null || data.exportedAt ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt } : null);
                      setParentViewLinkInput('');
                    } catch {
                      showHint({ title: 'Ошибка', content: 'Не удалось открыть ссылку. Проверьте, что это ссылка от ребёнка с отчётом для родителя.' });
                    }
                  }}
                >
                  Открыть
                </button>
              </div>
            </div>
            <input type="file" accept=".json,application/json" style={{ marginBottom: 12 }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const raw = reader.result as string;
                  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  const progress = data?.progress ?? data ?? {};
                  setChildProgressFromFile(progress);
                  if (data?.exportedAt != null && data?.profile != null) {
                    setChildReportMeta({ nickname: data.profile?.nickname, exportedAt: data.exportedAt });
                  } else {
                    setChildReportMeta(null);
                  }
                } catch {
                  showHint({ title: 'Ошибка', content: 'Не удалось прочитать файл. Выберите JSON-файл экспорта из профиля ребёнка.' });
                }
              };
              reader.readAsText(f);
              e.target.value = '';
            }} />
            {childProgressFromFile && (
              <div style={{ marginTop: 12 }}>
                {childReportMeta?.nickname != null || childReportMeta?.exportedAt ? (
                  <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                    Отчёт: {[childReportMeta.nickname, childReportMeta.exportedAt ? new Date(childReportMeta.exportedAt).toLocaleDateString('ru-RU') : ''].filter(Boolean).join(', ')}
                  </p>
                ) : null}
                {Object.entries(childProgressFromFile).filter(([, p]) => p?.status === 'achieved').length === 0 ? (
                  <p style={{ opacity: 0.8, fontSize: 13 }}>В этом файле нет подтверждённых достижений.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Object.entries(childProgressFromFile).filter(([, p]) => p?.status === 'achieved').map(([levelId]) => {
                      const badge = badgeLookupMap.get(getBaseId(levelId));
                      return <li key={levelId} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 14 }}>{badge?.emoji || '🏆'} {badge?.title || levelId}</li>;
                    })}
                  </ul>
                )}
              </div>
            )}
            <button type="button" onClick={() => { setShowChildBadges(false); setChildProgressFromFile(null); setChildReportMeta(null); }} style={{ marginTop: 16, padding: '8px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Закрыть</button>
          </div>
        </div>
      )}

      {showParentCodeModal && parentCodeResult && (
        <div className="proof-modal-overlay" onClick={() => { setShowParentCodeModal(false); setParentCodeResult(null); }}>
          <div className="proof-modal proof-modal--mobile-sheet proof-modal--narrow fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-parent-code-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-parent-code-title" style={{ marginTop: 0, marginBottom: 12 }}>Код для родителя</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Передайте родителю этот код или ссылку. Код действителен 7 дней.</p>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace', color: 'rgba(255,255,255,0.95)', marginBottom: 12 }}>{parentCodeResult.parentLinkCode}</div>
              {typeof window !== 'undefined' && (
                <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 8, marginBottom: 12 }}>
                  <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?parent_code=${encodeURIComponent(parentCodeResult.parentLinkCode)}`} size={160} level="M" />
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.8 }}>Ссылка: {`${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?parent_code=${parentCodeResult.parentLinkCode}`}</div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                const link = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?parent_code=${encodeURIComponent(parentCodeResult.parentLinkCode)}` : '';
                navigator.clipboard?.writeText(link).then(() => showHint({ title: 'Готово', content: 'Ссылка скопирована.' }));
              }}
            >
              Скопировать ссылку
            </button>
            <button type="button" onClick={() => { setShowParentCodeModal(false); setParentCodeResult(null); }} style={{ width: '100%', padding: '8px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Закрыть</button>
          </div>
        </div>
      )}

      {showChildRouteForm && (
        <div className="proof-modal-overlay" onClick={() => { setShowChildRouteForm(false); setChildRouteText(''); }}>
          <div className="proof-modal proof-modal--mobile-sheet proof-modal--wide fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-child-route-title" onClick={e => e.stopPropagation()}>
            <h3 id="profile-modal-child-route-title" style={{ marginTop: 0, marginBottom: 8 }}>Маршрут развития для ребёнка</h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Опишите желательные направления или значки для ребёнка — вожатый или организатор учтёт это при поддержке.</p>
            <textarea value={childRouteText} onChange={e => setChildRouteText(e.target.value)} placeholder="Например: хотелось бы, чтобы попробовал значки по лидерству и творчеству…" rows={4} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, resize: 'vertical', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`https://t.me/Stivanovv?text=${encodeURIComponent('Маршрут развития для ребёнка (от родителя):\n\n' + (childRouteText || '(родитель не указал текст)'))}`} target="_blank" rel="noopener noreferrer" className="btn-primary-gold" style={{ padding: '10px 20px', textDecoration: 'none' }}>Отправить вожатому в Telegram</a>
              <button type="button" onClick={() => { setShowChildRouteForm(false); setChildRouteText(''); }} style={{ padding: '8px 16px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div id="profile-chat-trigger" style={{ display: 'inline-block' }}>
        <Suspense fallback={null}>
          <ChatAvatar onClick={onChatToggle} isOpen={isChatOpen} />
          <ChatBot
            isOpen={isChatOpen}
            onClose={onChatClose}
            onUnlockRequest={() => document.getElementById('profile-unlock-bot')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            currentView="profile"
          />
        </Suspense>
      </div>

      <ConfirmModal
        open={disbandConfirmOpen}
        onClose={() => setDisbandConfirmOpen(false)}
        title="Распустить отряд?"
        message="Все данные отряда (название, фото, планёрка, значки) будут удалены безвозвратно."
        confirmLabel="Распустить"
        cancelLabel="Отмена"
        onConfirm={() => deleteSquad()}
        danger
      />
      <ConfirmModal
        open={showAvatarUploadConfirm}
        onClose={() => setShowAvatarUploadConfirm(false)}
        title="Аватар"
        message="Загрузить изображение?"
        confirmLabel="ДА"
        cancelLabel="Отмена"
        onConfirm={() => avatarUploadInputRef.current?.click()}
      />
    </section>
  );
};

export default ProfileView;
