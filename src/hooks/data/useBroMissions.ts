import { useCallback, useState } from 'react';
import { getApiBase } from '../../utils/apiBase';

export const BRO_MISSIONS_API_URL = () => `${getApiBase()}/api/bro-missions`;

export const useBroMissions = () => {
  const [dynamicBroMissions, setDynamicBroMissions] = useState<any[]>([]);

  const syncBroMissions = useCallback(async () => {
    try {
      const res = await fetch(BRO_MISSIONS_API_URL());
      if (res.ok) {
        const data = await res.json();
        setDynamicBroMissions(data);
      }
    } catch (e) {
      console.warn('Failed to sync Bro-Missions:', e);
    }
  }, []);

  const updateBroMissionsOnServer = useCallback(async (missions: any[]) => {
    try {
      const res = await fetch(BRO_MISSIONS_API_URL(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missions),
      });
      if (res.ok) {
        setDynamicBroMissions(missions);
        return true;
      }
    } catch (e) {
      console.error('Failed to update Bro-Missions:', e);
    }
    return false;
  }, []);

  return {
    dynamicBroMissions,
    syncBroMissions,
    updateBroMissionsOnServer,
  };
};
