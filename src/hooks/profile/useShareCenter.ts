import { useState } from 'react';
import { fetchAiSlogan, fetchPedagogy4k, fetchVibeCheck } from '../../utils/aiService';
import {
  generateSocialCard,
  type SocialCardResult,
  shareOrDownloadSocialCard,
} from '../../utils/socialGenerator';

export type ShareTabId = 'create-card' | 'invite';

export interface UseShareCenterProps {
  nickname?: string;
  avatar?: string;
  rank: string;
  totalLevelsAchieved: number;
  totalBadgesStarted: number;
  badgeTitlesInPath: string[];
  favoriteBadgeTitles: string[];
  badgeCarouselItems: any[];
}

export function useShareCenter(props: UseShareCenterProps) {
  const [shareActiveTab, setShareActiveTab] = useState<ShareTabId>('create-card');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStoryUrl, setShareStoryUrl] = useState<string | null>(null);
  const [shareWideUrl, setShareWideUrl] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareHideNickname, setShareHideNickname] = useState(false);
  const [shareStoryResult, setShareStoryResult] = useState<SocialCardResult | null>(null);
  const [shareWideResult, setShareWideResult] = useState<SocialCardResult | null>(null);

  const resetShare = () => {
    if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl);
    if (shareWideUrl) URL.revokeObjectURL(shareWideUrl);
    setShareStoryUrl(null);
    setShareWideUrl(null);
    setShareStoryResult(null);
    setShareWideResult(null);
  };

  const generateCards = async () => {
    resetShare();
    setShareBusy(true);
    setShareStatus('Генерируем слоган…');
    try {
      const {
        nickname,
        avatar,
        rank,
        totalLevelsAchieved,
        totalBadgesStarted,
        badgeTitlesInPath,
        favoriteBadgeTitles,
        badgeCarouselItems,
      } = props;

      const raw = await fetchAiSlogan({
        kind: 'progress_summary',
        nickname,
        rank,
        totalLevelsAchieved,
        totalBadgesStarted,
        badgeTitlesInPath,
        favoriteBadgeTitles,
      });
      const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan;

      setShareStatus('Генерируем характеристику 4К…');
      const pedagogy4kLine = await fetchPedagogy4k({
        badgeTitlesInPath,
        favoriteBadgeTitles,
        rank,
        nickname,
      });

      setShareStatus('Генерируем мем для сторис…');
      const storyMemeRaw = await fetchAiSlogan({
        kind: 'stories_reels_meme',
        nickname,
        rank,
        totalLevelsAchieved,
        totalBadgesStarted,
      });
      const customStoriesLine =
        typeof storyMemeRaw === 'string' && storyMemeRaw.trim() ? storyMemeRaw.trim() : undefined;

      setShareStatus('Генерируем вайб-чек…');
      const vibeRaw = await fetchVibeCheck({
        variant: 'profile',
        rank,
        nickname,
        totalLevelsAchieved,
        totalBadgesStarted,
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
        nickname,
        avatar: avatar ?? '',
        rank,
        totalLevelsAchieved,
        totalBadgesStarted,
      };

      const createdAt = new Date().toISOString();
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
  };

  return {
    shareActiveTab,
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
  };
}
