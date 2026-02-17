import React, { Suspense } from 'react';
import type { AppController } from './useAppController';
import AdditionalMaterialView from '../views/AdditionalMaterialView';
import IntroductionView from '../views/IntroductionView';
import RegistrationFormView from '../views/RegistrationFormView';
import GlobalCursor from '../components/GlobalCursor';

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

      {/* ChatBot and ChatAvatar are handled inside BlueNestLanding and CategoriesGrid */}
      {!loading && (
        <MobileBottomNav
          currentView={currentView}
          onHome={handleBackToIntro}
          onCategories={handleBackToCategories}
          onProfile={() => setCurrentView('profile')}
          onAboutCamp={() => setCurrentView('about-camp')}
          onTelegramContact={handleTelegramContact}
          onOpenVk={handleOpenVk}
        />
      )}

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

