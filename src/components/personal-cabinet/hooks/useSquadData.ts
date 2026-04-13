import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadMySquad, type SquadMineResponse } from '../../../utils/badgeApprovalApi';

interface UseSquadDataProps {
  accessToken?: string;
  deviceId?: string;
  userData: any;
  currentRole?: string;
  nickname?: string;
}

export const useSquadData = ({
  accessToken,
  deviceId,
  userData,
  currentRole,
  nickname,
}: UseSquadDataProps) => {
  const [mySquadInfoApi, setMySquadInfoApi] = useState<SquadMineResponse | null>(null);

  const loadSquadInfo = useCallback(async () => {
    if (!accessToken && !deviceId) return;
    try {
      const info = await loadMySquad(accessToken || '', deviceId || '');
      setMySquadInfoApi(info);
    } catch {
      setMySquadInfoApi(null);
    }
  }, [accessToken, deviceId]);

  useEffect(() => {
    void loadSquadInfo();
  }, [loadSquadInfo]);

  const hasSquadMembership = Boolean(
    mySquadInfoApi?.membership?.squadId || userData?.diaryProgress?.squad?.name
  );
  const canEditSquadCorner = currentRole === 'counselor' || currentRole === 'developer';

  // Fallback: build mySquadInfo from local diary when API unavailable
  const mySquadInfo: SquadMineResponse | null =
    mySquadInfoApi ??
    (hasSquadMembership
      ? {
          membership: {
            deviceId: deviceId || 'local-device',
            campId: 'local-camp',
            squadId: userData?.diaryProgress?.squad?.name || 'local-squad',
            role: currentRole as any,
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
          members: [],
        }
      : null);

  const squadChatMembers = useMemo(() => {
    const source = (mySquadInfo?.members || mySquadInfo?.participants || []) as Array<{
      deviceId: string;
      nickname?: string | null;
      avatarUrl?: string | null;
    }>;
    const members = source
      .filter((m) => Boolean(m?.deviceId))
      .map((m) => ({
        deviceId: m.deviceId,
        nickname: m.nickname || null,
        avatarUrl: m.avatarUrl || null,
      }));
    const myDeviceId = (deviceId || '').trim();
    if (myDeviceId && !members.some((m) => m.deviceId === myDeviceId)) {
      members.push({
        deviceId: myDeviceId,
        nickname: nickname || null,
        avatarUrl: userData?.profile?.avatar || null,
      });
    }
    return members;
  }, [
    mySquadInfo?.members,
    mySquadInfo?.participants,
    deviceId,
    nickname,
    userData?.profile?.avatar,
  ]);

  const defaultShiftLength: 9 | 21 = (() => {
    const shift = mySquadInfo?.shift;
    if (!shift) return 21;
    if (shift.durationDays === 9 || shift.durationDays === 21) return shift.durationDays;
    if (shift.name) return shift.name.toLowerCase().includes('лет') ? 21 : 9;
    return 21;
  })();

  return {
    mySquadInfoApi,
    mySquadInfo,
    loadSquadInfo,
    hasSquadMembership,
    canEditSquadCorner,
    squadChatMembers,
    defaultShiftLength,
  };
};
