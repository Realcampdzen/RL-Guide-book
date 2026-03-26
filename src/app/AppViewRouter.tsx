import React, { Suspense, useCallback, useEffect, useState } from 'react';
import type { AppController } from './useAppController';
import AdditionalMaterialView from '../views/AdditionalMaterialView';
import IntroductionView from '../views/IntroductionView';
import RegistrationFormView from '../views/RegistrationFormView';
import GlobalCursor from '../components/GlobalCursor';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/authRole';
import { RoleSelectionModal } from '../components/RoleSelectionModal';
import type { RoleFlowResult } from '../components/RoleSelectionModal';

const ChatBot = React.lazy(() => import('../components/ChatBot'));
const ChatAvatar = React.lazy(() => import('../components/ChatAvatar'));

// Lazy load views for better performance
const BlueNestLanding = React.lazy(() => import('../components/BlueNestLanding'));
const MobileBottomNav = React.lazy(() => import('../components/MobileBottomNav'));
const AboutCampView = React.lazy(() => import('../views/AboutCampView'));
const CategoriesGrid = React.lazy(() => import('../components/CategoriesGrid'));
const CategoryView = React.lazy(() => import('../views/CategoryView'));
const BadgeView = React.lazy(() => import('../views/BadgeView'));
const BadgeLevelView = React.lazy(() => import('../views/BadgeLevelView'));
const ProfileView = React.lazy(() => import('../views/ProfileView').then(module => ({ default: module.ProfileView })));

type Props = {
  controller: AppController;
  fallback: React.ReactNode;
};

