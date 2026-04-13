import { useState } from 'react';
import type { SquadMineResponse } from '../../utils/badgeApprovalApi';

export function useCabinetData() {
  const [badgesConfig, setBadgesConfig] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [aiDataLoading, setAiDataLoading] = useState(true);

  const [mySquadInfoApi, setMySquadInfoApi] = useState<SquadMineResponse | null>(null);

  const [vozhatifikatorHtml, setVozhatifikatorHtml] = useState<string | null>(null);
  const [vozhatifikatorToc, setVozhatifikatorToc] = useState<Array<{ id: string; title: string }>>(
    []
  );
  const [vozhatifikatorLoading, setVozhatifikatorLoading] = useState(false);
  const [vozhatifikatorError, setVozhatifikatorError] = useState<string | null>(null);

  return {
    badgesConfig,
    setBadgesConfig,
    badgesLoading,
    setBadgesLoading,
    aiDataLoading,
    setAiDataLoading,
    mySquadInfoApi,
    setMySquadInfoApi,
    vozhatifikatorHtml,
    setVozhatifikatorHtml,
    vozhatifikatorToc,
    setVozhatifikatorToc,
    vozhatifikatorLoading,
    setVozhatifikatorLoading,
    vozhatifikatorError,
    setVozhatifikatorError,
  };
}
