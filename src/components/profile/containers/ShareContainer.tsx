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
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {localTab === 'create-card' && (
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
          <button onClick={generateCards} disabled={shareBusy} className="btn-generate">
            {shareBusy ? shareStatus || 'Генерируем…' : 'Создать карточку'}
          </button>

          {(shareStoryUrl || shareWideUrl) && (
            <div className="share-center-results">
              {shareStatus && !shareBusy && (
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
      )}

      {localTab === 'invite' && (
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
  );
};