export const AppViewRouter: React.FC<Props> = ({ controller, fallback }) => {
  // ---------- Auth state for nav integration ----------
  const auth = useAuth();
  const isLoggedIn = !!(auth.role && auth.role !== 'traveler');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('rl-welcome-dismissed');
    const hasRole = localStorage.getItem('rl-selected-role');
    return !dismissed && !hasRole;
  });

  const handleProfileOrLogin = useCallback(() => {
    if (isLoggedIn) {
      controller.setCurrentView('profile');
    } else {
      setShowRoleModal(true);
    }
  }, [isLoggedIn, controller]);

  const handleRoleResult = useCallback((result: RoleFlowResult) => {
    switch (result.type) {
      case 'code-redeemed':
        auth.setAuth({ role: result.role as UserRole, accessToken: result.accessToken });
        setShowRoleModal(false);
        setShowWelcome(false);
        break;
      case 'request-sent':
        setShowRoleModal(false);
        setShowWelcome(false);
        break;
      case 'request-approved':
        auth.setAuth({ role: result.role as UserRole, accessToken: result.accessToken || undefined });
        setShowRoleModal(false);
        setShowWelcome(false);
        break;
      case 'dev-pin-ok':
        auth.setAuth({ role: 'developer' as UserRole });
        setShowRoleModal(false);
        setShowWelcome(false);
        break;
      case 'developer-oauth':
        // Legacy OAuth — handle redirect
        setShowRoleModal(false);
        break;
      case 'cancelled':
        setShowRoleModal(false);
        break;
    }
  }, [auth]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try { localStorage.setItem('rl-welcome-dismissed', '1'); } catch { /* */ }
  }, []);

  const deviceId = typeof window !== 'undefined'
    ? (localStorage.getItem('rl-device-id') || (() => { const id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('rl-device-id', id); return id; })())
    : 'anon';

  // Read PersonalCabinet context via lightweight CustomEvent (set by PersonalCabinet.tsx)
  const [cabinetDataset, setCabinetDataset] = useState<{
    section: string; sectionLabel: string; tab: string; tabLabel: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCabinetDataset(detail || null);
    };
    window.addEventListener('cabinet-context', handler);
    return () => window.removeEventListener('cabinet-context', handler);
  }, []);

  const {
    currentView,
    categories,
    badges,
    loading,
    selectedCategory,
    selectedBadge,
    selectedLevel,
    selectedAdditionalMaterial,
    formData,
    sortedCategories,
    categoryBadges,
    currentLevelBadgeTitle,
    categoryBadgeLoadState,
    categoryBadgeLoadError,
    masterIndex,
    introductionHtml,
    additionalMaterialHtml,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
    addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
    customBadges,
    communityBadges,
    communityPendingCount,
    communitySyncing,
    communityLikedIds,
    toggleCommunityLike,
    publishBadgeToCommunity,
    updateBadgeSkin,
    setCustomBadgeImage,
    dynamicBroMissions,
    updateBroMissionsOnServer,
    handleCategoryClick,
    handleBadgeClick,
    handleIntroClick,
    handleLogoClick,
    handleCategoryBack,
    handleBackToAboutCamp,
    handleBackToCategories,
    handleBackToCategory,
    handleBackToBadge,
    handleBackToIntro,
    handleBackToCategoryFromIntroduction,
    handleBackToCategoryFromAdditional,
    handleLevelClick,
    handleTelegramContact,
    handleAdditionalMaterialClick,
    handleIntroductionClick,
    handleFormInputChange,
    handleFormSubmit,
    handleOpenVk,
    setCurrentView,
    isChatOpen,
    toggleChat,
    closeChat,
  } = controller;

  const openBadgeById = React.useCallback(
    async (badgeId: string) => {
      if (!badgeId) return;
      const existing = badges.find((b) => b.id === badgeId);
      let target = existing;
      if (!target) {
        const entries = await ensureBadgeLoaded(badgeId);
        target = entries?.find((b) => b.id === badgeId) ?? entries?.[0];
      }
      if (!target) return;
      handleBadgeClick(target);
    },
    [badges, ensureBadgeLoaded, handleBadgeClick]
  );

  return (
    <Suspense fallback={fallback}>
      <GlobalCursor />
      {loading && (
        <BlueNestLanding
          onStartClick={handleIntroClick}
          onLogoClick={handleLogoClick}
          onAboutCampClick={() => setCurrentView('about-camp')}
          onCategoryClick={handleCategoryClick}
          onOpenBadgeById={openBadgeById}
          onOpenProfile={() => setCurrentView('profile')}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          categories={sortedCategories}
          currentView={currentView}
          selectedCategory={
            selectedCategory
              ? { id: selectedCategory.id, title: selectedCategory.title, emoji: selectedCategory.emoji }
              : undefined
          }
          selectedBadge={
            selectedBadge
              ? {
                  id: selectedBadge.id,
                  title: selectedBadge.title,
                  emoji: selectedBadge.emoji,
                  categoryId: selectedBadge.category_id,
                }
              : undefined
          }
          selectedLevel={selectedLevel || undefined}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
          masterIndex={masterIndex ?? undefined}
        />
      )}

      {!loading && currentView === 'intro' && (
        <BlueNestLanding
          onStartClick={handleIntroClick}
          onLogoClick={handleLogoClick}
          onAboutCampClick={() => setCurrentView('about-camp')}
          onCategoryClick={handleCategoryClick}
          onOpenBadgeById={openBadgeById}
          onOpenProfile={() => setCurrentView('profile')}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          categories={sortedCategories}
          currentView={currentView}
          selectedCategory={
            selectedCategory ? { id: selectedCategory.id, title: selectedCategory.title, emoji: selectedCategory.emoji } : undefined
          }
          selectedBadge={
            selectedBadge
              ? {
                  id: selectedBadge.id,
                  title: selectedBadge.title,
                  emoji: selectedBadge.emoji,
                  categoryId: selectedBadge.category_id,
                }
              : undefined
          }
          selectedLevel={selectedLevel || undefined}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
          masterIndex={masterIndex ?? undefined}
        />
      )}

      {!loading && currentView === 'categories' && (
        <CategoriesGrid
          categories={sortedCategories}
          masterIndex={masterIndex ?? undefined}
          communityBadges={communityBadges}
          communityLikedIds={communityLikedIds}
          toggleCommunityLike={toggleCommunityLike}
          onCategoryClick={handleCategoryClick}
          onCategoryPrefetch={(categoryId) => {
            void ensureCategoryBadgesLoaded(categoryId);
          }}
          onBackClick={() => setCurrentView('intro')}
          onAboutCampClick={() => setCurrentView('about-camp')}
          onTelegramContact={handleTelegramContact}
          onOpenProfile={() => setCurrentView('profile')}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          currentView={currentView}
          selectedCategory={
            selectedCategory ? { id: selectedCategory.id, title: selectedCategory.title, emoji: selectedCategory.emoji } : undefined
          }
          selectedBadge={
            selectedBadge
              ? { id: selectedBadge.id, title: selectedBadge.title, emoji: selectedBadge.emoji, categoryId: selectedBadge.category_id }
              : undefined
          }
          selectedLevel={selectedLevel || undefined}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
        />
      )}

      {!loading && currentView === 'category' && selectedCategory && (
        <CategoryView
          category={selectedCategory}
          badges={categoryBadges}
          isLoadingBadges={categoryBadgeLoadState[selectedCategory.id] === 'loading'}
          errorState={
            categoryBadgeLoadState[selectedCategory.id] === 'error'
              ? { message: categoryBadgeLoadError[selectedCategory.id] || 'Ошибка загрузки' }
              : undefined
          }
          onRetryBadges={() => void ensureCategoryBadgesLoaded(selectedCategory.id)}
          onBack={handleCategoryBack}
          onBadgeClick={handleBadgeClick}
          onIntroductionClick={handleIntroductionClick}
          onAdditionalMaterialClick={handleAdditionalMaterialClick}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          onOpenCategories={handleBackToCategories}
          onTelegramContact={handleTelegramContact}
          onBackToIntro={handleBackToIntro}
        />
      )}

      {!loading && currentView === 'badge' && selectedCategory && selectedBadge && (
        <BadgeView
          category={selectedCategory}
          badge={selectedBadge}
          badges={badges}
          onBack={handleBackToCategory}
          onLevelSelect={handleLevelClick}
          onBadgeClick={handleBadgeClick}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          onOpenCategories={handleBackToCategories}
          onTelegramContact={handleTelegramContact}
          onBackToIntro={handleBackToIntro}
        />
      )}

      {!loading && currentView === 'badge-level' && selectedCategory && selectedBadge && selectedLevel && (
        <BadgeLevelView
          category={selectedCategory}
          badge={selectedBadge}
          level={selectedLevel}
          badges={badges}
          onBack={handleBackToBadge}
          onChangeLevel={handleLevelClick}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
          onOpenCategories={handleBackToCategories}
          onTelegramContact={handleTelegramContact}
          onBackToIntro={handleBackToIntro}
        />
      )}

      {!loading && currentView === 'about-camp' && (
        <AboutCampView
          onBack={handleBackToIntro}
          categories={categories}
          contentYear={masterIndex ? (masterIndex.lastUpdated || '').slice(0, 4) : undefined}
          onOpenCategory={(category) => handleCategoryClick(category, { origin: 'about-camp' })}
          onOpenCategories={handleBackToCategories}
          onTelegramContact={handleTelegramContact}
          onChatToggle={toggleChat}
          isChatOpen={isChatOpen}
          onChatClose={closeChat}
        />
      )}

      {/* Global ChatBot overlay + floating avatar — works on every view */}
      {!loading && currentView !== 'intro' && currentView !== 'categories' && currentView !== 'about-camp' && (
        <Suspense fallback={null}>
          <ChatAvatar onClick={toggleChat} isOpen={isChatOpen} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ChatBot
          isOpen={isChatOpen}
          onClose={closeChat}
          currentView={currentView}
          currentCategory={selectedCategory ? { id: selectedCategory.id, title: selectedCategory.title, emoji: selectedCategory.emoji } : undefined}
          currentBadge={selectedBadge ? { id: selectedBadge.id, title: selectedBadge.title, emoji: selectedBadge.emoji, categoryId: selectedBadge.category_id } : undefined}
          currentLevel={selectedLevel || undefined}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
          cabinetContext={cabinetDataset || undefined}
        />
      </Suspense>
      {!loading && (
        <MobileBottomNav
          currentView={currentView}
          onHome={handleBackToIntro}
          onCategories={handleBackToCategories}
          onProfile={handleProfileOrLogin}
          onAboutCamp={() => setCurrentView('about-camp')}
          onTelegramContact={handleTelegramContact}
          onOpenVk={handleOpenVk}
          isLoggedIn={isLoggedIn}
        />
      )}

      {/* Role Selection Modal (triggered by nav "Войти") */}
      {showRoleModal && (
        <RoleSelectionModal
          onResult={handleRoleResult}
          deviceId={deviceId}
        />
      )}

      {/* Welcome banner for first-time visitors */}
      {!loading && showWelcome && !isLoggedIn && currentView === 'intro' && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1099, width: 'min(360px, calc(100% - 32px))',
          background: 'linear-gradient(135deg, rgba(30,27,55,0.96), rgba(20,17,42,0.98))',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 16, padding: '20px 24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
          animation: 'rl-welcome-slide-in 0.5s ease-out',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            🏕️ Добро пожаловать!
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 14 }}>
            Выберите роль, чтобы открыть доступ к Личному Кабинету
          </div>
          <button type="button" onClick={() => { dismissWelcome(); setShowRoleModal(true); }}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s',
            }}>
            Войти / Выбрать роль
          </button>
          <button type="button" onClick={dismissWelcome}
            style={{
              display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer',
            }}>
            Пропустить
          </button>
        </div>
      )}

      <style>{`
        @keyframes rl-welcome-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {!loading && currentView === 'introduction' && selectedCategory?.introduction?.has_introduction && introductionHtml && (
        <IntroductionView title={`💡 Подсказка: ${selectedCategory.title}`} contentHtml={introductionHtml} onBack={handleBackToCategoryFromIntroduction} />
      )}

      {!loading && currentView === 'additional-material' && selectedAdditionalMaterial && additionalMaterialHtml && (
        <AdditionalMaterialView
          title={selectedAdditionalMaterial.title}
          contentHtml={additionalMaterialHtml}
          onBack={handleBackToCategoryFromAdditional}
        />
      )}

      {!loading && currentView === 'registration-form' && (
        <RegistrationFormView formData={formData} onBack={handleBackToAboutCamp} onChange={handleFormInputChange} onSubmit={handleFormSubmit} />
      )}

      {!loading && currentView === 'profile' && (
        <ProfileView 
          onBack={handleBackToCategories} 
          badges={badges}
          categories={categories}
          lastUpdated={masterIndex?.lastUpdated}
          ensureBadgeLoaded={ensureBadgeLoaded}
          addCustomBadge={addCustomBadge}
          restoreCustomBadges={restoreCustomBadges}
          removeCustomBadge={removeCustomBadge}
          customBadges={customBadges}
          communityBadges={communityBadges}
          communityPendingCount={communityPendingCount}
          communitySyncing={communitySyncing}
          communityLikedIds={communityLikedIds}
          toggleCommunityLike={toggleCommunityLike}
          publishBadgeToCommunity={publishBadgeToCommunity}
          updateBadgeSkin={updateBadgeSkin}
          setCustomBadgeImage={setCustomBadgeImage}
          dynamicBroMissions={dynamicBroMissions}
          updateBroMissionsOnServer={updateBroMissionsOnServer}
          onChatToggle={toggleChat}
          onChatClose={closeChat}
          isChatOpen={isChatOpen}
          onNavigateToRegistrationForm={() => setCurrentView('registration-form')}
          onNavigateHome={handleBackToIntro}
          onNavigateCategories={handleBackToCategories}
          onNavigateAboutCamp={() => setCurrentView('about-camp')}
          onTelegramContact={handleTelegramContact}
          onOpenVk={handleOpenVk}
          onNavigateToBadge={(badgeId: string) => {
            const openBadge = (window as any).openBadgeById;
            if (typeof openBadge === 'function') {
              openBadge(badgeId, { origin: 'profile' });
            }
          }} 
        />
      )}
    </Suspense>
  );
};

