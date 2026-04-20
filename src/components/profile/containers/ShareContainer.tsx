import React, { useEffect } from 'react';
import { useShareCenter, type ShareTabId } from '../../../hooks/profile/useShareCenter';
import { useTeam } from '../../../context/TeamContext';

interface ShareContainerProps {
  shareActiveTab: ShareTabId;
  nickname?: string;
  avatar?: string;
  rank: string;
  totalLevelsAchieved: number;
  totalBadgesStarted: number;
  badgeTitlesInPath: string[];
  favoriteBadgeTitles: string[];
  badgeCarouselItems: any[];
}

export const ShareContainer: React.FC<ShareContainerProps> = ({
  shareActiveTab,
  nickname,
  avatar,
  rank,
  totalLevelsAchieved,
  totalBadgesStarted,
  badgeTitlesInPath,
  favoriteBadgeTitles,
  badgeCarouselItems,
}) => {
  const { myTeam, generateInviteUrl } = useTeam();
  const {
    shareActiveTab: localTab,
    setShareActiveTab,
    shareBusy,
    shareStatus,
    shareHideNickname,
    setShareHideNickname,
    shareStoryUrl,
    shareWideUrl,
    shareStoryResult,
    shareWideResult,
    generateCards,
    shareOrDownloadSocialCard,
  } = useShareCenter({
    nickname,
    avatar,
    rank,
    totalLevelsAchieved,
    totalBadgesStarted,
    badgeTitlesInPath,
    favoriteBadgeTitles,
    badgeCarouselItems,
  });

  // Sync external tab state
  useEffect(() => {
    setShareActiveTab(shareActiveTab);
  }, [shareActiveTab, setShareActiveTab]);

  return (
    <div
      className="profile-view-share-row"
      role="tabpanel"
      id="share-tabpanel"
      aria-labelledby={`share-tab-${localTab}`}
    >
      {localTab === 'create-card' && (
        <div id="profile-share-center" className="share-panel">
          <div className="share-panel__icon" aria-hidden="true">📤</div>
          <h3 className="share-panel__title">Шеринг достижений</h3>
          
          <label className="share-panel__toggle">
            <input
              type="checkbox"
              className="share-panel__toggle-input"
              checked={shareHideNickname}
              onChange={(e) => setShareHideNickname(e.target.checked)}
            />
            <span className="share-panel__toggle-track" aria-hidden />
            <span>Скрыть ник</span>
          </label>
          
          <button 
            type="button" 
            onClick={generateCards} 
            disabled={shareBusy} 
            className="btn-solid-purple"
          >
            {shareBusy ? shareStatus || 'Генерируем…' : 'Создать карточку'}
          </button>

          {(shareStoryUrl || shareWideUrl) && (
            <div className="share-panel__results-grid">
              {shareStatus && !shareBusy && (
                <div style={{ gridColumn: '1 / -1', fontSize: '13px', opacity: 0.9, textAlign: 'center' }}>
                  {shareStatus}
                </div>
              )}

              {shareStoryUrl && shareStoryResult && (
                <div className="share-panel__result-item">
                  <div className="share-panel__result-label">Сторис 9:16</div>
                  <img
                    src={shareStoryUrl}
                    alt="Сгенерированная Сторис"
                    className="share-panel__result-image"
                  />
                  <button
                    type="button"
                    onClick={() => shareOrDownloadSocialCard(shareStoryResult)}
                    className="btn-solid-ghost"
                  >
                    Поделиться / скачать
                  </button>
                </div>
              )}

              {shareWideUrl && shareWideResult && (
                <div className="share-panel__result-item">
                  <div className="share-panel__result-label">Пост 16:9</div>
                  <img
                    src={shareWideUrl}
                    alt="Сгенерированный Пост"
                    className="share-panel__result-image"
                  />
                  <button
                    type="button"
                    onClick={() => shareOrDownloadSocialCard(shareWideResult)}
                    className="btn-solid-ghost"
                  >
                    Поделиться / скачать
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {localTab === 'invite' && (
        <div id="share-section-invite" className="share-invite-card">
          <div className="share-invite-card__icon" aria-hidden="true">🤝</div>
          <h3 className="share-invite-card__title">Пригласить друзей</h3>
          <p className="share-invite-card__desc">
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
            className="btn-solid-purple"
          >
            Пригласить друзей
          </button>
        </div>
      )}
    </div>
  );
};
