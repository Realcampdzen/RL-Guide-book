import fitty, { type FittyInstance } from 'fitty';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCard } from '../components/BadgeCard';
import BadgeIcon from '../components/BadgeIcon';
import { ConfirmModal } from '../components/ConfirmModal';
import type { CounselorSquadTabId } from '../components/CounselorSquadDashboard';
import { FeatureGate } from '../components/FeatureGate';
import { ImageSourceBlock } from '../components/ImageSourceBlock';
import { InspectorMonitorCurve } from '../components/InspectorMonitorCurve';
import type { Profile4KTabId } from '../components/Profile4KDashboard';
import ProfileTabletNav from '../components/ProfileTabletNav';
import { ChildRouteModal } from '../components/profile/ChildRouteModal';
import { InitiativeModal } from '../components/profile/modals/InitiativeModal';
import type { RealDiaryTabId } from '../components/RealDiaryDashboard';
import { useAuth } from '../context/AuthContext';
import { useCounselorSquad } from '../context/CounselorSquadContext';
import { type HintStep, useHintOverlay } from '../context/HintOverlayContext';
import { getProgressStorageKey } from '../context/ProgressContext';
import { useTeam } from '../context/TeamContext';
import { useProfileForms } from '../hooks/profile/useProfileForms';
import { useProfileModals } from '../hooks/profile/useProfileModals';
import { usePermissions } from '../hooks/usePermissions';
import { useUserProgress } from '../hooks/useUserProgress';
import type { UserRole } from '../types/authRole';
import { getRoleDisplay, ROLE_LABELS, ROLE_ORDER } from '../types/authRole';
import type { Badge } from '../types/guide';
import { inspectorMissions } from '../types/inspector';
import type { ParentReportPayload } from '../types/userProgress';
import { buildParentReportPayload, getRank } from '../types/userProgress';
import { fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck } from '../utils/aiService';
import { fireOn401 } from '../utils/authStorage';
import { isParentChildReadonlyMode, PARENT_READONLY_BADGE_TEXT } from '../utils/parentReadonly';
import { forceUnlock } from '../utils/scrollLock';
import {
  generateSocialCard,
  type SocialCardResult,
  shareOrDownloadSocialCard,
} from '../utils/socialGenerator';
import { PlannerModal } from './profile/modals/PlannerModal';
import { ProofModal } from './profile/modals/ProofModal';

// --- LAZY CONTAINERS FOR BUNDLE OPTIMIZATION ---
function withSuspense<T extends React.ComponentType<any>>(LazyComponent: T) {
  return function SuspendedComponent(props: React.ComponentProps<T>) {
    return (
      <React.Suspense
        fallback={
          <div
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '30vh',
            }}
          >
            <div className="loading-spinner"></div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              Режим загрузки...
            </div>
          </div>
        }
      >
        <LazyComponent {...(props as any)} />
      </React.Suspense>
    );
  };
}

const ParentsContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/ParentsContainer').then((m) => ({
      default: m.ParentsContainer,
    }))
  )
);
const OrganizerContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/OrganizerContainer').then((m) => ({
      default: m.OrganizerContainer,
    }))
  )
);
const InspectorContainer = withSuspense(
  React.lazy(() =>
    import('./profile/containers/InspectorContainer').then((m) => ({
      default: m.InspectorContainer,
    }))
  )
);
const SquadCornerContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/SquadCornerContainer').then((m) => ({
      default: m.SquadCornerContainer,
    }))
  )
);
const BroContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/BroContainer').then((m) => ({
      default: m.BroContainer,
    }))
  )
);
const WorkshopContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/WorkshopContainer').then((m) => ({
      default: m.WorkshopContainer,
    }))
  )
);
const VozhatifikatorContainer = withSuspense(
  React.lazy(() =>
    import('../components/profile/containers/VozhatifikatorContainer').then((m) => ({
      default: m.VozhatifikatorContainer,
    }))
  )
);
const Profile4KDashboard = withSuspense(
  React.lazy(() =>
    import('../components/Profile4KDashboard').then((m) => ({ default: m.Profile4KDashboard }))
  )
);
const TeamContainer = withSuspense(
  React.lazy(() =>
    import('./profile/containers/TeamContainer').then((m) => ({ default: m.TeamContainer }))
  )
);
const RealDiaryDashboard = withSuspense(
  React.lazy(() =>
    import('../components/RealDiaryDashboard').then((m) => ({ default: m.RealDiaryDashboard }))
  )
);
const CounselorSquadDashboard = withSuspense(
  React.lazy(() =>
    import('../components/CounselorSquadDashboard').then((m) => ({
      default: m.CounselorSquadDashboard,
    }))
  )
);
const CouncilContainer = withSuspense(
  React.lazy(() =>
    import('./profile/containers/CouncilContainer').then((m) => ({ default: m.CouncilContainer }))
  )
);
const WingDashboard = withSuspense(
  React.lazy(() =>
    import('../components/WingDashboard').then((m) => ({ default: m.WingDashboard }))
  )
);
const DevPanel = withSuspense(
  React.lazy(() => import('../components/DevPanel').then((m) => ({ default: m.DevPanel })))
);
const AdminDashboard = withSuspense(
  React.lazy(() =>
    import('../components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
  )
);
const PersonalCabinet = withSuspense(
  React.lazy(() =>
    import('../components/PersonalCabinet').then((m) => ({ default: m.PersonalCabinet }))
  )
);

import { QRCodeSVG } from 'qrcode.react';
import { RoleRequestPanel as _RoleRequestPanel } from '../components/RoleRequestPanel';
import { StaffDashboardPanel } from '../components/StaffDashboardPanel';
import { VOZHATIFIKATOR_CHECKLIST_ITEMS } from '../data/vozhatifikatorChecklist';
import { syncAuthProfile } from '../utils/authProfileApi';
import {
  ApiError,
  approveBadgeRequest,
  type BadgeApprovalItem,
  type BadgeRequestItem,
  createSquadJoinRequest,
  fetchSquadCorner,
  fetchSquadPreview,
  joinSquad,
  loadBadgeRequestsInbox,
  loadMyApprovals,
  loadMyBadgeRequests,
  loadMySquad,
  loadMySquadJoinRequests,
  patchSquadCorner,
  rejectBadgeRequest,
  resolveSquadByInviteCode,
  type SquadCorner,
  type SquadJoinRequestItem,
  type SquadMineResponse,
} from '../utils/badgeApprovalApi';
import {
  type BadgePlanItem,
  fetchMyPlans,
  fetchPlansInbox,
  reviewPlan,
} from '../utils/badgePlanApi';
// ------------------------------------------------
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { pluralizeRu } from '../utils/textFormatting';
import {
  approveProposal,
  fetchMyProposals,
  fetchProposalsInbox,
  rejectProposal,
  type WorkshopProposal,
} from '../utils/workshopProposalsApi';
import '../styles/profile-view.css';

// --- ICONS ---
const Icons = {
  Star: ({ filled }: { filled?: boolean }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#FFD700' : 'none'}
      stroke={filled ? '#FFD700' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 12.27 17 17.14 18.18 21.02 12 17.77 5.82 21.02 7 17.14 2 12.27 8.91 8.26 12 2" />
    </svg>
  ),
  Trash: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Send: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Close: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Clip: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  XCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#e74c3c' : 'none'}
      stroke={filled ? '#e74c3c' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowUp: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  ),
};

const getBaseId = (rawId: string) => {
  const clean = String(rawId || '').trim();
  if (!clean) return '';
  const parts = clean.split('.').filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : clean;
};

/** Категория по умолчанию для новых значков в Кузнице Смыслов (можно переопределить через ?categoryId= в URL). */

/** При числе элементов не больше этого — показываем статический ряд без карусели (нет вращения, пустого экрана и стрелок). */
const CAROUSEL_STATIC_MAX = 3;

type Tab = 'active' | 'favorites' | 'collection' | 'journal' | 'workshop' | 'squads';
type BroTabId = 'initiation' | 'wing';
type ShareTabId = 'create-card' | 'invite';

type PanelViewId =
  | 'passport'
  | 'inspector'
  | 'profile4k'
  | 'counselor-squad'
  | 'wing'
  | 'squad-corner'
  | 'real-diary'
  | 'team'
  | 'council'
  | 'bro'
  | 'workshop'
  | 'share'
  | 'vozhatifikator'
  | 'parents';
const DEFAULT_SHIFT_NAME = 'Реальный Лагерь 2026';
const PENDING_JOIN_SQUAD_SESSION_KEY = 'rl_pending_join_squad_id';

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
  const {
    onBack,
    onNavigateToBadge,
    badges,
    ensureBadgeLoaded,
    addCustomBadge: _addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
    customBadges = [],
    communityBadges = [],
    communityPendingCount: _communityPendingCount = 0,
    communitySyncing: _communitySyncing = false,
    communityLikedIds: _communityLikedIds = new Set<string>(),
    toggleCommunityLike: _toggleCommunityLike,
    publishBadgeToCommunity,
    setCustomBadgeImage: _setCustomBadgeImage,
    onChatToggle: _onChatToggle,
    onChatClose: _onChatClose,
    isChatOpen: _isChatOpen,
    lastUpdated,
    onNavigateToRegistrationForm,
    onNavigateHome,
    onNavigateCategories,
    onNavigateAboutCamp,
    onTelegramContact,
    onOpenVk,
  } = props;
  const {
    userData,
    setNickname,
    setAvatar,
    setProfileStatus,
    setProfileBio,
    toggleFavorite,
    removeRoute,
    exportData,
    importData,
    resetProgress,
    applyApprovedLevel,
    getLevelProgress,
    markRankUpSeen,
    completeTutorial,
    isLoading,
    updateLevelStatus,
    updateBadgePlanStatus,
    updateVozhatifikatorChecklist,
    updateDiarySquad,
    setPathFavToast,
  } = useUserProgress();
  const { myTeam, generateInviteUrl } = useTeam();
  const { canUseChat, role, deviceId, accountId, setAuth, accessToken, campId } = useAuth();
  const progressStorageKey = getProgressStorageKey(accountId);
  const { activeSquadName: counselorSquadName, activeSquadCard: counselorSquadCard } =
    useCounselorSquad();
  const { can } = usePermissions(role);

  const seeOtradBlocks = can('can_see_otrad_blocks');
  const showEventsForRole = can('can_view_events');
  const canReadShiftsAndSquads = can('can_read_shifts');
  const canManageShiftsAndSquads = can('can_manage_shifts');
  const showOrganizerPanel = true;
  const travelerMode = role === 'traveler';
  const expensiveActionsAllowed = can('can_use_expensive_actions');
  const canRequestApprovals = can('can_request_approvals');
  const canSeeOwnRequests = canRequestApprovals || role === 'parent';
  const canModerateApprovals = can('can_moderate_approvals');
  const { showHint, startTutorial } = useHintOverlay();

  // ── C-1: Onboarding tutorial ────────────────────────────────────────
  // ── end onboarding ──────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('🧑‍🚀');
  const [statusInput, setStatusInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [isCabinProfileExpanded, setIsCabinProfileExpanded] = useState(false);
  const [hasTouchedCabinProfilePanel, setHasTouchedCabinProfilePanel] = useState(false);
  const [cabinNavExpanded, setCabinNavExpanded] = useState(false);
  const [mobileConsoleExpanded, setMobileConsoleExpanded] = useState(false);
  const {
    showAvatarUploadConfirm,
    setShowAvatarUploadConfirm,
    showAdminDashboard,
    setShowAdminDashboard,
    showPersonalCabinet,
    setShowPersonalCabinet,
    initiativeModalOpen,
    setInitiativeModalOpen,
  } = useProfileModals();
  const [_eduPlansInbox, _setEduPlansInbox] = useState<any[]>([]);
  const [_eduPlansLoading, _setEduPlansLoading] = useState(false);
  const [_eduReviewBusy, _setEduReviewBusy] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUploadInputRef = useRef<HTMLInputElement | null>(null);
  const profileSyncRef = useRef<{ nickname: string; avatar: string }>({ nickname: '', avatar: '' });
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1180px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1180px)');
    const handler = () => setIsTabletOrMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const {
    eduTaskForm,
    setEduTaskForm,
    showChildBadges,
    setShowChildBadges,
    childProgressFromFile,
    setChildProgressFromFile,
    childReportMeta,
    setChildReportMeta,
    showChildRouteForm,
    setShowChildRouteForm,
    childRouteText,
    setChildRouteText,
    devLoginError,
    setDevLoginError,
  } = useProfileForms();

  const [shareBusy, setShareBusy] = useState(false);
  const [shareStoryUrl, setShareStoryUrl] = useState<string | null>(null);
  const [shareWideUrl, setShareWideUrl] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareHideNickname, setShareHideNickname] = useState(false);
  const [shareStoryResult, setShareStoryResult] = useState<SocialCardResult | null>(null);
  const [shareWideResult, setShareWideResult] = useState<SocialCardResult | null>(null);

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
  const [eventsData, setEventsData] = useState<
    Array<{ userId?: string; username?: string; text?: string; timestamp?: string }>
  >([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsHasLoaded, setEventsHasLoaded] = useState(false);
  const [eventsTab, setEventsTab] = useState<'legacy' | 'approvals' | 'plans' | 'tasks'>(
    'approvals'
  );
  const [plansInbox, setPlansInbox] = useState<BadgePlanItem[]>([]);
  const [plansInboxBusy, setPlansInboxBusy] = useState(false);
  const [plansInboxError, setPlansInboxError] = useState<string | null>(null);
  const [planRejectExpandedId, setPlanRejectExpandedId] = useState<string | null>(null);
  const [planRejectNote, setPlanRejectNote] = useState('');
  const [badgeRequestsMine, setBadgeRequestsMine] = useState<BadgeRequestItem[]>([]);
  const [squadJoinRequestsMine, setSquadJoinRequestsMine] = useState<SquadJoinRequestItem[]>([]);
  const [badgeRequestsInbox, setBadgeRequestsInbox] = useState<BadgeRequestItem[]>([]);
  const [wpInbox, setWpInbox] = useState<WorkshopProposal[]>([]);
  const [wpInboxBusy, setWpInboxBusy] = useState(false);
  const [badgeRequestsBusy, setBadgeRequestsBusy] = useState(false);
  const [badgeRequestsError, setBadgeRequestsError] = useState<string | null>(null);
  const [squadJoinRequestsBusy, setSquadJoinRequestsBusy] = useState(false);
  const [squadJoinRequestsError, setSquadJoinRequestsError] = useState<string | null>(null);
  const [squadJoinRequestBusyId, setSquadJoinRequestBusyId] = useState<string | null>(null);
  const [approvalsSyncBusy, setApprovalsSyncBusy] = useState(false);
  const [approvalsSyncStatus, setApprovalsSyncStatus] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [approvalsSyncPromptDismissed, setApprovalsSyncPromptDismissed] = useState(false);
  const [rejectExpandedId, setRejectExpandedId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [evidenceExpandedId, setEvidenceExpandedId] = useState<string | null>(null);
  const [mySquadBusy, setMySquadBusy] = useState(false);
  const [mySquadError, setMySquadError] = useState<string | null>(null);
  const [mySquadInfo, setMySquadInfo] = useState<SquadMineResponse | null>(null);
  const [mySquadJoinCode, setMySquadJoinCode] = useState('');
  const [mySquadJoinId, setMySquadJoinId] = useState('');
  const [mySquadJoinBusy, setMySquadJoinBusy] = useState(false);
  const [mySquadJoinStatus, setMySquadJoinStatus] = useState<string | null>(null);
  const [devLoginBusyRole, setDevLoginBusyRole] = useState<UserRole | null>(null);

  const [squadCornerReturnToOrganizer, setSquadCornerReturnToOrganizer] = useState(false);
  const joinSquadDeepLinkRef = useRef<string | null>(null);

  const organizerApiBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal
      ? ''
      : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
  }, []);

  const getOrganizerHeaders = useCallback(
    (withJson = false): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (withJson) headers['Content-Type'] = 'application/json';
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      return headers;
    },
    [accessToken]
  );

  const formatOrganizerHttpError = useCallback(
    (status: number, payload: { error?: string; reason?: string }, context: string) => {
      const reasonText = payload?.reason ? ` (${payload.reason})` : '';
      if (status === 401) return 'Сессия истекла. Войдите снова.';
      if (status === 403) return `Недостаточно прав: ${context}.${reasonText}`;
      if (status === 500) return `${context}: ошибка сервера 500${reasonText}.`;
      return `${context}: ${payload?.error || `Ошибка ${status}`}${reasonText}`;
    },
    []
  );

  // organizer properties kept for SquadCornerContainer's create methods

  const [openBubble, setOpenBubble] = useState<
    'bot' | 'events' | 'backup' | 'code' | 'role' | 'staff-dashboard' | null
  >(null);
  const [utilityBubblesExpanded, setUtilityBubblesExpanded] = useState(false);
  useEffect(() => {
    if (utilityBubblesExpanded) return;
    if (
      openBubble === 'events' ||
      openBubble === 'backup' ||
      openBubble === 'role' ||
      openBubble === 'staff-dashboard'
    ) {
      setOpenBubble(null);
    }
  }, [utilityBubblesExpanded, openBubble]);
  const [panelActiveView, setPanelActiveView] = useState<PanelViewId | null>(null);
  const [counselorSquadActiveTab, setCounselorSquadActiveTab] =
    useState<CounselorSquadTabId>('squad');
  const [realDiaryActiveTab, setRealDiaryActiveTab] = useState<RealDiaryTabId>('diary');
  const [profile4kActiveTab, setProfile4kActiveTab] = useState<Profile4KTabId>('skills');

  const [shareActiveTab, setShareActiveTab] = useState<ShareTabId>('create-card');

  const [panelOrigin, setPanelOrigin] = useState<'left' | 'right' | 'top' | null>(null);
  const avatarWrapRef = useRef<HTMLButtonElement | null>(null);
  const centerScrollRef = useRef<HTMLDivElement | null>(null);
  const profileOuterRef = useRef<HTMLDivElement | null>(null);
  const profileAutoFitInstancesRef = useRef<FittyInstance[]>([]);
  const broTabOnOpenRef = useRef<BroTabId | null>(null);

  const openCabinPanel = useCallback(
    (viewId: PanelViewId | null, origin: 'left' | 'right' | 'top' | null) => {
      const nextViewId = panelActiveView === viewId ? null : viewId;
      setPanelOrigin(nextViewId ? origin : null);
      setPanelActiveView(nextViewId);
    },
    [panelActiveView]
  );

  const handleSquadCornerConsoleClick = useCallback(() => {
    if (panelActiveView === 'squad-corner') {
      setSquadCornerReturnToOrganizer(false);
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
      );
      setActiveTab('active');
      openCabinPanel(null, null);
      return;
    }
    setSquadCornerReturnToOrganizer(false);
    window.dispatchEvent(
      new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
    );
    openCabinPanel('squad-corner', 'left');
  }, [panelActiveView, openCabinPanel]);

  useEffect(() => {
    if (panelActiveView === 'squad-corner')
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
      );
    if (panelActiveView === 'counselor-squad') setCounselorSquadActiveTab('squad');
    if (panelActiveView === 'real-diary') setRealDiaryActiveTab('diary');
    if (panelActiveView === 'profile4k') setProfile4kActiveTab('skills');
    if (panelActiveView === 'team')
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'team', tab: 'engine' } })
      );
    if (panelActiveView === 'council')
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'council', tab: 'council' } })
      );
    if (panelActiveView === 'bro') {
      const targetTab = broTabOnOpenRef.current ?? 'initiation';
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'bro', tab: targetTab } })
      );
      broTabOnOpenRef.current = null;
    }
    if (panelActiveView === 'share') setShareActiveTab('create-card');
    if (panelActiveView === 'workshop')
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'workshop', tab: 'constructor' } })
      );
    if (panelActiveView === 'inspector')
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'inspector', tab: 'friendship' } })
      );

    forceUnlock();
  }, [panelActiveView]);

  useEffect(() => {
    if (panelActiveView !== 'squad-corner') {
      setSquadCornerReturnToOrganizer(false);
    }
  }, [panelActiveView]);

  useEffect(() => {
    const pending = (window as any)?.__OPEN_PROFILE_PANEL__ as unknown;
    if (typeof pending !== 'string' || !pending) return;
    try {
      (window as any).__OPEN_PROFILE_PANEL__ = null;
    } catch {
      // ignore
    }
    const panel = pending === 'squad-cabinet' ? 'squad-corner' : (pending as PanelViewId);
    if (panel === 'bro') {
      openCabinPanel('bro', 'right');
      return;
    }
    // Default: treat as right-origin panel.
    openCabinPanel(panel, 'right');
  }, [openCabinPanel]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  // Везде по умолчанию отдаем новую кабину, чтобы не было "мигания"
  const isSpaceshipMode = true;
  const [showRoleSelector, setShowRoleSelector] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('rl_profile_role_selector_seen') === '1'
      ? false
      : true
  );
  const [devGrantLevelId, setDevGrantLevelId] = useState('');
  const [devGrantStatus, setDevGrantStatus] = useState<'locked' | 'in_progress' | 'achieved'>(
    'achieved'
  );
  const [devGrantReflection, setDevGrantReflection] = useState('');
  const [parentViewLinkInput, setParentViewLinkInput] = useState('');
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [showParentCodeModal, setShowParentCodeModal] = useState(false);
  const [parentCodeResult, setParentCodeResult] = useState<{
    parentLinkCode: string;
    expiresAt: number;
  } | null>(null);
  const [parentCodeBusy, setParentCodeBusy] = useState(false);
  const [parentSnapshotCode, setParentSnapshotCode] = useState('');
  const isParentChildReadonlyView = isParentChildReadonlyMode({
    role,
    hasChildProgressSnapshot: showChildBadges || !!childProgressFromFile,
  });
  const [carouselRotationSteps, setCarouselRotationSteps] = useState(0);
  const [pathCarouselRotationSteps, setPathCarouselRotationSteps] = useState(0);

  const showSandbox =
    role === 'developer' ||
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('sandbox') === '1');
  const canEditSquadCorner = role === 'counselor' || (showSandbox && role === 'developer');

  const disposeProfileAutoFit = useCallback(() => {
    profileAutoFitInstancesRef.current.forEach((instance) => instance.unsubscribe());
    profileAutoFitInstancesRef.current = [];
  }, []);

  const applyProfileAutoFit = useCallback(() => {
    if (typeof window === 'undefined') return;
    const root = profileOuterRef.current;
    if (!root) return;

    disposeProfileAutoFit();

    const targets = Array.from(
      new Set(
        Array.from(root.querySelectorAll<HTMLElement>(PROFILE_AUTO_FIT_SELECTOR)).filter((el) => {
          if (!el) return false;
          const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          if (!text) return false;
          if (text.length > 96 && !el.classList.contains('profile-autofit')) return false;
          if (el.closest('.profile-autofit-ignore')) return false;
          if (el.querySelector('input, textarea, select')) return false;
          return true;
        })
      )
    );

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
  }, [applyProfileAutoFit, panelActiveView, activeTab, isSpaceshipMode]);

  useEffect(() => () => disposeProfileAutoFit(), [disposeProfileAutoFit]);

  // В кабине всегда показываем все дашборды (по спеке); в обычном профиле — по роли
  const seeOtradBlocksInView = isSpaceshipMode || seeOtradBlocks;

  const {
    profile,
    progress,
    favorites = [],
  } = userData || { profile: {}, progress: {}, favorites: [] };
  const syncProfileToServer = useCallback(
    async (nextNickname: string, nextAvatar: string) => {
      if (!accessToken) return;
      await syncAuthProfile(accessToken, {
        nickname: String(nextNickname || '').trim(),
        avatar_url: String(nextAvatar || '').trim(),
      });
    },
    [accessToken]
  );
  const saveProfileEditor = useCallback(() => {
    const nextNickname = String(nicknameInput || '').trim();
    const nextAvatar = String(avatarInput || '').trim();
    setNickname(nextNickname);
    setAvatar(nextAvatar);
    setProfileStatus(statusInput);
    setProfileBio(bioInput.trim().slice(0, 160));
    setShowProfileEditor(false);
    if (accessToken) {
      profileSyncRef.current = { nickname: nextNickname, avatar: nextAvatar };
      void syncProfileToServer(nextNickname, nextAvatar).catch(() => {});
    }
  }, [
    accessToken,
    avatarInput,
    bioInput,
    nicknameInput,
    setAvatar,
    setNickname,
    setProfileBio,
    setProfileStatus,
    statusInput,
    syncProfileToServer,
  ]);

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
  const showRankUpOverlay =
    currentLevels > lastSeenRankLevel && getRank(currentLevels) !== getRank(lastSeenRankLevel);
  const vozhCompletedCount = userData?.vozhatifikatorChecklist?.completedIds?.length ?? 0;
  const vozhProgressPercent = Math.round(
    (100 * vozhCompletedCount) / Math.max(1, VOZHATIFIKATOR_CHECKLIST_ITEMS.length)
  );
  const vozhatifikatorCardImageUrl = `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}вжтфктр-card.png`;
  const profile4kProgressPercent = Math.min(
    100,
    Math.round((profile?.stats?.totalLevelsAchieved ?? 0) * 2)
  );
  const shareProgressPercent = Math.min(
    100,
    Math.round(((profile?.stats?.totalLevelsAchieved ?? 0) / 20) * 100)
  );

  const diaryFilledDays = Object.values(userData?.diaryProgress?.entries || {}).filter((entry) =>
    Boolean(
      entry?.mainMoments ||
        entry?.memorableText ||
        entry?.morningText ||
        entry?.dayText ||
        entry?.eveningText
    )
  ).length;
  const diaryProgressPercent = Math.min(
    100,
    Math.round((100 * diaryFilledDays) / Math.max(1, userData?.diaryProgress?.currentDay ?? 1))
  );

  const squadData = userData?.diaryProgress?.squad;
  const squadSignals = [
    Boolean(squadData?.name),
    Boolean(squadData?.motto),
    Boolean(squadData?.chants),
    Boolean(squadData?.greeting),
    Boolean(squadData?.memes),
    Boolean(
      squadData?.photoCorner ||
        squadData?.photoFlag ||
        squadData?.photoSquad ||
        squadData?.photoWithCounselors
    ),
  ];
  const squadCornerProgressPercent = Math.round(
    (100 * squadSignals.filter(Boolean).length) / squadSignals.length
  );

  const counselorSquadSignals = [
    Boolean((counselorSquadCard?.name || '').trim()),
    Boolean((counselorSquadCard?.motto || '').trim()),
    Boolean((counselorSquadCard?.chants || '').trim()),
    Boolean((counselorSquadCard?.greeting || '').trim()),
    Boolean((counselorSquadCard?.memes || '').trim()),
    Boolean(
      counselorSquadCard?.photoCorner ||
        counselorSquadCard?.photoFlag ||
        counselorSquadCard?.photoSquad ||
        counselorSquadCard?.photoWithCounselors
    ),
  ];
  const counselorSquadProgressPercent = Math.round(
    (100 * counselorSquadSignals.filter(Boolean).length) / counselorSquadSignals.length
  );
  const counselorSquadNameText = (counselorSquadName || '').trim();
  const counselorSquadNavHint = counselorSquadNameText
    ? `Отряд: ${counselorSquadNameText}`
    : role === 'counselor' || role === 'educator'
      ? 'Войти по коду'
      : role === 'shift_leader' || role === 'camp_director' || role === 'developer'
        ? 'Создать отряд'
        : 'Раздел для вожатых';

  const broCompletedDeedsCount = Object.values(userData?.broProgress?.completedDeeds || {}).reduce(
    (sum, deeds) => sum + (Array.isArray(deeds) ? deeds.length : 0),
    0
  );
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
    ? Math.min(
        100,
        Math.round(
          (100 * (myTeam.achievements?.length ?? 0)) / Math.max(1, myTeam.goals?.length || 3)
        )
      )
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
    if (!accessToken) {
      profileSyncRef.current = { nickname: '', avatar: '' };
      return;
    }
    const nextNickname = String(profile?.nickname || '').trim();
    const nextAvatar = String(profile?.avatar || '').trim();
    if (!nextNickname && !nextAvatar) return;
    if (
      profileSyncRef.current.nickname === nextNickname &&
      profileSyncRef.current.avatar === nextAvatar
    )
      return;
    profileSyncRef.current = { nickname: nextNickname, avatar: nextAvatar };
    void syncProfileToServer(nextNickname, nextAvatar).catch(() => {});
  }, [accessToken, profile?.avatar, profile?.nickname, syncProfileToServer]);

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
      const res = await fetch(
        `/api/webhook/confirmation-events?secret=${encodeURIComponent(eventsSecret.trim())}&limit=20`
      );
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
      setWpInbox([]);
      setBadgeRequestsError('Сначала войдите по коду, чтобы работать с заявками.');
      setBadgeRequestsBusy(false);
      return;
    }
    setBadgeRequestsBusy(true);
    setBadgeRequestsError(null);
    try {
      const minePromise = canRequestApprovals
        ? loadMyBadgeRequests(accessToken)
        : Promise.resolve([]);
      const inboxPromise = canModerateApprovals
        ? loadBadgeRequestsInbox(accessToken)
        : Promise.resolve([]);
      const wpInboxPromise = canModerateApprovals
        ? fetchProposalsInbox(accessToken).catch(() => [] as WorkshopProposal[])
        : Promise.resolve([] as WorkshopProposal[]);
      const [mine, inbox, wpRows] = await Promise.all([minePromise, inboxPromise, wpInboxPromise]);
      setBadgeRequestsMine(mine);
      setBadgeRequestsInbox(inbox);
      setWpInbox(wpRows);
    } catch (e) {
      setBadgeRequestsError(e instanceof Error ? e.message : 'Не удалось загрузить заявки.');
      setBadgeRequestsMine([]);
      setBadgeRequestsInbox([]);
    } finally {
      setBadgeRequestsBusy(false);
    }
  }, [accessToken, canRequestApprovals, canModerateApprovals]);

  const loadMySquadJoinRequestsData = useCallback(async () => {
    if (!accessToken || !canSeeOwnRequests) {
      setSquadJoinRequestsMine([]);
      setSquadJoinRequestsError(null);
      setSquadJoinRequestsBusy(false);
      return;
    }
    setSquadJoinRequestsBusy(true);
    setSquadJoinRequestsError(null);
    try {
      const rows = await loadMySquadJoinRequests(accessToken);
      setSquadJoinRequestsMine(rows);
    } catch (e) {
      setSquadJoinRequestsMine([]);
      setSquadJoinRequestsError(
        e instanceof Error ? e.message : 'Не удалось загрузить заявки в отряды.'
      );
    } finally {
      setSquadJoinRequestsBusy(false);
    }
  }, [accessToken, canSeeOwnRequests]);

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
    return () => {
      cancelled = true;
    };
  }, [accessToken, canRequestApprovals, getLevelProgress, userData?.progress]);

  const performApprovalSync = useCallback(
    async (silent: boolean) => {
      if (!accessToken) {
        if (!silent) setApprovalsSyncStatus('Сначала войдите по коду.');
        return;
      }
      if (!silent) {
        setApprovalsSyncBusy(true);
        setApprovalsSyncStatus(null);
      }
      try {
        const approvals = await loadMyApprovals(accessToken);
        let applied = 0;
        const titles: string[] = [];
        approvals.forEach((item: BadgeApprovalItem) => {
          const levelId = String(item.levelId || '').trim();
          if (!levelId) return;
          if (getLevelProgress(levelId)?.status === 'achieved') return;
          applyApprovedLevel(levelId, item.evidence || undefined);
          applied += 1;
          if (item.badgeTitle) titles.push(item.badgeTitle);
        });
        if (!silent) {
          setApprovalsSyncStatus(
            applied > 0 ? `Синхронизировано одобрений: ${applied}.` : 'Одобренных заявок пока нет.'
          );
        }
        await loadBadgeApprovalsData();
        setPendingApprovalsCount(0);
        if (applied > 0) {
          const celebrationContent =
            applied === 1
              ? `${titles[0] || 'Уровень'} подтверждён вожатым. Загляни в коллекцию.`
              : `Подтверждены уровни: ${applied}. Открой коллекцию.`;
          startTutorial([{ title: 'Уровень получен!', content: celebrationContent }], {
            onComplete: () => setActiveTab('collection'),
          });
        }
      } catch {
        if (!silent) {
          setApprovalsSyncStatus('Не удалось синхронизировать одобрения.');
        }
      } finally {
        if (!silent) setApprovalsSyncBusy(false);
      }
    },
    [accessToken, applyApprovedLevel, getLevelProgress, loadBadgeApprovalsData, startTutorial]
  );

  const syncApprovedLevels = useCallback(() => performApprovalSync(false), [performApprovalSync]);

  const autoSyncDoneRef = useRef(false);
  useEffect(() => {
    if (autoSyncDoneRef.current) return;
    if (!accessToken || !canRequestApprovals) return;
    autoSyncDoneRef.current = true;
    void performApprovalSync(true);
  }, [accessToken, canRequestApprovals, performApprovalSync]);

  // Sync badge plan statuses from server on mount
  const autoPlanSyncRef = useRef(false);
  useEffect(() => {
    if (autoPlanSyncRef.current) return;
    if (!accessToken) return;
    autoPlanSyncRef.current = true;
    fetchMyPlans(accessToken)
      .then((plans) => {
        for (const sp of plans) {
          const localPlan = userData.badgePlans?.[sp.badgeId];
          if (!localPlan) continue;
          // Server has approved/rejected → update local
          if (sp.status === 'approved' && localPlan.status !== 'approved') {
            updateBadgePlanStatus(sp.badgeId, 'approved');
          } else if (sp.status === 'rejected' && localPlan.status !== 'rejected') {
            updateBadgePlanStatus(sp.badgeId, 'rejected');
          }
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [accessToken, userData.badgePlans, updateBadgePlanStatus]);

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

  const joinMySquadByCode = useCallback(async () => {
    const code = mySquadJoinCode.trim().toUpperCase();
    if (!code) {
      setMySquadJoinStatus('Введите код приглашения.');
      return;
    }
    if (!accessToken) {
      setMySquadJoinStatus('Сначала войдите по коду.');
      return;
    }
    setMySquadJoinBusy(true);
    setMySquadJoinStatus(null);
    try {
      const preview = await resolveSquadByInviteCode(accessToken, code);
      const confirmed = window.confirm(
        `Вступить в отряд «${preview.squadName || preview.squadId}»?`
      );
      if (!confirmed) return;
      await joinSquad(accessToken, preview.squadId, { nickname: profile.nickname });
      setMySquadJoinStatus('Вступление выполнено.');
      setMySquadJoinCode('');
      await loadMySquadInfo();
      await loadBadgeApprovalsData();
      await loadMySquadJoinRequestsData();
    } catch (e) {
      setMySquadJoinStatus(e instanceof Error ? e.message : 'Не удалось вступить в отряд.');
    } finally {
      setMySquadJoinBusy(false);
    }
  }, [
    accessToken,
    mySquadJoinCode,
    profile.nickname,
    loadMySquadInfo,
    loadBadgeApprovalsData,
    loadMySquadJoinRequestsData,
  ]);

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
      await loadMySquadJoinRequestsData();
    } catch (e) {
      setMySquadJoinStatus(e instanceof Error ? e.message : 'Не удалось вступить в отряд.');
    } finally {
      setMySquadJoinBusy(false);
    }
  }, [
    accessToken,
    mySquadJoinId,
    profile.nickname,
    loadMySquadInfo,
    loadBadgeApprovalsData,
    loadMySquadJoinRequestsData,
  ]);

  const requestJoinSquad = useCallback(
    async (squad: { id: string; name: string }) => {
      const sid = (squad.id || '').trim();
      if (!sid) return;
      if (!accessToken) {
        setMySquadJoinStatus('Сначала войдите по коду.');
        return;
      }
      if ((mySquadInfo?.membership?.squadId || '').trim() === sid) {
        setMySquadJoinStatus('Вы уже состоите в этом отряде.');
        return;
      }
      setSquadJoinRequestBusyId(sid);
      setSquadJoinRequestsError(null);
      setMySquadJoinStatus(null);
      try {
        const result = await createSquadJoinRequest(accessToken, sid, {
          nickname: profile.nickname || undefined,
        });
        if (result.status === 'already_pending') {
          setMySquadJoinStatus(`Заявка в отряд «${squad.name}» уже отправлена и ожидает решения.`);
        } else if (result.status === 'already_member') {
          setMySquadJoinStatus(`Вы уже состоите в отряде «${squad.name}».`);
        } else {
          setMySquadJoinStatus(`Заявка в отряд «${squad.name}» отправлена.`);
          showHint({
            title: 'Заявка отправлена',
            content: 'Ожидайте подтверждения в пульте управления.',
          });
        }
        await loadMySquadJoinRequestsData();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Не удалось отправить заявку в отряд.';
        setSquadJoinRequestsError(message);
        setMySquadJoinStatus(message);
      } finally {
        setSquadJoinRequestBusyId(null);
      }
    },
    [
      accessToken,
      mySquadInfo?.membership?.squadId,
      profile.nickname,
      loadMySquadJoinRequestsData,
      showHint,
    ]
  );

  const hasSquadMembership = Boolean(mySquadInfo?.membership?.squadId);
  // Staff must have a real JWT; developer can use sandbox fallback.
  const canDeleteShiftsAndSquads =
    ((role === 'shift_leader' || role === 'camp_director') && Boolean(accessToken)) ||
    (showSandbox && role === 'developer');

  const persistSquadCorner = useCallback(
    async (payload: Partial<SquadCorner>) => {
      const squadId = (mySquadInfo?.membership?.squadId || '').trim();
      if (!accessToken || !squadId) throw new Error('Сначала вступите в отряд.');
      try {
        await patchSquadCorner(accessToken, squadId, payload);
      } catch (e) {
        if (e instanceof ApiError && e.reason) {
          if (e.reason === 'not_member')
            throw new Error(
              'Вы не состоите в этом отряде. Вступите заново через «Смены и отряды».'
            );
          if (e.reason === 'camp_mismatch')
            throw new Error(
              'Смена в токене не совпадает с отрядом. Войдите снова по верному коду смены.'
            );
          if (e.reason === 'role_forbidden')
            throw new Error('Недостаточно прав для редактирования уголка.');
        }
        throw e;
      }
    },
    [accessToken, mySquadInfo?.membership?.squadId]
  );

  const resolveShiftIdForCornerCreate = useCallback(async (): Promise<string> => {
    const tokenShiftId = (campId || '').trim();
    if (tokenShiftId) return tokenShiftId;

    const res = await fetch(`${organizerApiBase}/api/shifts`, { headers: getOrganizerHeaders() });
    if (res.status === 401) {
      fireOn401();
      throw new Error('Сессия истекла. Войдите снова.');
    }

    const data = (await res.json().catch(() => ({}))) as {
      shifts?: Array<{ id: string; name: string }>;
      error?: string;
      reason?: string;
    };
    if (!res.ok) {
      throw new Error(formatOrganizerHttpError(res.status, data, 'Смены'));
    }

    const defaultShift = (data.shifts || []).find(
      (s) => (s.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase()
    );
    if (defaultShift?.id) return defaultShift.id;

    throw new Error(
      `Смена «${DEFAULT_SHIFT_NAME}» не найдена. Откройте «Смены и отряды» и создайте смену, либо войдите по коду смены (campId).`
    );
  }, [campId, organizerApiBase, getOrganizerHeaders, formatOrganizerHttpError]);

  const createSquadFromCorner = useCallback(
    async (payload: Partial<SquadCorner>) => {
      if (!accessToken) throw new Error('Войдите по коду (или Dev login), чтобы создать отряд.');
      const cornerName = (payload?.name || '').trim();
      if (!cornerName) throw new Error('Укажите название отряда.');

      const shiftId = await resolveShiftIdForCornerCreate();

      // 1) Create squad in shift
      const res = await fetch(
        `${organizerApiBase}/api/shifts/${encodeURIComponent(shiftId)}/squads`,
        {
          method: 'POST',
          headers: getOrganizerHeaders(true),
          body: JSON.stringify({ name: cornerName }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        squad?: { id: string; shiftId: string; name: string };
        error?: string;
        reason?: string;
      };
      if (!res.ok || !data?.squad?.id) {
        if (res.status === 403 && data.reason === 'camp_mismatch')
          throw new Error('Смена в токене не совпадает. Войдите по правильному коду смены.');
        throw new Error(data.error || `Не удалось создать отряд (HTTP ${res.status}).`);
      }

      const squadId = data.squad.id;

      // 2) Join
      await joinSquad(accessToken, squadId, { nickname: profile.nickname || undefined });

      // 3) Save corner
      await patchSquadCorner(accessToken, squadId, payload);

      // 4) Refresh and open cabinet
      await Promise.all([
        loadMySquadInfo(),
        loadBadgeApprovalsData(),
        loadMySquadJoinRequestsData(),
      ]);
      setActiveTab('active');
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
      );
      setSquadCornerReturnToOrganizer(false);
      openCabinPanel('squad-corner', 'left');
    },
    [
      accessToken,
      resolveShiftIdForCornerCreate,
      organizerApiBase,
      getOrganizerHeaders,
      profile.nickname,
      loadMySquadInfo,
      loadBadgeApprovalsData,
      loadMySquadJoinRequestsData,
      openCabinPanel,
    ]
  );

  const handleOpenSquadFromOrganizer = useCallback(
    async (squad: { id: string; name: string }) => {
      if (!accessToken) {
        showHint({
          title: 'Нужен вход',
          content: 'Войдите по коду, чтобы открыть кабинет отряда.',
        });
        throw new Error('Сначала войдите по коду.');
      }
      const currentSquadId = (mySquadInfo?.membership?.squadId || '').trim();
      if (currentSquadId !== squad.id) {
        const confirmed = window.confirm(`Вступить в отряд «${squad.name}» и открыть кабинет?`);
        if (!confirmed) return;
        await joinSquad(accessToken, squad.id, { nickname: profile.nickname || undefined });
        await Promise.all([
          loadMySquadInfo(),
          loadBadgeApprovalsData(),
          loadMySquadJoinRequestsData(),
        ]);
      }
      setActiveTab('active');
      window.dispatchEvent(
        new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
      );
      setSquadCornerReturnToOrganizer(true);
      openCabinPanel('squad-corner', 'left');
    },
    [
      accessToken,
      mySquadInfo?.membership?.squadId,
      profile.nickname,
      loadMySquadInfo,
      loadBadgeApprovalsData,
      loadMySquadJoinRequestsData,
      openCabinPanel,
      showHint,
    ]
  );

  const handleDevLoginAs = useCallback(
    async (targetRole: UserRole) => {
      if (!showSandbox) return;
      setDevLoginBusyRole(targetRole);
      setDevLoginError('');
      try {
        const res = await fetch('/api/dev/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: targetRole,
            deviceId: deviceId || 'dev-local',
            campId: mySquadInfo?.membership?.campId || '',
          }),
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
          exp: data.exp,
        });
      } catch (e) {
        setDevLoginError(e instanceof Error ? e.message : 'Не удалось подключиться к backend.');
      } finally {
        setDevLoginBusyRole(null);
      }
    },
    [showSandbox, deviceId, mySquadInfo?.membership?.campId, setAuth]
  );

  const clearDevLogin = useCallback(() => {
    setAuth({ role: 'developer', accessToken: undefined, campId: undefined, exp: undefined });
  }, [setAuth]);

  const setSandboxRole = useCallback(
    (nextRole: UserRole) => {
      // Sandbox: set role WITHOUT fake accessToken — let components use X-Device-Id fallback.
      // Setting accessToken=deviceId caused 401s from any API call → clearAuthStorage() → role wiped to 'traveler'.
      setAuth({ role: nextRole, accessToken: undefined, campId: undefined, exp: undefined });
    },
    [setAuth]
  );

  useEffect(() => {
    void loadMySquadInfo();
  }, [loadMySquadInfo]);

  useEffect(() => {
    void loadMySquadJoinRequestsData();
  }, [loadMySquadJoinRequestsData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dropJoinSquadQueryParam = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('join_squad')) return;
      params.delete('join_squad');
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash || ''}`
      );
    };

    const params = new URLSearchParams(window.location.search);
    const squadIdFromUrl = (params.get('join_squad') || '').trim();
    const squadIdFromSession = (
      window.sessionStorage.getItem(PENDING_JOIN_SQUAD_SESSION_KEY) || ''
    ).trim();
    const targetSquadId = squadIdFromUrl || squadIdFromSession;
    if (!targetSquadId) return;

    if (!accessToken) {
      if (squadIdFromUrl) {
        window.sessionStorage.setItem(PENDING_JOIN_SQUAD_SESSION_KEY, squadIdFromUrl);
        dropJoinSquadQueryParam();
        showHint({
          title: 'Нужен вход',
          content: 'Войдите по коду, чтобы вступить в отряд по ссылке.',
        });
      }
      return;
    }

    if (joinSquadDeepLinkRef.current === targetSquadId) return;
    joinSquadDeepLinkRef.current = targetSquadId;

    let cancelled = false;
    void (async () => {
      try {
        const preview = await fetchSquadPreview(accessToken, targetSquadId);
        if (cancelled) return;
        const targetName = (preview?.squadName || targetSquadId).trim();
        const confirmed = window.confirm(`Вступить в отряд «${targetName}»?`);
        if (!confirmed) return;
        await joinSquad(accessToken, targetSquadId, { nickname: profile.nickname || undefined });
        if (cancelled) return;
        await loadMySquadInfo();
        if (cancelled) return;
        setActiveTab('active');
        window.dispatchEvent(
          new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } })
        );
        setSquadCornerReturnToOrganizer(false);
        openCabinPanel('squad-corner', 'left');
        showHint({ title: 'Готово', content: `Вы вступили в отряд «${targetName}».` });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Не удалось вступить в отряд по ссылке.';
        showHint({ title: 'Ошибка вступления', content: message });
      } finally {
        window.sessionStorage.removeItem(PENDING_JOIN_SQUAD_SESSION_KEY);
        dropJoinSquadQueryParam();
        joinSquadDeepLinkRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, loadMySquadInfo, openCabinPanel, profile.nickname, showHint]);

  useEffect(() => {
    if (panelActiveView !== 'squad-corner') return;
    const squadId = (mySquadInfo?.membership?.squadId || '').trim();
    if (!accessToken || !squadId) return;
    let cancelled = false;
    fetchSquadCorner(accessToken, squadId)
      .then((data) => {
        if (cancelled) return;
        const corner = data?.corner || {};
        if (!corner || Object.keys(corner).length === 0) return;
        updateDiarySquad({
          name: corner.name || undefined,
          motto: corner.motto || undefined,
          chants: corner.chants || undefined,
          greeting: corner.greeting || undefined,
          memes: corner.memes || undefined,
          photoCorner: corner.photoCorner || undefined,
          photoFlag: corner.photoFlag || undefined,
          photoSquad: corner.photoSquad || undefined,
          photoWithCounselors: corner.photoWithCounselors || undefined,
          planGridA: corner.planGridA || undefined,
          planGridB: corner.planGridB || undefined,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [panelActiveView, accessToken, mySquadInfo?.membership?.squadId, updateDiarySquad]);

  useEffect(() => {
    if (openBubble !== 'events') return;
    if (eventsTab !== 'approvals') return;
    void loadBadgeApprovalsData();
    void loadMySquadJoinRequestsData();
  }, [openBubble, eventsTab, loadBadgeApprovalsData, loadMySquadJoinRequestsData]);

  useEffect(() => {
    if (openBubble !== 'events' || eventsTab !== 'approvals') return;
    if (!accessToken || !canSeeOwnRequests) return;
    const timer = window.setInterval(() => {
      void loadMySquadJoinRequestsData();
      if (canRequestApprovals) void loadBadgeApprovalsData();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [
    openBubble,
    eventsTab,
    accessToken,
    canSeeOwnRequests,
    canRequestApprovals,
    loadBadgeApprovalsData,
    loadMySquadJoinRequestsData,
  ]);

  // removed redundant isSpaceshipMode effect

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
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + '#bro'
      );
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
      setChildReportMeta(
        data.profile?.nickname != null || data.exportedAt
          ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt }
          : null
      );
      setShowChildBadges(true);
      if (role === 'parent') openCabinPanel('parents', 'right');
      params.delete('parent_view');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
      );
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
    const apiUrl = useLocalApi
      ? '/api/parent-snapshot'
      : `${(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
    fetch(`${apiUrl}?code=${encodeURIComponent(code.trim())}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 410)
            showHint({ title: 'Код не найден', content: 'Код не найден или срок действия истёк.' });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data.progress !== 'object') return;
        setChildProgressFromFile(data.progress);
        setChildReportMeta(
          data.profile?.nickname != null || data.exportedAt
            ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt }
            : null
        );
        setParentSnapshotCode(code.trim());
        setShowChildBadges(true);
        if (role === 'parent') openCabinPanel('parents', 'right');
        params.delete('parent_code');
        const qs = params.toString();
        window.history.replaceState(
          null,
          '',
          window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
        );
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
      const hasOpenWorkshopFlag =
        typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('rl_open_workshop');
      if (hasOpenWorkshopFlag) {
        if (initialHashHandledRef.current) return;
        initialHashHandledRef.current = true;
        try {
          sessionStorage.removeItem('rl_open_workshop');
        } catch {}
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
    {
      title: 'Центр управления',
      content:
        'Это твой паспорт Реального Лагеря. Здесь растёт твой Ранг и сохраняются достижения.',
      targetSelector: '#profile-passport-card',
    },
    {
      title: 'В пути',
      content:
        'Тут будут значки, которые ты выбрал в путь. Ты можешь в любой момент отправить подтверждение вожатым.',
      targetSelector: '#profile-tab-active',
    },
    {
      title: 'Коллекция',
      content:
        'Твои трофеи. Каждый завершённый значок навсегда остаётся в твоём космическом флоте.',
      targetSelector: '#profile-tab-collection',
    },
    {
      title: 'Помощь ИИ',
      content: 'Если запутаешься — спроси Валюшу. Она знает всё о требованиях к каждому значку.',
      targetSelector: '#profile-chat-trigger',
    },
    {
      title: 'Шеринг достижений',
      content: 'Здесь можно создать карточку прогресса и поделиться с друзьями.',
      targetSelector: '#profile-share-center',
    },
  ];

  const startProfileTutorial = useCallback(
    (withComplete: boolean) => {
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
    },
    [startTutorial, completeTutorial]
  );

  useEffect(() => {
    // [REDACTED/DISABLED] The global Traveler Tour in AppViewRouter now handles onboarding
    // startProfileTutorial(true);
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
        const found = badges.find(
          (b: Badge) => b.id === baseId || String(b.id).startsWith(baseId + '.')
        );
        return found?.title ?? null;
      }
      return null;
    };
    const resolveBadge = (
      baseId: string
    ): { baseId: string; title: string; categoryId: string; emoji?: string } | null => {
      const b = badgeLookupMap.get(baseId);
      if (b?.title && b?.category_id)
        return { baseId, title: b.title, categoryId: b.category_id, emoji: b.emoji };
      if (badges) {
        const found = badges.find(
          (b: Badge) => b.id === baseId || String(b.id).startsWith(baseId + '.')
        );
        if (found?.title && found?.category_id)
          return { baseId, title: found.title, categoryId: found.category_id, emoji: found.emoji };
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
    const carouselBaseIds = new Map<
      string,
      { baseId: string; title: string; categoryId: string; emoji?: string }
    >();
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
    const mission = inspectorMissions.find((m) => m.day === day) || inspectorMissions[0];
    const completed = (prog.completedTasks && prog.completedTasks[String(day)]) || [];
    return { currentDay: day, completedCount: completed.length, totalTasks: mission.tasks.length };
  }, [userData?.inspectorProgress]);

  const activeLevels = Object.entries(progress).filter(([_, p]) => p.status === 'in_progress');
  const activeBaseIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.entries(progress)
            .filter(([_, p]) => p?.status === 'in_progress')
            .map(([id]) => getBaseId(id))
        )
      ),
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
      batch.forEach((baseId) => {
        void load(baseId);
      });
      const next = offset + BATCH_SIZE;
      if (next < baseIds.length) {
        const schedule =
          typeof requestIdleCallback !== 'undefined'
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
      return (
        key === '1.16.1' ||
        key.startsWith('1.16.1.') ||
        key === '1.16.2' ||
        key.startsWith('1.16.2.')
      );
    });
  }, [progress]);
  const inspectorProgressPercent = Math.round(
    inspectorCard.totalTasks ? (100 * inspectorCard.completedCount) / inspectorCard.totalTasks : 0
  );
  const [workshopProposals, setWorkshopProposals] = useState<WorkshopProposal[]>([]);
  useEffect(() => {
    if (!hasWorkshopAccess || !accessToken) return;
    let cancelled = false;
    fetchMyProposals(accessToken)
      .then((rows) => {
        if (!cancelled) setWorkshopProposals(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasWorkshopAccess, accessToken]);
  const workshopProgressPercent = (() => {
    const total = workshopProposals.length + (customBadges?.length ?? 0);
    return Math.min(100, (hasWorkshopAccess ? 20 : 0) + Math.min(80, total * 10));
  })();
  const achievedSorted = Object.entries(progress)
    .filter(([_, p]) => p.status === 'achieved')
    .sort((a, b) => (b[1].achievedAt || '').localeCompare(a[1].achievedAt || ''));

  const isFavorite = (id: string) => favorites.some((fav) => getBaseId(fav) === getBaseId(id));

  const isImageAvatar = (v: string | undefined) =>
    v && (v.startsWith('data:') || v.startsWith('http') || v.startsWith('/'));

  const roleSelectorVisible = isSpaceshipMode && showRoleSelector && import.meta.env.DEV;
  const panelTitleMap: Record<PanelViewId, string> = {
    passport: 'Паспорт',
    inspector: 'Инспектор Пользы',
    profile4k: '4К-профиль',
    'counselor-squad': 'Вожатский отряд',
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
  const CONSOLE_SECTION_IMAGES: Record<string, string> = {
    'squad-corner': 'отрядный уголок.png',
    'real-diary': 'реальный дневник.png',
    team: 'движок.png',
    council: 'совет лагеря.png',
    bro: 'БРО.png',
    workshop: 'мастерская.png',
  };
  const baseUrl = (import.meta.env.BASE_URL || '').replace(/\/?$/, '/');
  const consoleCopy = useMemo(() => {
    const exitHint = 'Чтобы выйти, нажми на выбранный раздел ещё раз.';

    if (panelActiveView) {
      const sectionName = panelTitleMap[panelActiveView];
      const title = `Ты в разделе «${sectionName}».`;

      switch (panelActiveView) {
        case 'passport':
          return {
            title,
            meta: `Тут твой профиль: имя, аватар, ранг и прогресс. Статус и описание можно менять. ${exitHint}`,
          };
        case 'inspector':
          return {
            title,
            meta: `Инспектор Пользы: игровая система полезных дел. Прокачивает 4К и культуру заботы. ${exitHint}`,
          };
        case 'profile4k':
          return {
            title,
            meta: `4К-профиль: твой рост в креативности, коммуникации, кооперации и критическом мышлении. ${exitHint}`,
          };
        case 'wing':
          return {
            title,
            meta: `Твоё Крыло: команда для дел наставников. Здесь аватар Крыла, участие в делах и шаг к Совету. ${exitHint}`,
          };
        case 'squad-corner':
          return {
            title,
            meta: `Отрядный уголок: собери лицо отряда. Название, девиз, кричалки, мемы и фото. ${exitHint}`,
          };
        case 'counselor-squad':
          return {
            title,
            meta: `Вожатский отряд: кабинет отряда вожатых. Отряд, фото, планёрка и значки на флаг. ${exitHint}`,
          };
        case 'real-diary':
          return {
            title,
            meta: `Реальный Дневник: записывай, как прошёл день, и собирай итоги. Это твоя история смены. ${exitHint}`,
          };
        case 'team':
          return {
            title,
            meta: `Движок: команда по интересам для отрядных дел. Тут цель, участники, приглашения и достижения. ${exitHint}`,
          };
        case 'council':
          return {
            title,
            meta: `Совет Лагеря: рабочий совет идей и решений. Предлагай инициативы и доводи их до результата. ${exitHint}`,
          };
        case 'bro':
          return {
            title,
            meta: `БРО-Движение: путь будущего вожатого. Бросвящение, Бропаспорт и Бродела. ${exitHint}`,
          };
        case 'workshop':
          return {
            title,
            meta: `Мастерская (Создатель Пути): предлагай новые значки и улучшения. Доступ открывается через 1.16.1 «Путеводитель». ${exitHint}`,
          };
        case 'share':
          return {
            title,
            meta: `Шеринг: создай карточку прогресса (9:16 и 16:9) и поделись/скачай. ${exitHint}`,
          };
        case 'vozhatifikator':
          return {
            title,
            meta: `Вожатификатор: чек-лист вожатификации и книга. Отмечай пункты и смотри свой уровень. ${exitHint}`,
          };
        case 'parents':
          return {
            title,
            meta: `Для родителей: программа смены, важные факты и блоки для планирования. ${exitHint}`,
          };
        default:
          return { title, meta: `${exitHint}` };
      }
    }

    if (activeTab === 'active') {
      return {
        title: 'Ты на экране «В пути».',
        meta: 'Здесь значки, которые ты сейчас проходишь, и шаги по ним.',
      };
    }
    if (activeTab === 'favorites') {
      return {
        title: 'Ты на экране «Избранное».',
        meta: 'Здесь твои избранные значки. Можно быстро перейти и убрать лишнее.',
      };
    }
    if (activeTab === 'collection') {
      return {
        title: 'Ты на экране «Коллекция».',
        meta: 'Здесь все значки и уровни: что уже пройдено и что можно взять в путь.',
      };
    }
    if (activeTab === 'journal') {
      return {
        title: 'Ты на экране «Журнал».',
        meta: 'Здесь твои записи, заметки и итоги по смене.',
      };
    }
    if (activeTab === 'workshop') {
      return {
        title: 'Ты на экране «Мастерская».',
        meta: 'Создатель Пути: предлагай новые значки и улучшения Путеводителя (доступ через 1.16.1).',
      };
    }
    if (activeTab === 'squads') {
      return {
        title: 'Ты на экране «Смены и отряды».',
        meta: 'Список смен и отрядов. Вступление по коду, кабинет отряда.',
      };
    }

    return {
      title: 'Ты в Кабине.',
      meta: 'Выбери раздел: Инспектор, Движок, Совет, БРО, Дневник, Отрядный уголок, 4К, Вожатификатор, Вожатский отряд.',
    };
  }, [panelActiveView, activeTab]);
  const travelerGateReason =
    'Для отправки, модерации и онлайн-синхронизации войдите как участник смены по коду.';
  const openUnlockByCode = useCallback(() => {
    setOpenBubble('bot');
  }, []);

  type CompanionScreen = {
    title: string;
    subtitle: string;
    progress: number;
    action: () => void;
  };

  const companionMap: Partial<
    Record<PanelViewId, { left?: CompanionScreen; right?: CompanionScreen }>
  > = {};
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
    setInitiativeModalOpen(true);
  }, []);

  const renderPanelContent = () => (
    <>
      {panelActiveView === 'squad-corner' && (
        <SquadCornerContainer
          travelerMode={travelerMode}
          travelerGateReason={travelerGateReason}
          openUnlockByCode={openUnlockByCode}
          mySquadInfo={mySquadInfo}
          canEditSquadCorner={canEditSquadCorner}
          squadCornerReturnToOrganizer={squadCornerReturnToOrganizer}
          setSquadCornerReturnToOrganizer={setSquadCornerReturnToOrganizer}
          setActiveTab={setActiveTab}
          openCabinPanel={openCabinPanel}
          role={role}
          deviceId={deviceId}
          accessToken={accessToken}
          userData={userData}
          loadMySquadInfo={loadMySquadInfo}
          showHint={showHint}
          isSpaceshipMode={isSpaceshipMode}
          onNavigateToBadge={onNavigateToBadge}
          hasSquadMembership={hasSquadMembership}
          persistSquadCorner={persistSquadCorner}
          createSquadFromCorner={createSquadFromCorner}
        />
      )}
      {panelActiveView === 'counselor-squad' && (
        <CounselorSquadDashboard
          variant="cabin"
          activeTab={counselorSquadActiveTab}
          onTabChange={setCounselorSquadActiveTab}
          onNavigateToBadge={onNavigateToBadge}
          onShowHint={({ title, content }) => showHint({ title, content })}
        />
      )}
      {panelActiveView === 'real-diary' &&
        (travelerMode ? (
          <FeatureGate
            allowed={false}
            reason={travelerGateReason}
            ctaLabel="Разблокировать по коду"
            onCta={openUnlockByCode}
          >
            {isSpaceshipMode ? (
              <RealDiaryDashboard
                variant="cabin"
                activeTab={realDiaryActiveTab}
                onTabChange={setRealDiaryActiveTab}
                onNavigateToBadge={onNavigateToBadge}
                onScrollToInspector={() => {
                  setActiveTab('active');
                  setPanelActiveView(null);
                  setTimeout(
                    () =>
                      document
                        .getElementById('inspector-dashboard')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    100
                  );
                }}
              />
            ) : (
              <RealDiaryDashboard
                onNavigateToBadge={onNavigateToBadge}
                onScrollToInspector={() => {
                  setActiveTab('active');
                  setPanelActiveView(null);
                  setTimeout(
                    () =>
                      document
                        .getElementById('inspector-dashboard')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    100
                  );
                }}
              />
            )}
          </FeatureGate>
        ) : isSpaceshipMode ? (
          <RealDiaryDashboard
            variant="cabin"
            activeTab={realDiaryActiveTab}
            onTabChange={setRealDiaryActiveTab}
            onNavigateToBadge={onNavigateToBadge}
            onScrollToInspector={() => {
              setActiveTab('active');
              setPanelActiveView(null);
              setTimeout(
                () =>
                  document
                    .getElementById('inspector-dashboard')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                100
              );
            }}
          />
        ) : (
          <RealDiaryDashboard
            onNavigateToBadge={onNavigateToBadge}
            onScrollToInspector={() => {
              setActiveTab('active');
              setPanelActiveView(null);
              setTimeout(
                () =>
                  document
                    .getElementById('inspector-dashboard')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                100
              );
            }}
          />
        ))}
      {panelActiveView === 'team' &&
        (travelerMode ? (
          <FeatureGate
            allowed={false}
            reason={travelerGateReason}
            ctaLabel="Разблокировать по коду"
            onCta={openUnlockByCode}
          >
            {isSpaceshipMode ? (
              <TeamContainer
                variant="cabin"
                onNavigateToBadge={onNavigateToBadge}
                onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
              />
            ) : (
              <TeamContainer
                forceExpanded={false}
                onNavigateToBadge={onNavigateToBadge}
                onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
              />
            )}
          </FeatureGate>
        ) : isSpaceshipMode ? (
          <TeamContainer
            variant="cabin"
            onNavigateToBadge={onNavigateToBadge}
            onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
          />
        ) : (
          <TeamContainer
            forceExpanded={false}
            onNavigateToBadge={onNavigateToBadge}
            onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
          />
        ))}
      {panelActiveView === 'council' &&
        (travelerMode ? (
          <FeatureGate
            allowed={false}
            reason={travelerGateReason}
            ctaLabel="Разблокировать по коду"
            onCta={openUnlockByCode}
          >
            {isSpaceshipMode ? (
              <CouncilContainer
                variant="cabin"
                onNavigateToBadge={onNavigateToBadge}
                onOpenTeamPanel={() => setPanelActiveView('team')}
                onScrollToTeam={() => setPanelActiveView('team')}
                canModerate={canModerateApprovals}
              />
            ) : (
              <CouncilContainer
                onNavigateToBadge={onNavigateToBadge}
                onOpenTeamPanel={() => setPanelActiveView('team')}
                onScrollToTeam={() => setPanelActiveView('team')}
                onSuggestInitiative={openInitiativeModal}
              />
            )}
          </FeatureGate>
        ) : isSpaceshipMode ? (
          <CouncilContainer
            variant="cabin"
            onNavigateToBadge={onNavigateToBadge}
            onOpenTeamPanel={() => setPanelActiveView('team')}
            onScrollToTeam={() => setPanelActiveView('team')}
            canModerate={canModerateApprovals}
          />
        ) : (
          <CouncilContainer
            onNavigateToBadge={onNavigateToBadge}
            onOpenTeamPanel={() => setPanelActiveView('team')}
            onScrollToTeam={() => setPanelActiveView('team')}
            onSuggestInitiative={openInitiativeModal}
          />
        ))}
      {panelActiveView === 'bro' && (
        <BroContainer
          isSpaceshipMode={isSpaceshipMode}
          travelerMode={travelerMode}
          travelerGateReason={travelerGateReason}
          openUnlockByCode={openUnlockByCode}
          userData={userData}
          openInitiativeModal={openInitiativeModal}
        />
      )}
      {panelActiveView === 'passport' && (
        <div className="profile-view-passport-column">
          <div id="profile-passport-card" className="profile-view-passport-two-col">
            <div className="profile-view-passport-avatar">
              <div className="avatar-circle">
                {isImageAvatar(showProfileEditor ? avatarInput : profile.avatar) ? (
                  <img
                    src={(showProfileEditor ? avatarInput : profile.avatar) as string}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '44px' }}>
                    {(showProfileEditor ? avatarInput : profile.avatar) || '🧑‍🚀'}
                  </span>
                )}
              </div>
              {showProfileEditor && (
                <div className="profile-view-passport-avatar-buttons">
                  <ImageSourceBlock
                    context="passport_avatar"
                    value={
                      typeof avatarInput === 'string' &&
                      (avatarInput.startsWith('data:') || avatarInput.startsWith('http'))
                        ? avatarInput
                        : null
                    }
                    onChange={setAvatarInput}
                    aspect="square"
                    hidePreview
                    buttonLayout="column"
                    onGenerate={async (opts: any) =>
                      requestImageGenerate(
                        { mode: 'generate', context: 'passport', prompt: opts.prompt ?? '' },
                        accessToken ?? null
                      )
                    }
                    onProcess={async (imageBase64: any, opts: any) =>
                      requestImageGenerate(
                        {
                          mode: 'process',
                          context: 'passport',
                          imageBase64,
                          prompt: opts?.prompt ?? '',
                        },
                        accessToken ?? null
                      )
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
                      <input
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="Никнейм"
                        className="w-input"
                      />
                    </label>
                    <label className="profile-view-passport-label">
                      Направление
                      <input
                        value={statusInput}
                        maxLength={80}
                        onChange={(e) => setStatusInput(e.target.value)}
                        placeholder="Направление"
                        className="w-input"
                      />
                    </label>
                  </div>
                  <div className="profile-view-passport-divider" />
                  <label className="profile-view-passport-label profile-view-passport-label--full">
                    Сейчас делаю
                    <textarea
                      value={bioInput}
                      maxLength={160}
                      onChange={(e) => setBioInput(e.target.value)}
                      placeholder="Коротко. Одна мысль."
                      className="w-input"
                      style={{ minHeight: 80, resize: 'vertical' }}
                    />
                  </label>
                  <p className="profile-view-passport-hint">
                    Коротко. Одна мысль. Можно без точки. ({bioInput.length}/160)
                  </p>
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
              <div className="profile-view-passport-label profile-view-passport-label--full">
                Ранг
              </div>
              <div className="profile-view-passport-rank-row">
                <span>Уровень {currentLevels}</span>
                <span>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${xpPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #8B00FF, #FFD700)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
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
                    <button type="button" className="btn-primary-gold" onClick={saveProfileEditor}>
                      Сохранить
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary-gold"
                    onClick={() => setShowProfileEditor(true)}
                  >
                    Редактировать
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {panelActiveView === 'inspector' && (
        <InspectorContainer
          onOpenDiary={() => openCabinPanel('real-diary', 'left')}
          onNavigateToBadge={onNavigateToBadge}
        />
      )}
      {panelActiveView === 'profile4k' &&
        (isSpaceshipMode ? (
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
        ))}
      {panelActiveView === 'workshop' && (
        <WorkshopContainer
          accessToken={accessToken}
          hasWorkshopAccess={hasWorkshopAccess}
          showHint={showHint}
          openUnlockByCode={openUnlockByCode}
          onNavigateToBadge={onNavigateToBadge}
          setPathFavToast={setPathFavToast}
          communityBadges={communityBadges}
          customBadges={customBadges}
          publishBadgeToCommunity={publishBadgeToCommunity}
          removeCustomBadge={removeCustomBadge}
          canModerateApprovals={canModerateApprovals}
          workshopProposals={workshopProposals}
          setWorkshopProposals={setWorkshopProposals}
        />
      )}
      {panelActiveView === 'share' && (
        <div
          className="profile-view-share-row"
          role="tabpanel"
          id="share-tabpanel"
          aria-labelledby={`share-tab-${shareActiveTab}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {shareActiveTab === 'create-card' && (
            <div id="profile-share-center" className="share-center-v2">
              <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
              <h3>Шеринг достижений</h3>
              <label className="share-center-toggle">
                <input
                  type="checkbox"
                  className="share-center-toggle-input"
                  checked={shareHideNickname}
                  onChange={(e) => setShareHideNickname(e.target.checked)}
                />
                <span className="share-center-toggle-track" aria-hidden />
                <span>Скрыть ник</span>
              </label>
              <button
                onClick={async () => {
                  if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl);
                  if (shareWideUrl) URL.revokeObjectURL(shareWideUrl);
                  setShareStoryUrl(null);
                  setShareWideUrl(null);
                  setShareStoryResult(null);
                  setShareWideResult(null);
                  setShareBusy(true);
                  setShareStatus('Генерируем…');
                  try {
                    const raw = await fetchAiSlogan({
                      kind: 'progress_summary',
                      nickname: profile.nickname,
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                    });
                    const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan;
                    const pedagogy4kLine = await fetchPedagogy4k({
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                      rank,
                      nickname: profile.nickname ?? undefined,
                    });
                    const storyMemeRaw = await fetchAiSlogan({
                      kind: 'stories_reels_meme',
                      nickname: profile.nickname ?? undefined,
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                    });
                    const customStoriesLine =
                      typeof storyMemeRaw === 'string' && storyMemeRaw.trim()
                        ? storyMemeRaw.trim()
                        : undefined;
                    const vibeRaw = await fetchVibeCheck({
                      variant: 'profile',
                      rank,
                      nickname: profile.nickname ?? undefined,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                    });
                    const vibeCheck = vibeRaw
                      ? {
                          memeHeader: vibeRaw.meme_header,
                          memeText: vibeRaw.meme_text,
                          statBuff: vibeRaw.stat_buff,
                        }
                      : undefined;
                    const profilePayload = {
                      nickname: profile.nickname ?? undefined,
                      avatar: profile.avatar ?? '',
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                    };
                    const storyRes = await generateSocialCard({
                      kind: 'progress_summary',
                      profile: profilePayload,
                      format: 'story',
                      hideNickname: shareHideNickname,
                      customCaption: slogan ?? undefined,
                      customCallout: pedagogy4kLine ?? undefined,
                      customStoriesLine,
                      vibeCheck,
                      badgeCarouselItems,
                      createdAt: new Date().toISOString(),
                    });
                    const wideRes = await generateSocialCard({
                      kind: 'progress_summary',
                      profile: profilePayload,
                      format: 'wide',
                      hideNickname: shareHideNickname,
                      customCaption: slogan ?? undefined,
                      customCallout: pedagogy4kLine ?? undefined,
                      customStoriesLine,
                      vibeCheck,
                      badgeCarouselItems,
                      createdAt: new Date().toISOString(),
                    });
                    setShareStoryResult(storyRes);
                    setShareWideResult(wideRes);
                    setShareStoryUrl(URL.createObjectURL(storyRes.blob));
                    setShareWideUrl(URL.createObjectURL(wideRes.blob));
                    setShareStatus('Готово');
                  } catch (e) {
                    setShareStatus('Ошибка');
                  } finally {
                    setShareBusy(false);
                  }
                }}
                disabled={shareBusy}
                className="btn-generate"
              >
                {shareBusy ? 'Генерируем…' : 'Создать карточку'}
              </button>
              {(shareStoryUrl || shareWideUrl) && shareStoryResult && shareWideResult && (
                <div className="share-center-results">
                  {shareStatus && <div style={{ fontSize: 13, opacity: 0.9 }}>{shareStatus}</div>}
                  {shareStoryUrl && (
                    <div>
                      <button
                        type="button"
                        onClick={() => shareOrDownloadSocialCard(shareStoryResult)}
                        className="btn-secondary"
                        style={{ marginTop: 8 }}
                      >
                        Сторис: поделиться / скачать
                      </button>
                    </div>
                  )}
                  {shareWideUrl && (
                    <div>
                      <button
                        type="button"
                        onClick={() => shareOrDownloadSocialCard(shareWideResult)}
                        className="btn-secondary"
                        style={{ marginTop: 8 }}
                      >
                        Пост 16:9: поделиться / скачать
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {shareActiveTab === 'invite' && (
            <div
              id="share-section-invite"
              style={{
                padding: 20,
                background: 'rgba(77, 172, 255, 0.08)',
                borderRadius: 24,
                border: '1px solid rgba(77, 172, 255, 0.2)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Пригласить друзей</h3>
              <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                {myTeam
                  ? 'Скопируй ссылку и отправь участникам Движка.'
                  : 'Создай Движок и приглашай друзей по ссылке.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  const url = generateInviteUrl();
                  navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!'));
                }}
                style={{
                  padding: 12,
                  background: 'linear-gradient(90deg, #4dacff, #8b00ff)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Пригласить друзей
              </button>
            </div>
          )}
        </div>
      )}
      {panelActiveView === 'vozhatifikator' &&
        (isSpaceshipMode ? (
          createPortal(
            <div className="profile-spaceship-root vozhatifikator-spotlight-portal">
              <button
                type="button"
                className="vozhatifikator-spotlight-overlay"
                onClick={() => openCabinPanel(null, null)}
                aria-label="Закрыть Вожатификатор"
              />
              <div
                className="vozhatifikator-spotlight-content"
                role="dialog"
                aria-modal="true"
                aria-label="Вожатификатор"
              >
                <button
                  type="button"
                  className="vozhatifikator-spotlight-close"
                  onClick={() => openCabinPanel(null, null)}
                  aria-label="Закрыть окно"
                >
                  <Icons.Close />
                </button>

                <div
                  className="vozhatifikator-panel vozhatifikator-panel--spotlight"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <VozhatifikatorContainer
                    userData={userData}
                    updateVozhatifikatorChecklist={updateVozhatifikatorChecklist}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        ) : (
          <div
            className="profile-view-passport-row"
            role="tabpanel"
            id="vozhatifikator-tabpanel"
            style={{
              width: '100%',
              maxWidth: '900px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <VozhatifikatorContainer
              userData={userData}
              updateVozhatifikatorChecklist={updateVozhatifikatorChecklist}
            />
          </div>
        ))}
      {panelActiveView === 'parents' && role === 'parent' && (
        <ParentsContainer
          role={role}
          setShowChildBadges={setShowChildBadges}
          childProgressFromFile={childProgressFromFile}
          parentSnapshotCode={parentSnapshotCode}
          isParentChildReadonlyView={isParentChildReadonlyView}
          onOpenParentCodeModal={() => setShowParentCodeModal(true)}
          onNavigateToRegistrationForm={
            typeof onNavigateToRegistrationForm === 'function'
              ? onNavigateToRegistrationForm
              : undefined
          }
          onOpenRouteForm={() => setShowChildRouteForm(true)}
        />
      )}
    </>
  );

  const tabsNavItems = [
    { id: 'active' as const, label: 'В пути', icon: '🧭' },
    { id: 'favorites' as const, label: 'Избранное', icon: '⭐' },
    { id: 'collection' as const, label: 'Коллекция', icon: '🗂️' },
    { id: 'journal' as const, label: 'Журнал', icon: '📓' },
    ...(showOrganizerPanel ? [{ id: 'squads' as const, label: 'Смены и отряды', icon: '🏕️' }] : []),
  ] satisfies Array<{ id: Tab; label: string; icon: string }>;

  const counselorSquadTabItems = [
    { id: 'squad' as const, label: 'Отряд', icon: '🏕️' },
    { id: 'photos' as const, label: 'Фото', icon: '📷' },
    { id: 'planner' as const, label: 'Планёрка', icon: '📋' },
    { id: 'flag-badges' as const, label: 'Значки на флаг', icon: '🚩' },
  ] satisfies Array<{ id: CounselorSquadTabId; label: string; icon: string }>;

  const shareTabItems = [
    { id: 'create-card' as const, label: 'Создать карточку', icon: '📤' },
    { id: 'invite' as const, label: 'Пригласить друзей', icon: '🤝' },
  ] satisfies Array<{ id: ShareTabId; label: string; icon: string }>;

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
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderCounselorSquadTabsNav = (
    className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--counselor-squad'
  ) => (
    <div className={className} role="tablist" aria-label="Разделы Вожатского отряда">
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
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderRealDiaryTabsNav = (
    className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--real-diary'
  ) => (
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
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderProfile4kTabsNav = (
    className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--profile4k'
  ) => (
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
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  // NOTE: Cabin "Вожатификатор" uses spotlight modal with local tabs inside the panel,
  // so we don't render a global docked tablist for it.

  const renderShareTabsNav = (
    className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--share'
  ) => (
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
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderFavoritesShelf = () => (
    <div className="active-tab-content__favorites-wrap">
      <div
        className={`favorites-shelf-container${favorites.length === 0 ? ' favorites-shelf-container--empty' : ''}`}
      >
        <div className="shelf-header">Избранное ⭐</div>
        {favorites.length > 0 ? (
          favorites.length <= CAROUSEL_STATIC_MAX ? (
            <div className="shelf-carousel shelf-carousel--static" aria-label="Избранные значки">
              <div className="shelf-carousel__static-track">
                {favorites.map((id, slotIndex) => {
                  const baseId = getBaseId(id);
                  return (
                    <div
                      key={`shelf-${slotIndex}-${baseId}`}
                      className="shelf-item shelf-item--static"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToBadge(baseId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigateToBadge(baseId);
                          }
                        }}
                      >
                        <BadgeIcon
                          badgeId={baseId}
                          badgeTitle=""
                          categoryId={
                            badgeLookupMap.get(baseId)?.category_id || baseId.split('.')[0] || '1'
                          }
                          emoji={badgeLookupMap.get(baseId)?.emoji || '🏆'}
                          size="small"
                        />
                      </div>
                      <button
                        className="btn-shelf-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(baseId);
                        }}
                      >
                        <Icons.XCircle />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="shelf-carousel shelf-carousel--cylinder">
              <button
                type="button"
                className="shelf-carousel__btn shelf-carousel__btn--prev"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCarouselRotationSteps((s) => s - 1);
                }}
                aria-label="Вращать влево"
              >
                <Icons.ArrowLeft />
              </button>
              <div className="shelf-viewport shelf-viewport--cylinder">
                <div
                  className="shelf-track shelf-track--cylinder"
                  style={{
                    ['--carousel-rotation-steps' as string]: carouselRotationSteps,
                    ['--step-deg' as string]: `${360 / Math.max(1, favorites.length)}deg`,
                    ['--radius' as string]: `${(128 + 16) / (2 * Math.sin(Math.PI / Math.max(1, favorites.length)))}px`,
                  }}
                >
                  {favorites.map((id, slotIndex) => {
                    const baseId = getBaseId(id);
                    return (
                      <div
                        key={`shelf-${slotIndex}-${baseId}`}
                        className="shelf-item shelf-item--cylinder"
                        style={{ ['--slot-offset' as string]: slotIndex }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToBadge(baseId);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onNavigateToBadge(baseId);
                            }
                          }}
                        >
                          <BadgeIcon
                            badgeId={baseId}
                            badgeTitle=""
                            categoryId={
                              badgeLookupMap.get(baseId)?.category_id || baseId.split('.')[0] || '1'
                            }
                            emoji={badgeLookupMap.get(baseId)?.emoji || '🏆'}
                            size="small"
                          />
                        </div>
                        <button
                          className="btn-shelf-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(baseId);
                          }}
                        >
                          <Icons.XCircle />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="shelf-carousel__btn shelf-carousel__btn--next"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCarouselRotationSteps((s) => s + 1);
                }}
                aria-label="Вращать вправо"
              >
                <Icons.ArrowRight />
              </button>
            </div>
          )
        ) : (
          <div className="profile-empty-state profile-empty-state--hub">
            <p className="profile-empty-state__text">
              Пока нет избранных значков. Отмечай звёздочкой те значки, к которым хочешь
              возвращаться чаще — они появятся здесь.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabsPanel = (options?: { hideNav?: boolean }) => (
    <div id="profile-tabs-section" className="profile-view-tabs-section">
      <div
        className={`profile-view-tabs-shell${options?.hideNav ? ' profile-view-tabs-shell--no-nav' : ''}`}
      >
        {!options?.hideNav && renderTabsNav()}
        <div
          className="tab-pane"
          role="tabpanel"
          id="profile-tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
        >
          <div key="hub" style={{ minHeight: '1px' }}>
            {activeTab === 'active' && (
              <div className="active-tab-content fade-in">
                <div className="active-tab-content__badges-list">
                  {pathItems.length > 0 ? (
                    pathItems.length <= CAROUSEL_STATIC_MAX ? (
                      <div
                        className="path-carousel path-carousel--static"
                        aria-label="Значки в пути"
                      >
                        <div className="path-carousel__static-track">
                          {pathItems.map(({ baseId, levelId: id }, slotIndex) => {
                            const levelBadge = badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
                            const titleFromFind = badges?.find(
                              (b: Badge) =>
                                String(b.id) === id ||
                                String(b.id) === baseId ||
                                String(b.id).startsWith(baseId + '.')
                            )?.title;
                            const displayTitle =
                              levelBadge?.title ||
                              titleFromFind ||
                              (id && id.includes('.') ? `Значок ${baseId}` : id);
                            const badgeTitleForImage = levelBadge?.title || titleFromFind || '';
                            const isFav = isFavorite(baseId);
                            const hubAnchorId =
                              slotIndex === 0 ? `hub-badge-${id.replace(/\./g, '-')}` : undefined;
                            return (
                              <div
                                key={`path-slot-${slotIndex}-${baseId}`}
                                id={hubAnchorId}
                                className="path-carousel__item path-carousel__item--static"
                              >
                                <BadgeCard
                                  baseId={baseId}
                                  levelId={id}
                                  displayTitle={displayTitle}
                                  badgeTitleForImage={badgeTitleForImage}
                                  categoryId={
                                    levelBadge?.category_id || baseId.split('.')[0] || '1'
                                  }
                                  emoji={levelBadge?.emoji || '🏆'}
                                  level={levelBadge?.level}
                                  criteria={levelBadge?.criteria}
                                  howToBecome={levelBadge?.howToBecome}
                                  nameExplanation={levelBadge?.nameExplanation}
                                  skillTips={levelBadge?.skillTips}
                                  confirmation={levelBadge?.confirmation}
                                  isFav={isFav}
                                  onNavigateToBadge={onNavigateToBadge}
                                  onRemoveRoute={removeRoute}
                                  onToggleFavorite={toggleFavorite}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="path-carousel path-carousel--cylinder">
                        <button
                          type="button"
                          className="path-carousel__btn path-carousel__btn--prev"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPathCarouselRotationSteps((s) => s - 1);
                          }}
                          aria-label="Вращать влево"
                        >
                          <Icons.ArrowLeft />
                        </button>
                        <div className="path-carousel__viewport path-carousel__viewport--cylinder">
                          <div
                            className="path-carousel__track path-carousel__track--cylinder"
                            style={{
                              ['--path-rotation-steps' as string]: pathCarouselRotationSteps,
                              ['--step-deg' as string]: `${360 / Math.max(1, pathItems.length)}deg`,
                              ['--radius' as string]: `${(144 + 20) / (2 * Math.sin(Math.PI / Math.max(1, pathItems.length)))}px`,
                            }}
                          >
                            {pathItems.map(({ baseId, levelId: id }, slotIndex) => {
                              const levelBadge =
                                badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
                              const titleFromFind = badges?.find(
                                (b: Badge) =>
                                  String(b.id) === id ||
                                  String(b.id) === baseId ||
                                  String(b.id).startsWith(baseId + '.')
                              )?.title;
                              const displayTitle =
                                levelBadge?.title ||
                                titleFromFind ||
                                (id && id.includes('.') ? `Значок ${baseId}` : id);
                              const badgeTitleForImage = levelBadge?.title || titleFromFind || '';
                              const isFav = isFavorite(baseId);
                              const hubAnchorId =
                                slotIndex === 0 ? `hub-badge-${id.replace(/\./g, '-')}` : undefined;
                              return (
                                <div
                                  key={`path-slot-${slotIndex}-${baseId}`}
                                  id={hubAnchorId}
                                  className="path-carousel__item path-carousel__item--cylinder"
                                  style={{ ['--slot-offset' as string]: slotIndex }}
                                >
                                  <BadgeCard
                                    baseId={baseId}
                                    levelId={id}
                                    displayTitle={displayTitle}
                                    badgeTitleForImage={badgeTitleForImage}
                                    categoryId={
                                      levelBadge?.category_id || baseId.split('.')[0] || '1'
                                    }
                                    emoji={levelBadge?.emoji || '🏆'}
                                    level={levelBadge?.level}
                                    criteria={levelBadge?.criteria}
                                    howToBecome={levelBadge?.howToBecome}
                                    nameExplanation={levelBadge?.nameExplanation}
                                    skillTips={levelBadge?.skillTips}
                                    confirmation={levelBadge?.confirmation}
                                    isFav={isFav}
                                    onNavigateToBadge={onNavigateToBadge}
                                    onRemoveRoute={removeRoute}
                                    onToggleFavorite={toggleFavorite}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="path-carousel__btn path-carousel__btn--next"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPathCarouselRotationSteps((s) => s + 1);
                          }}
                          aria-label="Вращать вправо"
                        >
                          <Icons.ArrowRight />
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="profile-empty-state profile-empty-state--hub">
                      <p className="profile-empty-state__text">
                        Здесь будут значки, которые ты взял в путь. Открой любой значок в каталоге и
                        нажми «В путь» — или добавь в избранное, чтобы быстро возвращаться к ним.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'favorites' && (
              <div className="favorites-view fade-in">{renderFavoritesShelf()}</div>
            )}
            {activeTab === 'journal' && (
              <div className="journal-view fade-in">
                {achievedSorted.length === 0 ? (
                  <div className="profile-empty-state profile-empty-state--hub">
                    <p className="profile-empty-state__text">
                      Здесь будет история твоих подтверждений. После того как ты подтвердишь уровень
                      значка, запись с датой и размышлением появится в журнале.
                    </p>
                  </div>
                ) : (
                  achievedSorted.map(([id, p]) => (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'flex-start',
                        borderLeft: '2px solid rgba(255,255,255,0.1)',
                        paddingLeft: '20px',
                        paddingBottom: '24px',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '-7px',
                          top: '0',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#8B00FF',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                          {new Date(p.achievedAt || '').toLocaleDateString()}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {badgeLookupMap.get(getBaseId(id))?.title || id}
                        </div>
                        {p.reflection && (
                          <div style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.8 }}>
                            "{p.reflection}"
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent('profile:openBadgeProof', {
                              detail: {
                                badgeInfo: {
                                  id,
                                  title: badgeLookupMap.get(getBaseId(id))?.title || id,
                                  learned:
                                    p.reflection ||
                                    p.evidence?.find((e: { type: string }) => e.type === 'text')
                                      ?.value ||
                                    '',
                                  link:
                                    p.evidence?.find((e: { type: string }) => e.type === 'link')
                                      ?.value || '',
                                },
                              },
                            })
                          );
                        }}
                        className="btn-confirm-main"
                        style={{ flexShrink: 0, fontSize: 12 }}
                      >
                        Отправить в Telegram <Icons.Send />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'collection' && (
              <div className="collection-view fade-in">
                {achievedSorted.length === 0 ? (
                  <div className="profile-empty-state profile-empty-state--hub">
                    <p className="profile-empty-state__text">
                      Здесь будут все подтверждённые значки и уровни. Пройди условия значка и
                      подтверди достижение — он появится в коллекции.
                    </p>
                  </div>
                ) : (
                  achievedSorted.map(([id, p]) => (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                      onClick={() => onNavigateToBadge(getBaseId(id))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigateToBadge(getBaseId(id));
                        }
                      }}
                      aria-label={`Перейти к значку ${badgeLookupMap.get(getBaseId(id))?.title || id}`}
                    >
                      <BadgeIcon
                        badgeId={getBaseId(id)}
                        badgeTitle={badgeLookupMap.get(getBaseId(id))?.title || id}
                        categoryId={
                          badgeLookupMap.get(getBaseId(id))?.category_id ||
                          getBaseId(id).split('.')[0] ||
                          '1'
                        }
                        emoji={badgeLookupMap.get(getBaseId(id))?.emoji || '🏆'}
                        size="small"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>
                          {badgeLookupMap.get(getBaseId(id))?.title || id}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                          {new Date(p.achievedAt || '').toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'squads' && showOrganizerPanel && (
              <div className="squad-view fade-in">
                <OrganizerContainer
                  role={role}
                  accessToken={accessToken}
                  deviceId={deviceId}
                  canReadShiftsAndSquads={canReadShiftsAndSquads}
                  canManageShiftsAndSquads={canManageShiftsAndSquads}
                  canDeleteShiftsAndSquads={canDeleteShiftsAndSquads}
                  mySquadInfo={mySquadInfo}
                  squadJoinRequestBusyId={squadJoinRequestBusyId}
                  onRequestJoinSquad={requestJoinSquad}
                  onOpenSquadCornerFromOrganizer={() => {
                    setSquadCornerReturnToOrganizer(false);
                    setActiveTab('active');
                    window.dispatchEvent(
                      new CustomEvent('profile:openTab', {
                        detail: { panel: 'squad-corner', tab: 'squad' },
                      })
                    );
                    openCabinPanel('squad-corner', 'left');
                  }}
                  onOpenSquadFromOrganizer={handleOpenSquadFromOrganizer}
                  loadMySquadInfo={loadMySquadInfo}
                  showHint={showHint}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const profileOuterContent = isSpaceshipMode ? (
    <>
      {seeOtradBlocksInView && (
        <div className="profile-view-cabin-top-inspector-page profile-view-cabin-top-inspector-page--desktop-only">
          <button
            type="button"
            className={`profile-view-cabin-top-inspector profile-view-cabin-top-inspector--curved ${panelActiveView === 'inspector' ? 'profile-view-cabin-top-inspector--active' : ''}`}
            onClick={() => openCabinPanel('inspector', 'top')}
            aria-label="Инспектор Пользы"
            aria-pressed={panelActiveView === 'inspector'}
          >
            <InspectorMonitorCurve
              curve={false}
              strips={20}
              sag={14}
              className="profile-view-cabin-inspector-monitor"
            >
              <span className="profile-view-cabin-top-inspector__title">Инспектор Пользы</span>
              <span className="profile-view-cabin-top-inspector__subtitle">
                Игровая система полезных дел. Прокачивает 4К и культуру заботы.
              </span>
              <div className="profile-view-cabin-top-inspector__progress" aria-hidden="true">
                <div
                  className="profile-view-cabin-top-inspector__progress-bar"
                  style={{ width: `${inspectorProgressPercent}%` }}
                />
              </div>
            </InspectorMonitorCurve>
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
        <div
          className={`profile-view-cabin-left ${isCabinProfileExpanded ? 'profile-view-cabin-left--profile-expanded' : 'profile-view-cabin-left--profile-collapsed'}`}
        >
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
                  {isImageAvatar(profile.avatar) ? (
                    <img
                      src={profile.avatar}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span className="profile-view-cabin-avatar-emoji" style={{ fontSize: 44 }}>
                      {profile.avatar || '🧑‍🚀'}
                    </span>
                  )}
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
                    background:
                      'linear-gradient(145deg, rgba(10, 28, 48, 0.92), rgba(4, 12, 26, 0.92))',
                    boxShadow:
                      '0 10px 20px rgba(1, 6, 14, 0.48), 0 0 16px rgba(112, 195, 235, 0.18)',
                    color: 'rgba(238, 248, 255, 0.98)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                    padding: 0,
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
                      pointerEvents: 'none',
                    }}
                  >
                    <svg
                      width="10"
                      height="16"
                      viewBox="0 0 10 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: 'block' }}
                    >
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
                      if (accessToken) {
                        const nextNickname = String(
                          (showProfileEditor ? nicknameInput : profile?.nickname) || ''
                        ).trim();
                        const nextAvatar = String(result).trim();
                        profileSyncRef.current = { nickname: nextNickname, avatar: nextAvatar };
                        void syncProfileToServer(nextNickname, nextAvatar).catch(() => {});
                      }
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
                  maxWidth: 160,
                }}
              >
                {/* Десктоп: роль/ранг + уровень */}
                <div className="profile-view-cabin-profile--desktop-only">
                  <div
                    className={`profile-view-cabin-profile-rank ${rank.includes('Легенда') ? 'profile-view-cabin-profile-rank--legendary' : ''}`}
                  >
                    {role ? ROLE_LABELS[role] : rank}
                  </div>
                  <div className="profile-view-cabin-profile-level-row">
                    <span>Уровень {currentLevels}</span>
                  </div>
                </div>
                {/* Мобильная: никнейм + статус + био */}
                <div className="profile-view-cabin-profile--mobile-only">
                  <div
                    className={`profile-view-cabin-profile-rank ${rank.includes('Легенда') ? 'profile-view-cabin-profile-rank--legendary' : ''}`}
                  >
                    {cabinDisplayName}
                  </div>
                  <div className="profile-view-cabin-profile-level-row">{cabinStatusText}</div>
                  <div className="profile-view-cabin-profile-bio-line">{cabinBioText}</div>
                </div>
              </div>
              <div
                className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--thick"
                style={{ transform: 'translate(60px, -65px)' }}
              >
                <div
                  className="profile-view-cabin-card-progress"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
            <div
              className="profile-view-cabin-profile-meta"
              style={{ transform: 'translate(-150px, 30px)' }}
            >
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
                    <h2 className="profile-view-cabin-profile-nickname profile-autofit">
                      {cabinDisplayName}
                    </h2>
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
                    <h2 className="profile-view-cabin-profile-nickname profile-autofit">
                      {role ? ROLE_LABELS[role] : rank}
                    </h2>
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
                background:
                  'linear-gradient(145deg, rgba(10, 28, 48, 0.92), rgba(4, 12, 26, 0.92))',
                boxShadow: '0 10px 20px rgba(1, 6, 14, 0.48), 0 0 16px rgba(112, 195, 235, 0.18)',
                color: 'rgba(238, 248, 255, 0.98)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
                padding: 0,
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
                  pointerEvents: 'none',
                }}
              >
                <svg
                  width="10"
                  height="16"
                  viewBox="0 0 10 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: 'block' }}
                >
                  <circle cx="5" cy="3" r="1.5" fill="currentColor" opacity={0.95} />
                  <circle cx="5" cy="8" r="1.5" fill="currentColor" opacity={0.95} />
                  <circle cx="5" cy="13" r="1.5" fill="currentColor" opacity={0.95} />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div className="profile-view-cabin-center-wrap">
          <div
            className={`profile-view-cabin-center profile-view-cabin-center--offset ${panelActiveView === null ? 'profile-view-cabin-center--hub' : ''} ${panelActiveView === 'squad-corner' ? 'profile-view-cabin-center--squad-corner' : ''} ${panelActiveView === 'real-diary' ? 'profile-view-cabin-center--real-diary' : ''} ${panelActiveView === 'profile4k' ? 'profile-view-cabin-center--profile4k' : ''} ${panelActiveView === 'team' ? 'profile-view-cabin-center--team' : ''} ${panelActiveView === 'council' ? 'profile-view-cabin-center--council' : ''} ${panelActiveView === 'bro' ? 'profile-view-cabin-center--bro' : ''} ${panelActiveView === 'vozhatifikator' ? 'profile-view-cabin-center--vozhatifikator' : ''} ${panelActiveView === 'counselor-squad' ? 'profile-view-cabin-center--counselor-squad' : ''} ${panelActiveView === 'share' ? 'profile-view-cabin-center--share' : ''} ${panelActiveView === 'workshop' ? 'profile-view-cabin-center--workshop' : ''} ${panelActiveView === 'inspector' ? 'profile-view-cabin-center--inspector' : ''}`}
          >
            {(panelActiveView === null ||
              panelActiveView === 'squad-corner' ||
              panelActiveView === 'real-diary' ||
              panelActiveView === 'profile4k' ||
              panelActiveView === 'team' ||
              panelActiveView === 'council' ||
              panelActiveView === 'bro' ||
              panelActiveView === 'vozhatifikator' ||
              panelActiveView === 'counselor-squad' ||
              panelActiveView === 'share' ||
              panelActiveView === 'workshop' ||
              panelActiveView === 'inspector') && (
              <div id="profile-dock-container" className="profile-view-cabin-tabs-docked">
                {panelActiveView === null
                  ? renderTabsNav('profile-tabs-nav profile-tabs-nav--docked')
                  : panelActiveView === 'real-diary'
                    ? renderRealDiaryTabsNav(
                        'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--real-diary'
                      )
                    : panelActiveView === 'profile4k'
                      ? renderProfile4kTabsNav(
                          'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--profile4k'
                        )
                      : panelActiveView === 'counselor-squad'
                        ? renderCounselorSquadTabsNav(
                            'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--counselor-squad'
                          )
                        : panelActiveView === 'share'
                          ? renderShareTabsNav(
                              'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--share'
                            )
                          : null}
              </div>
            )}
            <div
              className={`profile-view-cabin-center-shell ${panelCompanions ? 'profile-view-cabin-center-shell--companions' : ''}`}
              style={{ background: 'transparent' }}
            >
              {panelCompanions?.left && (
                <aside className="profile-view-cabin-side-screen profile-view-cabin-side-screen--left">
                  <p className="profile-view-cabin-side-screen__label">Ветка раздела</p>
                  <button
                    type="button"
                    className="profile-view-cabin-side-screen__btn"
                    onClick={panelCompanions.left.action}
                  >
                    <span>{panelCompanions.left.title}</span>
                    <small>{panelCompanions.left.subtitle}</small>
                  </button>
                  <div className="profile-view-cabin-card-progress-wrap">
                    <div
                      className="profile-view-cabin-card-progress"
                      style={{ width: `${panelCompanions.left.progress}%` }}
                    />
                  </div>
                </aside>
              )}
              <div
                ref={centerScrollRef}
                className={`profile-view-cabin-center-scroll profile-view-scroll-container profile-view-panel-scroll${panelActiveView === null && (activeTab === 'active' || activeTab === 'favorites') ? ' profile-view-cabin-center-scroll--locked' : ''}${panelActiveView === 'passport' ? ' profile-view-cabin-center-scroll--no-scroll' : ''}${panelActiveView === 'squad-corner' || panelActiveView === 'real-diary' || panelActiveView === 'profile4k' || panelActiveView === 'team' || panelActiveView === 'council' || panelActiveView === 'bro' || panelActiveView === 'vozhatifikator' || panelActiveView === 'counselor-squad' || panelActiveView === 'share' || panelActiveView === 'workshop' || panelActiveView === 'inspector' ? ' profile-view-cabin-center-scroll--content-fit' : ''}`}
                style={{ background: 'transparent' }}
              >
                {pendingApprovalsCount > 0 &&
                  !approvalsSyncPromptDismissed &&
                  canRequestApprovals && (
                    <div
                      className="profile-approvals-sync-banner"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        padding: '10px 14px',
                        marginBottom: 12,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, opacity: 0.95 }}>
                        Вожатый подтвердил {pendingApprovalsCount}{' '}
                        {pluralizeRu(pendingApprovalsCount, ['уровень', 'уровня', 'уровней'])}.
                        Синхронизировать прогресс?
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-primary-gold"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          disabled={approvalsSyncBusy}
                          onClick={() => void syncApprovedLevels()}
                        >
                          {approvalsSyncBusy ? 'Синхронизация...' : 'Синхронизировать'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => setApprovalsSyncPromptDismissed(true)}
                        >
                          Позже
                        </button>
                      </div>
                    </div>
                  )}
                {panelActiveView ? (
                  <div
                    key={panelActiveView}
                    className={`profile-view-cabin-content profile-view-cabin-content--from-${panelOrigin || 'left'}`}
                  >
                    {panelActiveView !== 'passport' &&
                      panelActiveView !== 'squad-corner' &&
                      panelActiveView !== 'real-diary' &&
                      panelActiveView !== 'profile4k' &&
                      panelActiveView !== 'team' &&
                      panelActiveView !== 'council' &&
                      panelActiveView !== 'bro' &&
                      panelActiveView !== 'vozhatifikator' &&
                      panelActiveView !== 'counselor-squad' &&
                      panelActiveView !== 'share' &&
                      panelActiveView !== 'workshop' &&
                      panelActiveView !== 'inspector' && (
                        <header className="profile-view-cabin-panel-header">
                          <button
                            type="button"
                            className="profile-view-cabin-panel-header__back"
                            onClick={() => {
                              setActiveTab('active');
                              openCabinPanel(null, null);
                            }}
                            aria-label="В путь (стартовый экран)"
                          >
                            В пути
                          </button>
                          <span className="profile-view-cabin-panel-header__title">
                            {panelTitleMap[panelActiveView]}
                          </span>
                        </header>
                      )}
                    {renderPanelContent()}
                  </div>
                ) : (
                  <div className="profile-view-cabin-content profile-view-cabin-content--from-top profile-view-cabin-content--hub">
                    <div className="profile-view-cabin-progress-hub">
                      {renderTabsPanel({ hideNav: true })}
                    </div>
                  </div>
                )}
              </div>
              {panelCompanions?.right && (
                <aside className="profile-view-cabin-side-screen profile-view-cabin-side-screen--right">
                  <p className="profile-view-cabin-side-screen__label">Ветка раздела</p>
                  <button
                    type="button"
                    className="profile-view-cabin-side-screen__btn"
                    onClick={panelCompanions.right.action}
                  >
                    <span>{panelCompanions.right.title}</span>
                    <small>{panelCompanions.right.subtitle}</small>
                  </button>
                  <div className="profile-view-cabin-card-progress-wrap">
                    <div
                      className="profile-view-cabin-card-progress"
                      style={{ width: `${panelCompanions.right.progress}%` }}
                    />
                  </div>
                </aside>
              )}
            </div>
          </div>
          {onNavigateHome && onNavigateCategories && onNavigateAboutCamp && onTelegramContact && (
            <ProfileTabletNav
              onHome={onNavigateHome}
              onCategories={onNavigateCategories}
              onAboutCamp={onNavigateAboutCamp}
              onTelegramContact={onTelegramContact}
              onProfile={() => {}}
              onOpenVk={onOpenVk}
            />
          )}
        </div>
        <div
          className={`profile-view-cabin-right profile-view-cabin-right--raised-sections${cabinNavExpanded ? ' profile-view-cabin-right--nav-expanded' : ''}`}
        >
          <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
            <div
              className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--cyan"
              style={{ ['--progress-value' as string]: panelActiveView === null ? '100%' : '0%' }}
              aria-hidden="true"
            >
              <div className="profile-view-cabin-right-rail-progress__fill" />
            </div>
            <button
              type="button"
              className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--hub ${panelActiveView === null ? 'profile-view-cabin-nav-btn--active' : ''}`}
              onClick={() => {
                setActiveTab('active');
                openCabinPanel(null, null);
              }}
              aria-label="Главный экран"
            >
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
              <button
                type="button"
                className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--inspector ${panelActiveView === 'inspector' ? 'profile-view-cabin-nav-btn--active' : ''}`}
                onClick={() => openCabinPanel('inspector', 'top')}
                aria-label="Инспектор Пользы"
              >
                <span className="profile-view-cabin-nav-icon" aria-hidden>
                  📋
                </span>
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
            <button
              type="button"
              className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'profile4k' ? 'profile-view-cabin-nav-btn--active' : ''}`}
              onClick={() => openCabinPanel('profile4k', 'right')}
              aria-label="4К"
            >
              <span className="profile-view-cabin-nav-icon" aria-hidden>
                4К
              </span>
              <span className="profile-view-cabin-card-subtitle">Навыки и рост</span>
              <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                <div
                  className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                  style={
                    {
                      width: `${profile4kProgressPercent}%`,
                      '--progress-value': `${profile4kProgressPercent}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="profile-view-cabin-card-hint">
                {badgeTitlesInPath.length} значков в пути
              </span>
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
            <button
              type="button"
              className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card profile-view-cabin-card--vozhatifikator ${panelActiveView === 'vozhatifikator' ? 'profile-view-cabin-nav-btn--active' : ''}`}
              onClick={() => openCabinPanel('vozhatifikator', 'right')}
              aria-label="Вожатификатор"
            >
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
                  style={
                    {
                      width: `${vozhProgressPercent}%`,
                      '--progress-value': `${vozhProgressPercent}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="profile-view-cabin-card-hint">
                {vozhCompletedCount}/{VOZHATIFIKATOR_CHECKLIST_ITEMS.length} легендарность
              </span>
            </button>
          </div>
          <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
            <div
              className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--purple"
              style={{ ['--progress-value' as string]: `${counselorSquadProgressPercent}%` }}
              aria-hidden="true"
            >
              <div className="profile-view-cabin-right-rail-progress__fill" />
            </div>
            <button
              type="button"
              className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'counselor-squad' ? 'profile-view-cabin-nav-btn--active' : ''}`}
              onClick={() => openCabinPanel('counselor-squad', 'right')}
              aria-label="Вожатский отряд"
            >
              <span className="profile-view-cabin-card-subtitle">Вожатский отряд</span>
              <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                <div
                  className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                  style={
                    {
                      width: `${counselorSquadProgressPercent}%`,
                      '--progress-value': `${counselorSquadProgressPercent}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="profile-view-cabin-card-hint">{counselorSquadNavHint}</span>
            </button>
          </div>
          <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
            <div
              className="profile-view-cabin-right-rail-progress profile-view-cabin-right-rail-progress--orange"
              style={{ ['--progress-value' as string]: `${shareProgressPercent}%` }}
              aria-hidden="true"
            >
              <div className="profile-view-cabin-right-rail-progress__fill" />
            </div>
            <button
              type="button"
              className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide profile-view-cabin-card ${panelActiveView === 'share' ? 'profile-view-cabin-nav-btn--active' : ''}`}
              onClick={() => openCabinPanel('share', 'right')}
              aria-label="Шеринг"
            >
              <span className="profile-view-cabin-card-subtitle">Карточки прогресса</span>
              <div className="profile-view-cabin-card-progress-wrap profile-view-cabin-card-progress-wrap--vertical">
                <div
                  className="profile-view-cabin-card-progress profile-view-cabin-card-progress--vertical"
                  style={
                    {
                      width: `${shareProgressPercent}%`,
                      '--progress-value': `${shareProgressPercent}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="profile-view-cabin-card-hint">
                {shareStoryResult || shareWideResult ? 'Готов к публикации' : 'Собираем материалы'}
              </span>
            </button>
          </div>
          {role === 'parent' && (
            <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
              <button
                type="button"
                className={`profile-view-cabin-nav-btn profile-view-cabin-nav-btn--wide ${panelActiveView === 'parents' ? 'profile-view-cabin-nav-btn--active' : ''}`}
                onClick={() => openCabinPanel('parents', 'right')}
                aria-label="Для родителей"
              >
                <span className="profile-view-cabin-nav-icon" aria-hidden>
                  👨‍👩‍👧
                </span>
                <span className="profile-view-cabin-card-subtitle">Родительский кабинет</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {isCabinProfileExpanded && (
        <div
          className="profile-view-cabin-profile-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-cabin-editor-title"
        >
          <button
            type="button"
            className="profile-view-cabin-profile-modal__backdrop"
            onClick={closeCabinProfileEditor}
            aria-label="Закрыть редактирование профиля"
          />
          <section className="profile-view-cabin-profile-modal__window">
            <header className="profile-view-cabin-profile-modal__header">
              <h3 id="profile-cabin-editor-title">Редактирование профиля</h3>
              <button
                type="button"
                className="profile-view-cabin-profile-modal__close"
                onClick={closeCabinProfileEditor}
                aria-label="Закрыть окно"
              >
                <Icons.Close />
              </button>
            </header>
            <p className="profile-view-cabin-profile-modal__hint">
              Измени статус и описание экипажа. После сохранения карточка останется свёрнутой.
            </p>
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
              <button
                type="button"
                className="btn-secondary"
                disabled={!hasCabinProfileDraftChanges}
                onClick={saveCabinProfileText}
              >
                Сохранить
              </button>
            </div>
          </section>
        </div>
      )}
      <div
        className={`profile-view-console${mobileConsoleExpanded ? ' profile-view-console--mobile-expanded' : ''}`}
        aria-label="Пульт навигации"
      >
        <div className="console-cluster console-cluster--left">
          <div className="console-btn-wrap">
            <button
              type="button"
              className={`console-btn ${panelActiveView === 'squad-corner' ? 'console-btn--active' : ''}`}
              data-console-section="squad-corner"
              onClick={(event) => {
                event.stopPropagation();
                handleSquadCornerConsoleClick();
              }}
              title="Отрядный уголок"
            >
              <img
                src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES['squad-corner'])}`}
                alt=""
                className="console-btn-icon-img"
              />
              <span className="console-btn-bubble-label" aria-hidden>
                ОТРЯДНЫЙ УГОЛОК
              </span>
              <span className="console-btn-icon">🏕️</span>
              <span className="console-btn-label">Отрядный уголок</span>
            </button>
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${squadCornerProgressPercent}%`,
                    '--progress-value': `${squadCornerProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
          <div className="console-btn-wrap">
            <button
              type="button"
              className={`console-btn ${panelActiveView === 'real-diary' ? 'console-btn--active' : ''}`}
              data-console-section="real-diary"
              onClick={() => openCabinPanel('real-diary', 'left')}
              title="Реальный Дневник"
            >
              <img
                src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES['real-diary'])}`}
                alt=""
                className="console-btn-icon-img"
              />
              <span className="console-btn-bubble-label" aria-hidden>
                РЕАЛЬНЫЙ ДНЕВНИК
              </span>
              <span className="console-btn-icon">📖</span>
              <span className="console-btn-label">Реальный Дневник</span>
            </button>
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${diaryProgressPercent}%`,
                    '--progress-value': `${diaryProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
          <div className="console-btn-wrap">
            {isTabletOrMobile ? (
              <button
                type="button"
                className={`console-btn ${panelActiveView === 'council' ? 'console-btn--active' : ''}`}
                data-console-section="council"
                onClick={() => openCabinPanel('council', 'left')}
                title="Совет Лагеря"
              >
                <img
                  src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.council)}`}
                  alt=""
                  className="console-btn-icon-img"
                />
                <span className="console-btn-bubble-label" aria-hidden>
                  СОВЕТ ЛАГЕРЯ
                </span>
                <span className="console-btn-icon">🏛️</span>
                <span className="console-btn-label">Совет Лагеря</span>
              </button>
            ) : (
              <button
                type="button"
                className={`console-btn ${panelActiveView === 'team' ? 'console-btn--active' : ''}`}
                data-console-section="team"
                onClick={() => openCabinPanel('team', 'left')}
                title="Движок"
              >
                <img
                  src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.team)}`}
                  alt=""
                  className="console-btn-icon-img"
                />
                <span className="console-btn-bubble-label" aria-hidden>
                  ДВИЖОК
                </span>
                <span className="console-btn-icon">🚀</span>
                <span className="console-btn-label">Движок</span>
              </button>
            )}
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${isTabletOrMobile ? councilProgressPercent : teamProgressPercent}%`,
                    '--progress-value': `${isTabletOrMobile ? councilProgressPercent : teamProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>
        <div className="console-terminal" aria-live="polite">
          <div className="console-terminal__title">{consoleCopy.title}</div>
          <div className="console-terminal__meta">{consoleCopy.meta}</div>
        </div>
        <div className="console-cluster console-cluster--right">
          <div className="console-btn-wrap">
            {isTabletOrMobile ? (
              <button
                type="button"
                className={`console-btn ${panelActiveView === 'team' ? 'console-btn--active' : ''}`}
                data-console-section="team"
                onClick={() => openCabinPanel('team', 'right')}
                title="Движок"
              >
                <img
                  src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.team)}`}
                  alt=""
                  className="console-btn-icon-img"
                />
                <span className="console-btn-bubble-label" aria-hidden>
                  ДВИЖОК
                </span>
                <span className="console-btn-icon">🚀</span>
                <span className="console-btn-label">Движок</span>
              </button>
            ) : (
              <button
                type="button"
                className={`console-btn ${panelActiveView === 'council' ? 'console-btn--active' : ''}`}
                data-console-section="council"
                onClick={() => openCabinPanel('council', 'right')}
                title="Совет Лагеря"
              >
                <img
                  src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.council)}`}
                  alt=""
                  className="console-btn-icon-img"
                />
                <span className="console-btn-bubble-label" aria-hidden>
                  СОВЕТ ЛАГЕРЯ
                </span>
                <span className="console-btn-icon">🏛️</span>
                <span className="console-btn-label">Совет Лагеря</span>
              </button>
            )}
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${isTabletOrMobile ? teamProgressPercent : councilProgressPercent}%`,
                    '--progress-value': `${isTabletOrMobile ? teamProgressPercent : councilProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
          <div className="console-btn-wrap">
            <button
              type="button"
              className={`console-btn ${panelActiveView === 'bro' ? 'console-btn--active' : ''}`}
              data-console-section="bro"
              onClick={() => openCabinPanel('bro', 'right')}
              title="БРО"
            >
              <img
                src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.bro)}`}
                alt=""
                className="console-btn-icon-img"
              />
              <span className="console-btn-bubble-label" aria-hidden>
                БРО
              </span>
              <span className="console-btn-icon">🎖️</span>
              <span className="console-btn-label">БРО</span>
            </button>
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${broProgressPercent}%`,
                    '--progress-value': `${broProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
          <div className="console-btn-wrap">
            <button
              type="button"
              className={`console-btn ${panelActiveView === 'workshop' ? 'console-btn--active' : ''}`}
              data-console-section="workshop"
              onClick={() => openCabinPanel('workshop', 'right')}
              title="Мастерская"
            >
              <img
                src={`${baseUrl}${encodeURI(CONSOLE_SECTION_IMAGES.workshop)}`}
                alt=""
                className="console-btn-icon-img"
              />
              <span className="console-btn-bubble-label" aria-hidden>
                МАСТЕРСКАЯ
              </span>
              <span className="console-btn-icon">⚒️</span>
              <span className="console-btn-label">Мастерская</span>
            </button>
            <div className="console-btn-meter console-btn-meter--vertical">
              <span
                style={
                  {
                    width: `${workshopProgressPercent}%`,
                    '--progress-value': `${workshopProgressPercent}%`,
                  } as React.CSSProperties
                }
              />
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
      <div
        className="profile-view-panel-header"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button type="button" className="btn-secondary" onClick={() => openCabinPanel(null, null)}>
          Назад
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.95 }}>
          {panelActiveView === 'passport' && 'Паспорт'}
          {panelActiveView === 'inspector' && 'Инспектор'}
          {panelActiveView === 'profile4k' && '4К'}
          {panelActiveView === 'counselor-squad' && 'Вожатский отряд'}
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
      <div
        className="profile-view-scroll-container profile-view-panel-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        {renderPanelContent()}
      </div>
    </>
  ) : (
    <div className="profile-view-content-wrapper">
      <div
        className="profile-view-top-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button onClick={onBack} className="btn-secondary">
          Назад
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {userData?.meta?.hasCompletedTutorial && (
            <button
              type="button"
              onClick={() => startProfileTutorial(false)}
              className="btn-secondary"
            >
              Показать подсказки
            </button>
          )}
          <button
            onClick={() => setShowProfileEditor(!showProfileEditor)}
            className="btn-secondary"
          >
            {showProfileEditor ? 'Закрыть' : 'Редактировать'}
          </button>
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
                <span
                  className={`profile-sandbox-role__trigger-chevron ${roleDropdownOpen ? 'is-open' : ''}`}
                  aria-hidden
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path fill="currentColor" d="M6 8L1 3h10z" />
                  </svg>
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
                    onClick={() => {
                      setSandboxRole(r);
                      setRoleDropdownOpen(false);
                    }}
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
        {showSandbox &&
          (() => {
            const levelsToApprove = Object.entries(progress || {}).filter(
              ([_, p]) =>
                p &&
                p.status === 'in_progress' &&
                Array.isArray(p.evidence) &&
                p.evidence.length > 0
            );
            if (levelsToApprove.length === 0) return null;
            return (
              <div
                id="profile-dev-approve-levels"
                className="sandbox-dev-approve"
                style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'rgba(255, 165, 0, 0.12)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                }}
              >
                <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                  <strong>Dev: быстрые одобрения</strong>{' '}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
                </p>
                <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.8 }}>
                  Уровни в пути с evidence — одобрить:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {levelsToApprove.map(([id, p]) => {
                    const reflection =
                      p?.reflection ||
                      (
                        p?.evidence?.find((e: { type: string }) => e.type === 'text') as
                          | { value?: string }
                          | undefined
                      )?.value;
                    return (
                      <div
                        key={id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 8,
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 13 }}>
                          {badgeLookupMap.get(getBaseId(id))?.title || id}
                        </span>
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
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(0, 255, 255, 0.06)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 255, 0.18)',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              <strong>Dev: выдать уровень</strong>{' '}
              <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px',
                gap: 10,
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                  Level ID (можно списком через запятую)
                </label>
                <input
                  value={devGrantLevelId}
                  onChange={(e) => setDevGrantLevelId(e.target.value)}
                  placeholder="Например: 8.6.1, 8.6.2"
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                  Статус
                </label>
                <select
                  value={devGrantStatus}
                  onChange={(e) =>
                    setDevGrantStatus(e.target.value as 'locked' | 'in_progress' | 'achieved')
                  }
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                  }}
                >
                  <option value="locked">locked</option>
                  <option value="in_progress">in_progress</option>
                  <option value="achieved">achieved</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Рефлексия (опционально)
              </label>
              <input
                value={devGrantReflection}
                onChange={(e) => setDevGrantReflection(e.target.value)}
                placeholder="Коротко: что сделал(а)"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                }}
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
                    updateLevelStatus(
                      id as any,
                      devGrantStatus,
                      devGrantReflection.trim() || undefined
                    );
                  });
                  showHint({
                    title: 'Dev',
                    content: `Применено ${ids.length} ${ids.length === 1 ? 'уровень' : 'уровней'} со статусом ${devGrantStatus}.`,
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
                onClick={() => {
                  setDevGrantLevelId('');
                  setDevGrantReflection('');
                }}
              >
                Очистить
              </button>
              <button type="button" className="btn-secondary" onClick={() => resetProgress()}>
                Сбросить прогресс
              </button>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={importInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f && importData) {
              const result = await importData(f);
              if (result.success) {
                if (
                  result.data?.customBadges != null &&
                  Array.isArray(result.data.customBadges) &&
                  restoreCustomBadges
                ) {
                  restoreCustomBadges(
                    result.data.customBadges as {
                      id: string;
                      title: string;
                      emoji?: string;
                      category_id?: string;
                      level?: string;
                      criteria?: string;
                      description?: string;
                    }[]
                  );
                }
                showHint({
                  title: 'Готово',
                  content: 'Прогресс и предложения Мастерской восстановлены.',
                });
              }
            }
            e.target.value = '';
          }}
        />
      </div>

      <div className="profile-view-main">
        <div className="profile-view-scroll-container">
          <div className="profile-view-passport-column">
            <div id="profile-passport-card" className="profile-view-passport-two-col">
              <div className="profile-view-passport-avatar">
                <div className="avatar-circle">
                  {isImageAvatar(showProfileEditor ? avatarInput : profile.avatar) ? (
                    <img
                      src={(showProfileEditor ? avatarInput : profile.avatar) as string}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML =
                          `<span style="font-size: 44px">${((showProfileEditor ? nicknameInput : profile.nickname) || 'И')[0].toUpperCase()}</span>`;
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '44px' }}>
                      {(showProfileEditor ? avatarInput : profile.avatar) || '🧑‍🚀'}
                    </span>
                  )}
                </div>
                {showProfileEditor && (
                  <div className="profile-view-passport-avatar-buttons">
                    <ImageSourceBlock
                      context="passport_avatar"
                      value={
                        typeof avatarInput === 'string' &&
                        (avatarInput.startsWith('data:') || avatarInput.startsWith('http'))
                          ? avatarInput
                          : null
                      }
                      onChange={setAvatarInput}
                      aspect="square"
                      hidePreview
                      buttonLayout="column"
                      onGenerate={async (opts: any) =>
                        requestImageGenerate(
                          { mode: 'generate', context: 'passport', prompt: opts.prompt ?? '' },
                          accessToken ?? null
                        )
                      }
                      onProcess={async (imageBase64: any, opts: any) =>
                        requestImageGenerate(
                          {
                            mode: 'process',
                            context: 'passport',
                            imageBase64,
                            prompt: opts?.prompt ?? '',
                          },
                          accessToken ?? null
                        )
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
                        <input
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          placeholder="Никнейм"
                          className="w-input"
                        />
                      </label>
                      <label className="profile-view-passport-label">
                        Направление
                        <input
                          value={statusInput}
                          maxLength={80}
                          onChange={(e) => setStatusInput(e.target.value)}
                          placeholder="Направление"
                          className="w-input"
                        />
                      </label>
                    </div>
                    <div className="profile-view-passport-divider" />
                    <label className="profile-view-passport-label profile-view-passport-label--full">
                      Сейчас делаю
                      <textarea
                        value={bioInput}
                        maxLength={160}
                        onChange={(e) => setBioInput(e.target.value)}
                        placeholder="Коротко. Одна мысль."
                        className="w-input"
                        style={{ minHeight: 80, resize: 'vertical' }}
                      />
                    </label>
                    <p className="profile-view-passport-hint">
                      Коротко. Одна мысль. Можно без точки. ({bioInput.length}/160)
                    </p>
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
                    {[
                      'counselor',
                      'educator',
                      'shift_leader',
                      'camp_director',
                      'developer',
                    ].includes(role) &&
                      (() => {
                        const { title, subtitle } = getRoleDisplay(role);
                        return (
                          <div
                            style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}
                          >
                            {title}
                            {subtitle && (
                              <div style={{ fontSize: 10, opacity: 0.85 }}>{subtitle}</div>
                            )}
                          </div>
                        );
                      })()}
                  </>
                )}
                <div className="profile-view-passport-divider" />
                <div className="profile-view-passport-label profile-view-passport-label--full">
                  Ранг
                </div>
                <div className="profile-view-passport-rank-row">
                  <span>Уровень {currentLevels}</span>
                  <span>{xpPercent >= 100 ? 'Цель выполнена' : `Цель: ${nextRankAt} ур.`}</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${xpPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #8B00FF, #FFD700)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
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
                        onClick={saveProfileEditor}
                      >
                        Сохранить
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary-gold"
                      onClick={() => setShowProfileEditor(true)}
                    >
                      Редактировать
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {role === 'parent' && (
            <ParentsContainer
              role={role}
              setShowChildBadges={setShowChildBadges}
              childProgressFromFile={childProgressFromFile}
              parentSnapshotCode={parentSnapshotCode}
              isParentChildReadonlyView={isParentChildReadonlyView}
              onOpenParentCodeModal={() => setShowParentCodeModal(true)}
              onNavigateToRegistrationForm={
                typeof onNavigateToRegistrationForm === 'function'
                  ? onNavigateToRegistrationForm
                  : undefined
              }
              onOpenRouteForm={() => setShowChildRouteForm(true)}
            />
          )}

          {showOrganizerPanel && (
            <OrganizerContainer
              role={role}
              accessToken={accessToken}
              deviceId={deviceId}
              canReadShiftsAndSquads={canReadShiftsAndSquads}
              canManageShiftsAndSquads={canManageShiftsAndSquads}
              canDeleteShiftsAndSquads={canDeleteShiftsAndSquads}
              mySquadInfo={mySquadInfo}
              squadJoinRequestBusyId={squadJoinRequestBusyId}
              onRequestJoinSquad={requestJoinSquad}
              onOpenSquadCornerFromOrganizer={() => {
                setSquadCornerReturnToOrganizer(false);
                setActiveTab('active');
                window.dispatchEvent(
                  new CustomEvent('profile:openTab', {
                    detail: { panel: 'squad-corner', tab: 'squad' },
                  })
                );
                openCabinPanel('squad-corner', 'left');
              }}
              onOpenSquadFromOrganizer={handleOpenSquadFromOrganizer}
              loadMySquadInfo={loadMySquadInfo}
              showHint={showHint}
            />
          )}

          <div className="profile-view-dashboards-grid">
            <div
              className="dashboards-stack"
              style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {seeOtradBlocksInView && (
                <InspectorContainer
                  onOpenDiary={() => openCabinPanel('real-diary', 'left')}
                  onNavigateToBadge={onNavigateToBadge}
                />
              )}
              <Profile4KDashboard
                userData={userData}
                badges={badges}
                badgeTitlesInPath={badgeTitlesInPath}
                favoriteBadgeTitles={favoriteBadgeTitles}
                rank={rank}
                nickname={profile.nickname}
              />
              {!isSpaceshipMode &&
                (travelerMode ? (
                  <FeatureGate
                    allowed={false}
                    reason={travelerGateReason}
                    ctaLabel="Разблокировать по коду"
                    onCta={openUnlockByCode}
                  >
                    <TeamContainer
                      onNavigateToBadge={onNavigateToBadge}
                      onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
                    />
                  </FeatureGate>
                ) : (
                  <TeamContainer
                    onNavigateToBadge={onNavigateToBadge}
                    onSuggestInitiative={seeOtradBlocksInView ? openInitiativeModal : undefined}
                  />
                ))}

              {seeOtradBlocksInView && (
                <div id="wing-dashboard">
                  {travelerMode ? (
                    <FeatureGate
                      allowed={false}
                      reason={travelerGateReason}
                      ctaLabel="Разблокировать по коду"
                      onCta={openUnlockByCode}
                    >
                      <WingDashboard onSuggestInitiative={openInitiativeModal} />
                    </FeatureGate>
                  ) : (
                    <FeatureGate
                      allowed={Boolean(userData?.broProgress?.isBro)}
                      reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
                      ctaLabel="К Бропаспорту"
                      onCta={() =>
                        document
                          .getElementById('bro-section-passport')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      mode="replace"
                    >
                      <WingDashboard onSuggestInitiative={openInitiativeModal} />
                    </FeatureGate>
                  )}
                </div>
              )}
            </div>
          </div>

          {renderTabsPanel()}

          <div
            className="profile-view-share-row"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div
              style={{
                marginTop: '24px',
                padding: '20px',
                background: 'rgba(77, 172, 255, 0.08)',
                borderRadius: '24px',
                border: '1px solid rgba(77, 172, 255, 0.2)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤝</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Пригласить друзей</h3>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '12px' }}>
                {myTeam
                  ? 'Скопируй ссылку и отправь участникам Движка.'
                  : 'Создай Движок в блоке выше и приглашай друзей по ссылке.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  const url = generateInviteUrl();
                  navigator.clipboard
                    .writeText(url)
                    .then(() => alert('Ссылка приглашения скопирована в буфер обмена!'));
                }}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(90deg, #4dacff, #8b00ff)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                🔗 Пригласить друзей
              </button>
            </div>

            <div id="profile-share-center" className="share-center-v2">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤</div>
              <h3>Шеринг достижений</h3>
              <label className="share-center-toggle">
                <input
                  type="checkbox"
                  className="share-center-toggle-input"
                  checked={shareHideNickname}
                  onChange={(e) => setShareHideNickname(e.target.checked)}
                />
                <span className="share-center-toggle-track" aria-hidden />
                <span>Скрыть ник</span>
              </label>
              <button
                onClick={async () => {
                  if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl);
                  if (shareWideUrl) URL.revokeObjectURL(shareWideUrl);
                  setShareStoryUrl(null);
                  setShareWideUrl(null);
                  setShareStoryResult(null);
                  setShareWideResult(null);
                  setShareBusy(true);
                  setShareStatus('Генерируем слоган…');
                  try {
                    const raw = await fetchAiSlogan({
                      kind: 'progress_summary',
                      nickname: profile.nickname,
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                    });
                    const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan;
                    setShareStatus('Генерируем характеристику 4К…');
                    const pedagogy4kLine = await fetchPedagogy4k({
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                      rank,
                      nickname: profile.nickname ?? undefined,
                    });
                    setShareStatus('Генерируем мем для сторис…');
                    const storiesMemeRaw = await fetchAiSlogan({
                      kind: 'stories_reels_meme',
                      nickname: profile.nickname ?? undefined,
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                    });
                    const customStoriesLine =
                      typeof storiesMemeRaw === 'string' && storiesMemeRaw.trim()
                        ? storiesMemeRaw.trim()
                        : undefined;
                    setShareStatus('Генерируем вайб-чек…');
                    const vibeRaw = await fetchVibeCheck({
                      variant: 'profile',
                      rank,
                      nickname: profile.nickname ?? undefined,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                      badgeTitlesInPath,
                      favoriteBadgeTitles,
                    });
                    const vibeCheck = vibeRaw
                      ? {
                          memeHeader: vibeRaw.meme_header,
                          memeText: vibeRaw.meme_text,
                          statBuff: vibeRaw.stat_buff,
                        }
                      : undefined;
                    const createdAt = new Date().toISOString();
                    const profilePayload = {
                      nickname: profile.nickname ?? undefined,
                      avatar: profile.avatar ?? '',
                      rank,
                      totalLevelsAchieved: profile?.stats?.totalLevelsAchieved,
                      totalBadgesStarted: profile?.stats?.totalBadgesStarted,
                    };
                    const storyRes = await generateSocialCard({
                      kind: 'progress_summary',
                      profile: profilePayload,
                      format: 'story',
                      hideNickname: shareHideNickname,
                      customCaption: slogan ?? undefined,
                      customCallout: pedagogy4kLine ?? undefined,
                      customStoriesLine,
                      vibeCheck,
                      badgeCarouselItems,
                      createdAt,
                    });
                    const wideRes = await generateSocialCard({
                      kind: 'progress_summary',
                      profile: profilePayload,
                      format: 'wide',
                      hideNickname: shareHideNickname,
                      customCaption: slogan ?? undefined,
                      customCallout: pedagogy4kLine ?? undefined,
                      customStoriesLine,
                      vibeCheck,
                      badgeCarouselItems,
                      createdAt,
                    });
                    setShareStoryResult(storyRes);
                    setShareWideResult(wideRes);
                    setShareStoryUrl(URL.createObjectURL(storyRes.blob));
                    setShareWideUrl(URL.createObjectURL(wideRes.blob));
                    setShareStatus('Карточки готовы: 9:16 и 16:9.');
                  } catch (e) {
                    console.error(e);
                    setShareStatus('Не удалось сгенерировать карточки. Попробуй ещё раз.');
                  } finally {
                    setShareBusy(false);
                  }
                }}
                disabled={shareBusy}
                className="btn-generate"
              >
                {shareBusy ? 'Генерируем…' : 'Создать карточку'}
              </button>
              {(shareStoryUrl || shareWideUrl) && (
                <div className="share-center-results">
                  {shareStatus && (
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>{shareStatus}</div>
                  )}
                  {shareStoryUrl && shareStoryResult && (
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                        Сторис 9:16
                      </div>
                      <img
                        src={shareStoryUrl}
                        alt="Сторис"
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          borderRadius: '20px',
                          display: 'block',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => shareOrDownloadSocialCard(shareStoryResult)}
                        className="btn-secondary"
                        style={{ marginTop: '8px' }}
                      >
                        Поделиться / скачать
                      </button>
                    </div>
                  )}
                  {shareWideUrl && shareWideResult && (
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                        Пост 16:9
                      </div>
                      <img
                        src={shareWideUrl}
                        alt="Пост"
                        style={{ width: '100%', borderRadius: '20px', display: 'block' }}
                      />
                      <button
                        type="button"
                        onClick={() => shareOrDownloadSocialCard(shareWideResult)}
                        className="btn-secondary"
                        style={{ marginTop: '8px' }}
                      >
                        Поделиться / скачать
                      </button>
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
    <section
      className={`profile-view profile-view--one-screen profile-view--mobile-scope${cabinNavExpanded ? ' profile-view--cabin-nav-expanded' : ''}`}
    >
      {roleSelectorVisible && (
        <div
          className="profile-role-selector-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Выбор роли"
        >
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
                      try {
                        localStorage.setItem('rl_profile_role_selector_seen', '1');
                      } catch {}
                      setSandboxRole(r);
                      setShowRoleSelector(false);
                    }}
                  >
                    <span className="profile-role-selector__tab-label">{title}</span>
                    {subtitle && (
                      <span className="profile-role-selector__tab-subtitle">{subtitle}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="profile-view-nav-decor" aria-hidden="true" />

      {/* Legacy utility bubbles — disabled, functionality moved to AdminDashboard + DevPanel */}
      {false && (
        <div className="profile-utility-bubbles">
          {!canUseChat && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--bot"
              onClick={() => setOpenBubble(openBubble === 'bot' ? null : 'bot')}
              title="Разблокировать бота"
            >
              ИИ‑чат
            </button>
          )}
          {showSandbox && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--code"
              onClick={() => setOpenBubble(openBubble === 'code' ? null : 'code')}
              title="Сгенерировать код подтверждения"
            >
              Код
            </button>
          )}
          {(showSandbox || showEventsForRole) && utilityBubblesExpanded && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--events"
              onClick={() => setOpenBubble(openBubble === 'events' ? null : 'events')}
              title="Входящие заявки"
            >
              Заявки
            </button>
          )}
          {utilityBubblesExpanded && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--backup"
              onClick={() => setOpenBubble(openBubble === 'backup' ? null : 'backup')}
              title="Резервная копия"
            >
              Бэкап
            </button>
          )}
          {canModerateApprovals && utilityBubblesExpanded && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--events"
              onClick={() =>
                setOpenBubble(openBubble === 'staff-dashboard' ? null : 'staff-dashboard')
              }
              title="Панель staff"
            >
              Staff
            </button>
          )}
          {showSandbox && utilityBubblesExpanded && (
            <button
              type="button"
              className="profile-utility-bubble profile-utility-bubble--role"
              onClick={() => setOpenBubble(openBubble === 'role' ? null : 'role')}
              title="Роль для теста"
            >
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
      )}

      {openBubble && (
        <div
          className="profile-utility-panel-overlay"
          onClick={() => setOpenBubble(null)}
          aria-hidden="true"
        />
      )}
      {openBubble === 'bot' && (
        <div
          id="profile-unlock-bot"
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-unlock-bot-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-unlock-bot-title">Разблокировать бота</span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
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
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => {
                  setVerifyCode(e.target.value);
                  setVerifyError(null);
                }}
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
                  textTransform: 'uppercase',
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
                        campId: undefined,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setVerifyError(
                        data?.error ||
                          (res.status === 401 ? 'Неверный или истёкший код' : 'Ошибка верификации')
                      );
                      return;
                    }
                    setAuth({
                      role: (data.role || 'participant') as import('../types/authRole').UserRole,
                      accessToken: data.accessToken,
                      campId: data.campId || undefined,
                      exp: data.exp,
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
              {verifyError && <span style={{ fontSize: 12, color: '#ff6b6b' }}>{verifyError}</span>}
            </div>
          </div>
        </div>
      )}
      {openBubble === 'code' && (
        <div
          id="profile-generate-code"
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-generate-code-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-generate-code-title">
              Сгенерировать код подтверждения{' '}
              <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
            </span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
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
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Роль</label>
                <select
                  value={genRole}
                  onChange={(e) => setGenRole(e.target.value as UserRole)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                >
                  {ROLE_ORDER.filter((r) => r !== 'traveler').map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
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
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
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
                        'X-Generate-Code-Secret': genSecret.trim(),
                      },
                      body: JSON.stringify({
                        deviceId: genDeviceId.trim(),
                        role: genRole,
                        campId: '',
                      }),
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
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.8 }}>Код:</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: 2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {genResult}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(genResult).then(() =>
                        showHint({
                          title: 'Скопировано',
                          content: 'Код скопирован в буфер обмена',
                        })
                      );
                    }}
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
        <div
          id="profile-events-panel"
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-events-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-events-title">
              Входящие заявки{' '}
              {showSandbox ? (
                <span style={{ fontSize: 11, opacity: 0.7 }}>(песочница)</span>
              ) : showEventsForRole ? (
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {role === 'parent' ? '(родитель)' : '(вожатый/орг.)'}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
          </div>
          <div className="profile-utility-panel-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', opacity: eventsTab === 'approvals' ? 1 : 0.7 }}
                onClick={() => setEventsTab('approvals')}
              >
                Подтверждения значков
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', opacity: eventsTab === 'legacy' ? 1 : 0.7 }}
                onClick={() => setEventsTab('legacy')}
              >
                События webhook
              </button>
              {canModerateApprovals && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', opacity: eventsTab === 'plans' ? 1 : 0.7 }}
                  onClick={() => {
                    setEventsTab('plans');
                    if (plansInbox.length === 0 && !plansInboxBusy && accessToken) {
                      setPlansInboxBusy(true);
                      setPlansInboxError(null);
                      fetchPlansInbox(accessToken)
                        .then((plans) => setPlansInbox(plans))
                        .catch((e) =>
                          setPlansInboxError(
                            e instanceof Error ? e.message : 'Ошибка загрузки планов'
                          )
                        )
                        .finally(() => setPlansInboxBusy(false));
                    }
                  }}
                >
                  Планы
                  {plansInbox.filter((p) => p.status === 'submitted').length > 0
                    ? ` (${plansInbox.filter((p) => p.status === 'submitted').length})`
                    : ''}
                </button>
              )}
              {canModerateApprovals && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', opacity: eventsTab === 'tasks' ? 1 : 0.7 }}
                  onClick={() => setEventsTab('tasks')}
                >
                  📝 Задания
                </button>
              )}
            </div>

            {eventsTab === 'legacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>
                    Секрет (TELEGRAM_WEBHOOK_SECRET)
                  </label>
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
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#fff',
                      fontSize: 13,
                    }}
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
                  <div
                    className="profile-error profile-error--not-found"
                    style={{ marginBottom: 12 }}
                  >
                    {eventsError}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginTop: 8 }}
                      disabled={eventsBusy}
                      onClick={() => loadEvents()}
                    >
                      Повторить
                    </button>
                  </div>
                )}
                {!eventsBusy && eventsData.length === 0 && !eventsError && (
                  <div className="profile-empty-state profile-empty-state--squads">
                    {!eventsSecret.trim() ? (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>
                          🔐
                        </div>
                        <p className="profile-empty-state__title">Введите секрет</p>
                        <p className="profile-empty-state__text">
                          Введите секрет TELEGRAM_WEBHOOK_SECRET и нажмите «Обновить».
                        </p>
                      </>
                    ) : eventsHasLoaded ? (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>
                          📬
                        </div>
                        <p className="profile-empty-state__title">Заявок пока нет</p>
                        <p className="profile-empty-state__text">
                          Новые заявки появятся здесь после их отправки.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="profile-empty-state__icon" aria-hidden>
                          📬
                        </div>
                        <p className="profile-empty-state__title">Загрузить заявки</p>
                        <p className="profile-empty-state__text">
                          Нажмите «Обновить» для загрузки списка.
                        </p>
                      </>
                    )}
                  </div>
                )}
                {eventsData.length > 0 && (
                  <div
                    style={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    {eventsData.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 8,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ opacity: 0.7 }}>
                          {ev.userId || ev.username || '—'} · {ev.timestamp || ''}
                        </div>
                        <div style={{ marginTop: 4, wordBreak: 'break-word' }}>
                          {ev.text || '(пусто)'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {eventsTab === 'approvals' &&
              (travelerMode ? (
                <FeatureGate
                  allowed={false}
                  reason={travelerGateReason}
                  ctaLabel="Разблокировать по коду"
                  onCta={openUnlockByCode}
                  mode="replace"
                >
                  <div />
                </FeatureGate>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '8px 14px' }}
                      disabled={badgeRequestsBusy || squadJoinRequestsBusy || mySquadBusy}
                      onClick={async () => {
                        await loadBadgeApprovalsData();
                        await loadMySquadJoinRequestsData();
                        await loadMySquadInfo();
                      }}
                    >
                      {badgeRequestsBusy || squadJoinRequestsBusy || mySquadBusy
                        ? 'Загрузка...'
                        : 'Обновить'}
                    </button>
                    {canRequestApprovals && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px 14px' }}
                        disabled={approvalsSyncBusy}
                        onClick={() => void syncApprovedLevels()}
                      >
                        {approvalsSyncBusy ? 'Синхронизация...' : 'Синхронизировать одобрения'}
                      </button>
                    )}
                  </div>
                  {badgeRequestsError && (
                    <div className="profile-error profile-error--not-found">
                      {badgeRequestsError}
                    </div>
                  )}
                  {approvalsSyncStatus && (
                    <div style={{ fontSize: 12, opacity: 0.88 }}>{approvalsSyncStatus}</div>
                  )}

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'rgba(0,0,0,0.32)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
                      Мой отряд
                    </div>
                    {!accessToken && (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Войдите по коду, чтобы привязать устройство к отряду.
                      </div>
                    )}
                    {accessToken && (
                      <>
                        {mySquadError && (
                          <div
                            className="profile-error profile-error--not-found"
                            style={{ marginBottom: 8 }}
                          >
                            {mySquadError}
                          </div>
                        )}
                        {mySquadInfo?.membership ? (
                          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                            <div>
                              Смена:{' '}
                              <strong>
                                {mySquadInfo.shift?.name || mySquadInfo.membership.campId || '—'}
                              </strong>
                            </div>
                            <div>
                              Отряд:{' '}
                              <strong>
                                {mySquadInfo.squad?.name || mySquadInfo.membership.squadId || '—'}
                              </strong>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '8px 12px' }}
                                onClick={() => {
                                  if (!isSpaceshipMode) {
                                    showHint({
                                      title: 'Кабинет отряда',
                                      content:
                                        'Кабинет отряда открывается в режиме Кабины (profile-desktop).',
                                    });
                                    return;
                                  }
                                  setActiveTab('active');
                                  setSquadCornerReturnToOrganizer(false);
                                  window.dispatchEvent(
                                    new CustomEvent('profile:openTab', {
                                      detail: { panel: 'squad-corner', tab: 'squad' },
                                    })
                                  );
                                  openCabinPanel('squad-corner', 'left');
                                }}
                              >
                                Открыть кабинет
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                            Вы пока не состоите в отряде.
                          </div>
                        )}
                        {(role === 'participant' ||
                          role === 'parent' ||
                          role === 'counselor' ||
                          role === 'shift_leader' ||
                          role === 'developer') && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              marginTop: 8,
                            }}
                          >
                            <input
                              type="text"
                              value={mySquadJoinCode}
                              onChange={(e) => {
                                setMySquadJoinCode(e.target.value.toUpperCase());
                                setMySquadJoinStatus(null);
                              }}
                              placeholder="Введите код приглашения"
                              style={{
                                flex: 1,
                                minWidth: 140,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: '#fff',
                                fontSize: 13,
                              }}
                            />
                            <button
                              type="button"
                              className="btn-primary-gold"
                              style={{ padding: '8px 14px' }}
                              disabled={mySquadJoinBusy}
                              onClick={() => void joinMySquadByCode()}
                            >
                              {mySquadJoinBusy ? 'Вступаем...' : 'Вступить'}
                            </button>
                          </div>
                        )}
                        {showSandbox && role === 'developer' && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              marginTop: 8,
                            }}
                          >
                            <input
                              type="text"
                              value={mySquadJoinId}
                              onChange={(e) => {
                                setMySquadJoinId(e.target.value);
                                setMySquadJoinStatus(null);
                              }}
                              placeholder="Dev fallback: squadId"
                              style={{
                                flex: 1,
                                minWidth: 140,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.2)',
                                color: '#fff',
                                fontSize: 13,
                              }}
                            />
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '8px 14px' }}
                              disabled={mySquadJoinBusy}
                              onClick={() => void joinMySquadById()}
                            >
                              Вступить по squadId
                            </button>
                          </div>
                        )}
                        {mySquadJoinStatus && (
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>
                            {mySquadJoinStatus}
                          </div>
                        )}
                        {canModerateApprovals && (mySquadInfo?.participants?.length || 0) > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                opacity: 0.8,
                                marginBottom: 6,
                              }}
                            >
                              Участники отряда
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                maxHeight: 120,
                                overflowY: 'auto',
                              }}
                            >
                              {(mySquadInfo?.participants || []).map((p) => (
                                <div key={p.deviceId} style={{ fontSize: 12, opacity: 0.92 }}>
                                  {p.nickname || 'Без ника'} · {p.deviceId}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {canSeeOwnRequests && !isParentChildReadonlyView && (
                    <div
                      id="profile-badge-requests-mine"
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(0,0,0,0.32)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
                        Мои заявки
                      </div>
                      {badgeRequestsBusy || squadJoinRequestsBusy ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Загружаем заявки…</div>
                      ) : (
                        <>
                          {squadJoinRequestsError && (
                            <div style={{ fontSize: 12, marginBottom: 8 }}>
                              <span style={{ opacity: 0.8 }}>{squadJoinRequestsError}</span>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
                                onClick={loadMySquadJoinRequestsData}
                              >
                                Повторить
                              </button>
                            </div>
                          )}
                          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                            Заявки в отряды
                          </div>
                          {squadJoinRequestsMine.length === 0 ? (
                            <div
                              style={{
                                fontSize: 12,
                                opacity: 0.8,
                                marginBottom: canRequestApprovals ? 12 : 0,
                              }}
                            >
                              Заявок в отряды пока нет.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                maxHeight: 220,
                                overflowY: 'auto',
                                marginBottom: canRequestApprovals ? 12 : 0,
                              }}
                            >
                              {squadJoinRequestsMine.map((req) => {
                                const statusTone =
                                  req.status === 'approved'
                                    ? 'approved'
                                    : req.status === 'rejected'
                                      ? 'rejected'
                                      : 'pending';
                                const statusLabel =
                                  req.status === 'approved'
                                    ? 'Одобрено'
                                    : req.status === 'rejected'
                                      ? 'Отклонено'
                                      : 'На проверке';
                                return (
                                  <div
                                    key={req.id}
                                    style={{
                                      padding: 8,
                                      borderRadius: 8,
                                      background: 'rgba(0,0,0,0.2)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                        marginBottom: 4,
                                      }}
                                    >
                                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                                        Отряд: {req.squadName || req.squadId}
                                      </div>
                                      <span
                                        className={`m3-status-chip badge-request-status-chip tone-${statusTone}`}
                                      >
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                                      {new Date(req.createdAt).toLocaleString('ru-RU')}
                                    </div>
                                    {req.message && (
                                      <div style={{ fontSize: 11, opacity: 0.72, marginTop: 4 }}>
                                        {req.message}
                                      </div>
                                    )}
                                    {req.status === 'rejected' && req.resolutionNote && (
                                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                                        Причина: {req.resolutionNote}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {canRequestApprovals && (
                            <>
                              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                                Заявки на значки
                              </div>
                              {badgeRequestsError ? (
                                <div style={{ fontSize: 12 }}>
                                  <span style={{ opacity: 0.8 }}>{badgeRequestsError}</span>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11 }}
                                    onClick={loadBadgeApprovalsData}
                                  >
                                    Повторить
                                  </button>
                                </div>
                              ) : badgeRequestsMine.length === 0 ? (
                                <div style={{ fontSize: 12, opacity: 0.8 }}>
                                  Заявок пока нет. Подтверди уровень значка, чтобы отправить первую.{' '}
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: 11, marginTop: 6 }}
                                    onClick={() => {
                                      setActiveTab('active');
                                      setTimeout(() => {
                                        document
                                          .getElementById('profile-tab-active')
                                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 80);
                                    }}
                                  >
                                    К значкам «В пути»
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    maxHeight: 260,
                                    overflowY: 'auto',
                                  }}
                                >
                                  {badgeRequestsMine.map((req) => {
                                    const statusTone =
                                      req.status === 'approved'
                                        ? 'approved'
                                        : req.status === 'rejected'
                                          ? 'rejected'
                                          : 'pending';
                                    const statusLabel =
                                      req.status === 'approved'
                                        ? 'Одобрено'
                                        : req.status === 'rejected'
                                          ? 'Отклонено'
                                          : 'На проверке';
                                    return (
                                      <div
                                        key={req.id}
                                        style={{
                                          padding: 8,
                                          borderRadius: 8,
                                          background: 'rgba(0,0,0,0.2)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: 8,
                                            flexWrap: 'wrap',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <div style={{ fontSize: 12, fontWeight: 700 }}>
                                            {req.badgeTitle || req.levelId}
                                            {req.badgeTitle && (
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  opacity: 0.6,
                                                  fontWeight: 400,
                                                  marginLeft: 4,
                                                }}
                                              >
                                                {req.levelId}
                                              </span>
                                            )}
                                          </div>
                                          <span
                                            className={`m3-status-chip badge-request-status-chip tone-${statusTone}`}
                                          >
                                            {statusLabel}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 11, opacity: 0.6 }}>
                                          {new Date(req.createdAt).toLocaleString('ru-RU')}
                                        </div>
                                        {req.status === 'rejected' && req.resolutionNote && (
                                          <div
                                            style={{
                                              fontSize: 11,
                                              opacity: 0.55,
                                              marginTop: 4,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              maxWidth: '100%',
                                            }}
                                            title={req.resolutionNote}
                                          >
                                            Причина:{' '}
                                            {req.resolutionNote.length > 100
                                              ? req.resolutionNote.slice(0, 100) + '…'
                                              : req.resolutionNote}
                                          </div>
                                        )}
                                        {req.status === 'approved' && (
                                          <button
                                            type="button"
                                            className="btn-secondary"
                                            style={{
                                              marginTop: 8,
                                              padding: '5px 12px',
                                              fontSize: 11,
                                            }}
                                            disabled={approvalsSyncBusy}
                                            onClick={syncApprovedLevels}
                                          >
                                            {approvalsSyncBusy
                                              ? 'Синхронизируем…'
                                              : 'Синхронизировать'}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {canModerateApprovals && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(0,0,0,0.32)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
                        Входящие заявки
                        {badgeRequestsInbox.filter((r) => r.status === 'pending').length > 0
                          ? ` (${badgeRequestsInbox.filter((r) => r.status === 'pending').length})`
                          : ''}
                      </div>
                      {badgeRequestsInbox.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Входящих заявок нет.</div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            maxHeight: 360,
                            overflowY: 'auto',
                          }}
                        >
                          {badgeRequestsInbox.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                padding: 8,
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700 }}>
                                {req.levelId} {req.badgeTitle ? `· ${req.badgeTitle}` : ''}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.8 }}>
                                {req.requestedBy?.nickname || req.requestedBy?.deviceId || '—'}
                                {req.squadId && (
                                  <span style={{ opacity: 0.6 }}> · отряд {req.squadId}</span>
                                )}
                                <span style={{ opacity: 0.6 }}>
                                  {' '}
                                  · {new Date(req.createdAt).toLocaleString('ru-RU')}
                                </span>
                              </div>
                              {req.evidence &&
                                (req.evidence.reflection ||
                                  req.evidence.impact ||
                                  req.evidence.link) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEvidenceExpandedId(
                                          evidenceExpandedId === req.id ? null : req.id
                                        )
                                      }
                                      style={{
                                        fontSize: 11,
                                        opacity: 0.6,
                                        background: 'none',
                                        border: 'none',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        padding: 0,
                                        marginTop: 4,
                                      }}
                                    >
                                      {evidenceExpandedId === req.id
                                        ? 'Скрыть пруф ▲'
                                        : 'Показать пруф ▼'}
                                    </button>
                                    {evidenceExpandedId === req.id && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          opacity: 0.7,
                                          marginTop: 4,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 2,
                                        }}
                                      >
                                        {req.evidence.reflection && (
                                          <span>Рефлексия: {req.evidence.reflection}</span>
                                        )}
                                        {req.evidence.impact && (
                                          <span>Результат: {req.evidence.impact}</span>
                                        )}
                                        {req.evidence.link && (
                                          <a
                                            href={req.evidence.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: 'inherit' }}
                                          >
                                            Ссылка
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              {req.status === 'pending' && (
                                <>
                                  <div
                                    style={{
                                      marginTop: 8,
                                      display: 'flex',
                                      gap: 8,
                                      flexWrap: 'wrap',
                                    }}
                                  >
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
                                          setBadgeRequestsInbox((prev) =>
                                            prev.filter((r) => r.id !== req.id)
                                          );
                                          showHint({
                                            title: 'Заявка обработана',
                                            content: 'Одобрение применено.',
                                          });
                                          void loadBadgeApprovalsData();
                                        } catch (e) {
                                          setBadgeRequestsError(
                                            e instanceof Error
                                              ? e.message
                                              : 'Не удалось подтвердить заявку.'
                                          );
                                        } finally {
                                          setBadgeRequestsBusy(false);
                                        }
                                      }}
                                    >
                                      Одобрить
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ padding: '6px 12px', fontSize: 12 }}
                                      disabled={badgeRequestsBusy}
                                      onClick={() => {
                                        setRejectExpandedId(req.id);
                                        setRejectNote('');
                                      }}
                                    >
                                      Отклонить
                                    </button>
                                  </div>
                                  {rejectExpandedId === req.id && (
                                    <div
                                      style={{
                                        marginTop: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                      }}
                                    >
                                      <textarea
                                        placeholder="Причина отказа (необязательно)"
                                        maxLength={200}
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        style={{
                                          width: '100%',
                                          minHeight: 56,
                                          fontSize: 12,
                                          borderRadius: 8,
                                          padding: 6,
                                          background: 'rgba(255,255,255,0.06)',
                                          border: '1px solid rgba(255,255,255,0.15)',
                                          color: 'inherit',
                                          resize: 'vertical',
                                          boxSizing: 'border-box',
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: '6px 12px', fontSize: 12 }}
                                          disabled={badgeRequestsBusy}
                                          onClick={async () => {
                                            setBadgeRequestsBusy(true);
                                            setBadgeRequestsError(null);
                                            try {
                                              await rejectBadgeRequest(
                                                accessToken || '',
                                                req.id,
                                                rejectNote.trim() || undefined
                                              );
                                              setBadgeRequestsInbox((prev) =>
                                                prev.filter((r) => r.id !== req.id)
                                              );
                                              setRejectExpandedId(null);
                                              setRejectNote('');
                                              showHint({
                                                title: 'Заявка обработана',
                                                content: 'Отклонено.',
                                              });
                                              void loadBadgeApprovalsData();
                                            } catch (e) {
                                              setBadgeRequestsError(
                                                e instanceof Error
                                                  ? e.message
                                                  : 'Не удалось отклонить заявку.'
                                              );
                                            } finally {
                                              setBadgeRequestsBusy(false);
                                            }
                                          }}
                                        >
                                          Отклонить
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: '6px 12px', fontSize: 12 }}
                                          onClick={() => {
                                            setRejectExpandedId(null);
                                            setRejectNote('');
                                          }}
                                        >
                                          Отмена
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Workshop Proposals Inbox ── */}
                  {canModerateApprovals &&
                    (() => {
                      const pendingCount = wpInbox.filter((p) => p.status === 'pending').length;
                      return (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.32)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            marginTop: 12,
                          }}
                        >
                          <div
                            style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}
                          >
                            🔨 Предложения Мастерской{pendingCount > 0 ? ` (${pendingCount})` : ''}
                          </div>
                          {wpInbox.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                              Нет входящих предложений.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                maxHeight: 360,
                                overflowY: 'auto',
                              }}
                            >
                              {wpInbox.map((proposal) => (
                                <div
                                  key={proposal.id}
                                  style={{
                                    padding: 8,
                                    borderRadius: 8,
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                                    {proposal.type === 'category'
                                      ? '📁'
                                      : proposal.type === 'version'
                                        ? '🔄'
                                        : proposal.type === 'art'
                                          ? '🎨'
                                          : '🏅'}{' '}
                                    {proposal.title}
                                  </div>
                                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                                    {proposal.type === 'category'
                                      ? 'Категория'
                                      : proposal.type === 'version'
                                        ? 'Версия'
                                        : proposal.type === 'art'
                                          ? 'Арт'
                                          : 'Значок'}
                                    {' · '}
                                    {proposal.createdBy?.nickname || '—'}
                                    <span style={{ opacity: 0.6 }}>
                                      {' '}
                                      · {new Date(proposal.createdAt).toLocaleString('ru-RU')}
                                    </span>
                                  </div>
                                  {proposal.description && (
                                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                                      {proposal.description.slice(0, 200)}
                                    </div>
                                  )}
                                  {proposal.status === 'pending' && (
                                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        className="btn-primary-gold"
                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                        disabled={wpInboxBusy}
                                        onClick={async () => {
                                          setWpInboxBusy(true);
                                          try {
                                            // using static import: approveProposal
                                            await approveProposal(accessToken || '', proposal.id);
                                            setWpInbox((prev) =>
                                              prev.filter((p) => p.id !== proposal.id)
                                            );
                                            showHint({
                                              title: 'Одобрено',
                                              content: `Предложение «${proposal.title}» одобрено.`,
                                            });
                                          } catch (e: any) {
                                            showHint({
                                              title: 'Ошибка',
                                              content: e?.message || 'Не удалось одобрить.',
                                            });
                                          } finally {
                                            setWpInboxBusy(false);
                                          }
                                        }}
                                      >
                                        Одобрить
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                        disabled={wpInboxBusy}
                                        onClick={async () => {
                                          setWpInboxBusy(true);
                                          try {
                                            // using static import: rejectProposal
                                            await rejectProposal(accessToken || '', proposal.id);
                                            setWpInbox((prev) =>
                                              prev.filter((p) => p.id !== proposal.id)
                                            );
                                            showHint({
                                              title: 'Отклонено',
                                              content: `Предложение «${proposal.title}» отклонено.`,
                                            });
                                          } catch (e: any) {
                                            showHint({
                                              title: 'Ошибка',
                                              content: e?.message || 'Не удалось отклонить.',
                                            });
                                          } finally {
                                            setWpInboxBusy(false);
                                          }
                                        }}
                                      >
                                        Отклонить
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>
              ))}

            {eventsTab === 'plans' && canModerateApprovals && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 14px' }}
                    disabled={plansInboxBusy}
                    onClick={async () => {
                      if (!accessToken) return;
                      setPlansInboxBusy(true);
                      setPlansInboxError(null);
                      try {
                        setPlansInbox(await fetchPlansInbox(accessToken));
                      } catch (e) {
                        setPlansInboxError(
                          e instanceof Error ? e.message : 'Ошибка загрузки планов'
                        );
                      } finally {
                        setPlansInboxBusy(false);
                      }
                    }}
                  >
                    {plansInboxBusy ? 'Загрузка…' : 'Обновить'}
                  </button>
                </div>
                {plansInboxError && (
                  <div className="profile-error profile-error--not-found">{plansInboxError}</div>
                )}

                {plansInboxBusy ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Загружаем планы…</div>
                ) : plansInbox.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Планов на проверку нет.</div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}
                  >
                    {plansInbox.map((plan) => (
                      <div
                        key={plan.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            Значок {plan.badgeId}
                            {plan.levelId ? ` · ${plan.levelId}` : ''}
                          </div>
                          <span
                            className={`m3-status-chip badge-request-status-chip tone-${plan.status === 'approved' ? 'approved' : plan.status === 'rejected' ? 'rejected' : 'pending'}`}
                          >
                            {plan.status === 'approved'
                              ? 'Одобрен'
                              : plan.status === 'rejected'
                                ? 'Отклонён'
                                : 'На проверке'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>
                          {plan.deviceId ? `Участник: ${plan.deviceId.slice(0, 8)}…` : ''}
                          {plan.campId ? ` · смена ${plan.campId}` : ''}
                          <span style={{ opacity: 0.6 }}>
                            {' '}
                            · {new Date(plan.updatedAt || plan.createdAt).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        {plan.planText && (
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.85,
                              marginBottom: 6,
                              maxHeight: 80,
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.4,
                            }}
                          >
                            {plan.planText.length > 200
                              ? plan.planText.slice(0, 200) + '…'
                              : plan.planText}
                          </div>
                        )}
                        {plan.checklist && plan.checklist.length > 0 && (
                          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                            Шаги:{' '}
                            {plan.checklist
                              .map((item, i) => `${i + 1}. ${item.text}${item.done ? ' ✓' : ''}`)
                              .join('; ')
                              .slice(0, 160)}
                            {plan.checklist.length > 3 ? '…' : ''}
                          </div>
                        )}
                        {plan.status === 'submitted' && (
                          <>
                            <div
                              style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}
                            >
                              <button
                                type="button"
                                className="btn-primary-gold"
                                style={{ padding: '6px 12px', fontSize: 12 }}
                                disabled={plansInboxBusy}
                                onClick={async () => {
                                  setPlansInboxBusy(true);
                                  setPlansInboxError(null);
                                  try {
                                    await reviewPlan(accessToken || '', plan.id, 'approved');
                                    setPlansInbox((prev) => prev.filter((p) => p.id !== plan.id));
                                    showHint({
                                      title: 'План одобрен',
                                      content: 'Одобрение применено.',
                                    });
                                  } catch (e) {
                                    setPlansInboxError(
                                      e instanceof Error ? e.message : 'Ошибка одобрения плана.'
                                    );
                                  } finally {
                                    setPlansInboxBusy(false);
                                  }
                                }}
                              >
                                Одобрить
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 12 }}
                                disabled={plansInboxBusy}
                                onClick={() => {
                                  setPlanRejectExpandedId(plan.id);
                                  setPlanRejectNote('');
                                }}
                              >
                                Отклонить
                              </button>
                            </div>
                            {planRejectExpandedId === plan.id && (
                              <div
                                style={{
                                  marginTop: 8,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 6,
                                }}
                              >
                                <textarea
                                  placeholder="Комментарий (необязательно)"
                                  maxLength={200}
                                  value={planRejectNote}
                                  onChange={(e) => setPlanRejectNote(e.target.value)}
                                  style={{
                                    width: '100%',
                                    minHeight: 56,
                                    fontSize: 12,
                                    borderRadius: 8,
                                    padding: 6,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    disabled={plansInboxBusy}
                                    onClick={async () => {
                                      setPlansInboxBusy(true);
                                      setPlansInboxError(null);
                                      try {
                                        await reviewPlan(
                                          accessToken || '',
                                          plan.id,
                                          'rejected',
                                          planRejectNote.trim() || undefined
                                        );
                                        setPlansInbox((prev) =>
                                          prev.filter((p) => p.id !== plan.id)
                                        );
                                        setPlanRejectExpandedId(null);
                                        setPlanRejectNote('');
                                        showHint({
                                          title: 'План отклонён',
                                          content: 'Отклонение применено.',
                                        });
                                      } catch (e) {
                                        setPlansInboxError(
                                          e instanceof Error
                                            ? e.message
                                            : 'Ошибка отклонения плана.'
                                        );
                                      } finally {
                                        setPlansInboxBusy(false);
                                      }
                                    }}
                                  >
                                    Отклонить
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    onClick={() => {
                                      setPlanRejectExpandedId(null);
                                      setPlanRejectNote('');
                                    }}
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {plan.counselorNote && (
                          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                            Комментарий: {plan.counselorNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {eventsTab === 'tasks' &&
              canModerateApprovals &&
              (() => {
                const tasks = userData?.educatorTasks || [];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <h4 style={{ margin: '0 0 8px', color: '#FFD700', fontSize: 14 }}>
                        📝 Создать задание
                      </h4>
                      <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 10px' }}>
                        Отправьте задание участникам — с кружка, курса или от педагога.
                      </p>
                      <input
                        value={eduTaskForm.title}
                        onChange={(e) =>
                          setEduTaskForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Название задания"
                        className="w-input"
                        style={{ marginBottom: 6 }}
                      />
                      <textarea
                        value={eduTaskForm.description}
                        onChange={(e) =>
                          setEduTaskForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Описание задания..."
                        className="w-input"
                        style={{ minHeight: 70, marginBottom: 6 }}
                      />
                      <input
                        value={eduTaskForm.badgeId}
                        onChange={(e) =>
                          setEduTaskForm((prev) => ({ ...prev, badgeId: e.target.value }))
                        }
                        placeholder="ID значка (опционально, например 1.1)"
                        className="w-input"
                        style={{ marginBottom: 10 }}
                      />
                      <button
                        type="button"
                        className="btn-primary-gold"
                        style={{ width: '100%' }}
                        disabled={!eduTaskForm.title.trim()}
                        onClick={() => {
                          if (!eduTaskForm.title.trim()) return;
                          const newTask = {
                            id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            title: eduTaskForm.title.trim(),
                            description: eduTaskForm.description.trim(),
                            badgeId: eduTaskForm.badgeId.trim() || undefined,
                            assignedTo: [] as string[],
                            status: 'draft' as const,
                            createdAt: new Date().toISOString(),
                          };
                          try {
                            const raw = localStorage.getItem(progressStorageKey);
                            const data = raw ? JSON.parse(raw) : {};
                            data.educatorTasks = [...(data.educatorTasks || []), newTask];
                            localStorage.setItem(progressStorageKey, JSON.stringify(data));
                          } catch (_) {
                            /* ignore */
                          }
                          setEduTaskForm({ title: '', description: '', badgeId: '' });
                          showHint({
                            title: 'Задание создано',
                            content: `«${newTask.title}» добавлено в черновики.`,
                          });
                        }}
                      >
                        Создать задание
                      </button>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <h4
                        style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.9)', fontSize: 14 }}
                      >
                        Мои задания ({tasks.length})
                      </h4>
                      {tasks.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
                          Пока нет заданий. Создайте первое выше.
                        </p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {tasks.map((t) => (
                            <li
                              key={t.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '10px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                                {t.description && (
                                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                                    {t.description.slice(0, 80)}
                                    {t.description.length > 80 ? '…' : ''}
                                  </div>
                                )}
                                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3 }}>
                                  {t.status === 'draft'
                                    ? '⬜ Черновик'
                                    : t.status === 'assigned'
                                      ? '📤 Назначено'
                                      : '✅ Завершено'}
                                  {t.badgeId && <span> · Значок {t.badgeId}</span>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}
      {openBubble === 'backup' && (
        <div
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-backup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-backup-title">Резервная копия</span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
          </div>
          <div className="profile-utility-panel-body">
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              Прогресс хранится на этом устройстве. Сохрани резервную копию, чтобы не потерять
              данные. Предложения Мастерской (Мои предложения) входят в копию.
              {lastUpdated && (
                <span style={{ display: 'block', marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Данные актуальны на {lastUpdated}
                </span>
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => exportData({ customBadges })}
                className="btn-primary-gold"
                style={{ minWidth: '180px' }}
              >
                Сделать резервную копию
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="btn-secondary"
              >
                Восстановить из файла
              </button>
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
                  const base64url = base64
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                  const params = new URLSearchParams(window.location.search);
                  params.set('parent_view', base64url);
                  const parentViewLink = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                  if (parentViewLink.length <= 2000) {
                    navigator.clipboard?.writeText(parentViewLink).then(() => {
                      showHint({
                        title: 'Готово',
                        content: 'Ссылка скопирована. Отправьте её родителю.',
                      });
                    });
                  } else {
                    showHint({
                      title: 'Файл сохранён',
                      content: 'Ссылка слишком длинная — передайте родителю файл отчёта.',
                    });
                  }
                }}
              >
                Создать отчёт для родителя
              </button>
              {accessToken && role === 'participant' && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={parentCodeBusy}
                  onClick={async () => {
                    const payload = buildParentReportPayload(userData ?? null);
                    if (!payload) return;
                    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
                    const useLocalApi =
                      import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
                    const apiUrl = useLocalApi
                      ? '/api/parent-snapshot'
                      : `${(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
                    setParentCodeBusy(true);
                    setParentCodeResult(null);
                    try {
                      const res = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({
                          progress: payload.progress,
                          profile: payload.profile,
                          exportedAt: payload.exportedAt,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        if (res.status === 401)
                          showHint({
                            title: 'Ошибка',
                            content: 'Войдите как участник смены, чтобы создать код для родителя.',
                          });
                        else
                          showHint({
                            title: 'Ошибка',
                            content: data?.error || `Ошибка ${res.status}`,
                          });
                        return;
                      }
                      if (data.parentLinkCode != null) {
                        setParentCodeResult({
                          parentLinkCode: data.parentLinkCode,
                          expiresAt: data.expiresAt || 0,
                        });
                        setShowParentCodeModal(true);
                      } else {
                        showHint({ title: 'Ошибка', content: 'Неверный ответ сервера.' });
                      }
                    } catch (e) {
                      showHint({
                        title: 'Ошибка',
                        content: 'Не удалось создать код. Проверьте подключение.',
                      });
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
      {openBubble === 'staff-dashboard' && canModerateApprovals && (
        <div
          id="profile-staff-dashboard-panel"
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-staff-dashboard-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-staff-dashboard-title">Панель staff</span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
          </div>
          <div className="profile-utility-panel-body">
            <StaffDashboardPanel
              pendingRequests={badgeRequestsInbox.filter((r) => r.status === 'pending').length}
              pendingPlans={plansInbox.filter((p) => p.status === 'submitted').length}
              approvedToday={
                badgeRequestsInbox.filter((r) => {
                  if (r.status !== 'approved' || !r.resolvedAt) return false;
                  const d = new Date(r.resolvedAt);
                  const now = new Date();
                  return (
                    d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate()
                  );
                }).length
              }
              squadMembers={(mySquadInfo?.members || mySquadInfo?.participants || []).map((m) => ({
                deviceId: m.deviceId,
                nickname: m.nickname,
                role: 'role' in m ? (m as { role?: string }).role : undefined,
              }))}
              onOpenRequestsInbox={() => {
                setOpenBubble('events');
                setEventsTab('approvals');
              }}
              onOpenPlansInbox={() => {
                setOpenBubble('events');
                setEventsTab('plans');
                if (plansInbox.length === 0 && !plansInboxBusy && accessToken) {
                  setPlansInboxBusy(true);
                  setPlansInboxError(null);
                  fetchPlansInbox(accessToken)
                    .then((plans) => setPlansInbox(plans))
                    .catch((e) => setPlansInboxError(e instanceof Error ? e.message : 'Ошибка'))
                    .finally(() => setPlansInboxBusy(false));
                }
              }}
              onRefresh={async () => {
                if (!accessToken) return;
                await loadBadgeApprovalsData();
                await loadMySquadJoinRequestsData();
                await loadMySquadInfo();
                if (canModerateApprovals) {
                  setPlansInboxBusy(true);
                  fetchPlansInbox(accessToken)
                    .then((plans) => setPlansInbox(plans))
                    .catch(() => {})
                    .finally(() => setPlansInboxBusy(false));
                }
              }}
              busy={badgeRequestsBusy || squadJoinRequestsBusy || plansInboxBusy || mySquadBusy}
            />
          </div>
        </div>
      )}
      {openBubble === 'role' && (
        <div
          id="profile-role-panel"
          className="profile-utility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-panel-role-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="profile-utility-panel-header">
            <span id="profile-panel-role-title">Песочница: роль для теста</span>
            <button
              type="button"
              className="profile-utility-panel-close"
              onClick={() => setOpenBubble(null)}
              aria-label="Закрыть"
            >
              <Icons.Close />
            </button>
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
                    <span
                      className={`profile-sandbox-role__trigger-chevron ${roleDropdownOpen ? 'is-open' : ''}`}
                      aria-hidden
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path fill="currentColor" d="M6 8L1 3h10z" />
                      </svg>
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
                        onClick={() => {
                          setSandboxRole(r);
                          setRoleDropdownOpen(false);
                        }}
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
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>
                    Dev login (localhost)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(
                      [
                        'participant',
                        'parent',
                        'counselor',
                        'shift_leader',
                        'camp_director',
                        'developer',
                      ] as UserRole[]
                    ).map((targetRole) => (
                      <button
                        key={targetRole}
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px 12px' }}
                        disabled={devLoginBusyRole !== null}
                        onClick={() => void handleDevLoginAs(targetRole)}
                      >
                        {devLoginBusyRole === targetRole
                          ? 'Логинимся...'
                          : `Dev login: ${ROLE_LABELS[targetRole]}`}
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
                  <div style={{ fontSize: 11, opacity: 0.75 }}>
                    JWT: {accessToken ? 'активен' : 'нет токена'}
                  </div>
                  {devLoginError && (
                    <div className="profile-error profile-error--not-found">{devLoginError}</div>
                  )}
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
          <span
            className={`profile-view-cabin-nav-toggle-icon profile-view-cabin-nav-toggle-icon--${cabinNavExpanded ? 'right' : 'left'}`}
            aria-hidden
          >
            {cabinNavExpanded ? <Icons.ArrowRight /> : <Icons.ArrowLeft />}
          </span>
        </button>
      )}

      {isSpaceshipMode && (
        <button
          type="button"
          className="profile-view-mobile-nav-arrow-up"
          aria-label={mobileConsoleExpanded ? 'Свернуть пульт' : 'Развернуть пульт'}
          aria-expanded={mobileConsoleExpanded}
          onClick={() => setMobileConsoleExpanded((v) => !v)}
        >
          <span className="profile-view-mobile-nav-arrow-up__icon" aria-hidden>
            <Icons.ArrowUp />
          </span>
        </button>
      )}
      <div className="profile-view-outer" ref={profileOuterRef}>
        {profileOuterContent}
      </div>

      {showRankUpOverlay && (
        <div
          className="proof-modal-overlay"
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="proof-modal fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-rank-up-title"
            style={{ textAlign: 'center', maxWidth: '320px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <div
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.8,
                marginBottom: '8px',
              }}
            >
              Новый ранг
            </div>
            <h3
              id="profile-modal-rank-up-title"
              className={rank.includes('Легенда') ? 'profile-view-rank--legendary' : ''}
              style={{
                margin: '0 0 24px',
                color: rank.includes('Легенда') ? 'var(--legendary-accent, #b088c8)' : '#FFD700',
                fontSize: '22px',
              }}
            >
              {rank}
            </h3>
            <button
              type="button"
              onClick={() => {
                markRankUpSeen(currentLevels);
                // Sharing trigger: offer to create a social card for the new rank
                const toastKey = `rl_rank_share_toast_${currentLevels}`;
                if (typeof window !== 'undefined' && !localStorage.getItem(toastKey)) {
                  localStorage.setItem(toastKey, '1');
                  setTimeout(() => {
                    showHint({
                      title: `🎉 Новый ранг: ${rank}!`,
                      content: 'Создай карточку и поделись достижением с друзьями!',
                    });
                    if (isSpaceshipMode && typeof openCabinPanel === 'function') {
                      openCabinPanel('share', 'right');
                    }
                  }, 400);
                }
              }}
              className="btn-primary-gold"
              style={{ width: '100%' }}
            >
              Круто!
            </button>
          </div>
        </div>
      )}

      <PlannerModal />

      <InitiativeModal
        isOpen={initiativeModalOpen}
        onClose={() => setInitiativeModalOpen(false)}
        myTeam={myTeam}
        showHint={showHint}
        defaultDay={userData?.diaryProgress?.currentDay ?? 1}
      />

      <ProofModal />

      {showChildBadges && (
        <div
          className="proof-modal-overlay"
          onClick={() => {
            setShowChildBadges(false);
            setChildProgressFromFile(null);
            setChildReportMeta(null);
          }}
        >
          <div
            className="proof-modal proof-modal--mobile-sheet proof-modal--wide fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-child-badges-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="profile-modal-child-badges-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Значки моего ребёнка
            </h3>
            <p style={{ fontSize: 12, opacity: 0.78, marginTop: 0, marginBottom: 8 }}>
              {PARENT_READONLY_BADGE_TEXT}. Изменения прогресса ребёнка из этого режима недоступны.
            </p>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
              Ребёнок может создать отчёт по кнопке «Создать отчёт для родителя» в своём профиле и
              передать вам файл, ссылку или код.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
                Ввести код от ребёнка
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <input
                  type="text"
                  value={parentCodeInput}
                  onChange={(e) => setParentCodeInput(e.target.value)}
                  placeholder="6–8 символов"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    const code = parentCodeInput.trim();
                    if (!code) return;
                    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
                    const useLocalApi =
                      import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
                    const apiUrl = useLocalApi
                      ? '/api/parent-snapshot'
                      : `${(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')}/api/parent-snapshot`;
                    try {
                      const res = await fetch(`${apiUrl}?code=${encodeURIComponent(code)}`);
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        showHint({
                          title: 'Ошибка',
                          content:
                            res.status === 404 || res.status === 410
                              ? 'Код не найден или срок действия истёк.'
                              : data?.error || 'Ошибка загрузки',
                        });
                        return;
                      }
                      if (data && typeof data.progress === 'object') {
                        setChildProgressFromFile(data.progress);
                        setChildReportMeta(
                          data.profile?.nickname != null || data.exportedAt
                            ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt }
                            : null
                        );
                        setParentSnapshotCode(code);
                        setParentCodeInput('');
                      }
                    } catch {
                      showHint({
                        title: 'Ошибка',
                        content: 'Не удалось загрузить данные по коду.',
                      });
                    }
                  }}
                >
                  Открыть
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
                Открыть по ссылке от ребёнка
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={parentViewLinkInput}
                  onChange={(e) => setParentViewLinkInput(e.target.value)}
                  placeholder="Вставьте ссылку или только parent_view=..."
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const raw = parentViewLinkInput.trim();
                    if (!raw) return;
                    try {
                      const encoded = raw.startsWith('http')
                        ? new URL(raw).searchParams.get('parent_view')
                        : new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw).get(
                            'parent_view'
                          );
                      if (!encoded) throw new Error('Нет параметра parent_view');
                      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
                      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
                      const json = decodeURIComponent(
                        escape(typeof atob !== 'undefined' ? atob(padded) : '')
                      );
                      const data = JSON.parse(json) as ParentReportPayload;
                      if (!data || typeof data.progress !== 'object')
                        throw new Error('Неверный формат');
                      setChildProgressFromFile(data.progress);
                      setChildReportMeta(
                        data.profile?.nickname != null || data.exportedAt
                          ? { nickname: data.profile?.nickname, exportedAt: data.exportedAt }
                          : null
                      );
                      setParentViewLinkInput('');
                    } catch {
                      showHint({
                        title: 'Ошибка',
                        content:
                          'Не удалось открыть ссылку. Проверьте, что это ссылка от ребёнка с отчётом для родителя.',
                      });
                    }
                  }}
                >
                  Открыть
                </button>
              </div>
            </div>
            <input
              type="file"
              accept=".json,application/json"
              style={{ marginBottom: 12 }}
              onChange={(e) => {
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
                      setChildReportMeta({
                        nickname: data.profile?.nickname,
                        exportedAt: data.exportedAt,
                      });
                    } else {
                      setChildReportMeta(null);
                    }
                  } catch {
                    showHint({
                      title: 'Ошибка',
                      content:
                        'Не удалось прочитать файл. Выберите JSON-файл экспорта из профиля ребёнка.',
                    });
                  }
                };
                reader.readAsText(f);
                e.target.value = '';
              }}
            />
            {childProgressFromFile && (
              <div style={{ marginTop: 12 }}>
                {childReportMeta?.nickname != null || childReportMeta?.exportedAt ? (
                  <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                    Отчёт:{' '}
                    {[
                      childReportMeta.nickname,
                      childReportMeta.exportedAt
                        ? new Date(childReportMeta.exportedAt).toLocaleDateString('ru-RU')
                        : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : null}
                {Object.entries(childProgressFromFile).filter(([, p]) => p?.status === 'achieved')
                  .length === 0 ? (
                  <p style={{ opacity: 0.8, fontSize: 13 }}>
                    В этом файле нет подтверждённых достижений.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Object.entries(childProgressFromFile)
                      .filter(([, p]) => p?.status === 'achieved')
                      .map(([levelId]) => {
                        const badge = badgeLookupMap.get(getBaseId(levelId));
                        return (
                          <li
                            key={levelId}
                            style={{
                              padding: '8px 0',
                              borderBottom: '1px solid rgba(255,255,255,0.08)',
                              fontSize: 14,
                            }}
                          >
                            {badge?.emoji || '🏆'} {badge?.title || levelId}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setShowChildBadges(false);
                setChildProgressFromFile(null);
                setChildReportMeta(null);
              }}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {showParentCodeModal && parentCodeResult && (
        <div
          className="proof-modal-overlay"
          onClick={() => {
            setShowParentCodeModal(false);
            setParentCodeResult(null);
          }}
        >
          <div
            className="proof-modal proof-modal--mobile-sheet proof-modal--narrow fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-parent-code-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="profile-modal-parent-code-title" style={{ marginTop: 0, marginBottom: 12 }}>
              Код для родителя
            </h3>
            <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
              Передайте родителю этот код или ссылку. Код действителен 7 дней.
            </p>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: 4,
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.95)',
                  marginBottom: 12,
                }}
              >
                {parentCodeResult.parentLinkCode}
              </div>
              {typeof window !== 'undefined' && (
                <div
                  style={{
                    display: 'inline-block',
                    padding: 12,
                    background: '#fff',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <QRCodeSVG
                    value={`${window.location.origin}${window.location.pathname}?parent_code=${encodeURIComponent(parentCodeResult.parentLinkCode)}`}
                    size={160}
                    level="M"
                  />
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Ссылка:{' '}
                {`${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?parent_code=${parentCodeResult.parentLinkCode}`}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                const link =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${window.location.pathname}?parent_code=${encodeURIComponent(parentCodeResult.parentLinkCode)}`
                    : '';
                navigator.clipboard
                  ?.writeText(link)
                  .then(() => showHint({ title: 'Готово', content: 'Ссылка скопирована.' }));
              }}
            >
              Скопировать ссылку
            </button>
            <button
              type="button"
              onClick={() => {
                setShowParentCodeModal(false);
                setParentCodeResult(null);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <ChildRouteModal
        open={showChildRouteForm}
        value={childRouteText}
        onChange={setChildRouteText}
        onClose={() => {
          setShowChildRouteForm(false);
          setChildRouteText('');
        }}
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

      {/* A-2/A-3: Developer tools — visible for developers, or always in dev mode */}
      {(role === 'developer' || import.meta.env.DEV) && (
        <DevPanel
          currentRole={role}
          onRoleSwitch={(newRole) =>
            setAuth({ role: newRole as any, accessToken, campId: undefined })
          }
          onOpenDashboard={() => setShowAdminDashboard(true)}
          onOpenCabinet={() => setShowPersonalCabinet(true)}
          accessToken={accessToken}
        />
      )}
      {showAdminDashboard && (
        <AdminDashboard
          accessToken={accessToken || ''}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
      {showPersonalCabinet && <PersonalCabinet onBack={() => setShowPersonalCabinet(false)} />}
    </section>
  );
};

export default ProfileView;
