export function setupGodModeInterceptor() {
  if (typeof window === 'undefined') return;

  const isGodMode = localStorage.getItem('rl_god_mode') === 'true';
  
  // Inject global toggler
  (window as any).__enableGodMode__ = () => {
    localStorage.setItem('rl_god_mode', 'true');
    localStorage.setItem('rl_guide_test_mode', 'true'); // Unlock badges automatically
    window.location.reload();
  };
  (window as any).__disableGodMode__ = () => {
    localStorage.removeItem('rl_god_mode');
    localStorage.removeItem('rl_guide_test_mode');
    window.location.reload();
  };

  if (!isGodMode) {
    // Secret UI Trigger (5 quick taps in top-left corner) for mobile presentations
    let tapCount = 0;
    let tapTimeout: any;
    window.addEventListener('pointerdown', (e) => {
      if (e.clientX < 50 && e.clientY < 50) {
        tapCount++;
        clearTimeout(tapTimeout);
        if (tapCount >= 5) {
          (window as any).__enableGodMode__();
        } else {
          tapTimeout = setTimeout(() => tapCount = 0, 500);
        }
      }
    });
    return;
  }

  console.warn('🟡 [GOD MODE] Presenter Protocol Active. Post/Patch/Delete requests are intercepted.');

  // Inject UI Banner
  window.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.bottom = '10px';
    banner.style.right = '10px';
    banner.style.backgroundColor = '#ffd700';
    banner.style.color = '#000';
    banner.style.padding = '8px 12px';
    banner.style.fontFamily = 'monospace';
    banner.style.fontWeight = 'bold';
    banner.style.borderRadius = '4px';
    banner.style.zIndex = '999999';
    banner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
    banner.style.pointerEvents = 'none';
    banner.innerText = '🟡 PRESENTER MODE';
    document.body.appendChild(banner);
  });

  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const urlStr = typeof input === 'string' ? input : (input as any).url || '';

    // === PHASE 2: SUPER-VIEW INTERCEPTS ===
    // Let GET requests pass through normally, EXCEPT when we need to inject super-view data
    if (method === 'GET') {
      if (urlStr.includes('/api/teams/mine')) {
        try {
          const allTeamsUrl = urlStr.replace('/api/teams/mine', '/api/teams');
          const res = await originalFetch(allTeamsUrl, init);
          if (res.ok) {
            const teamsDict = await res.json();
            // Inject developer into all returned teams so the UI treats them as 'mine'
            const devTeams = Object.values(teamsDict).map((t: any) => ({
              ...t,
              members: [...(t.members || []), { deviceId: 'presenter-device', role: 'developer' }]
            }));
            return new Response(JSON.stringify(devTeams), { status: 200, headers: res.headers });
          }
          return res;
        } catch (e) {
          return originalFetch(input, init);
        }
      }

      if (urlStr.includes('/api/squads/mine')) {
        const storedSquad = localStorage.getItem('rl_god_mode_squad');
        if (storedSquad) {
          try {
            const squadMeta = JSON.parse(storedSquad);
            const devMembership = {
               deviceId: 'presenter-device',
               campId: squadMeta.shiftId || 'god-mode-shift',
               squadId: squadMeta.squadId,
               role: 'developer',
               joinedAt: new Date().toISOString()
            };
            const mockMineResponse = {
               membership: devMembership,
               squad: {
                  id: squadMeta.squadId,
                  shiftId: squadMeta.shiftId || 'god-mode-shift',
                  name: squadMeta.squadName || squadMeta.squadId
               },
               shift: {
                  id: squadMeta.shiftId || 'god-mode-shift',
                  name: squadMeta.shiftName || 'Демонстрационная Смена',
                  durationDays: 9
               },
               participants: [],
               members: [devMembership]
            };
            return new Response(JSON.stringify(mockMineResponse), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (e) {}
        }
      }

      return originalFetch(input, init);
    }

    console.log(`[GOD MODE] Intercepted ${method} ${urlStr}`);

    // Parse body if any
    let bodyObj: any = {};
    if (init?.body && typeof init.body === 'string') {
      try {
        bodyObj = JSON.parse(init.body);
      } catch (e) {
        // Not JSON
      }
    }

    // Mock response matching standard schemas to prevent frontend crashes
    let mockResponse: any = { success: true, mocked: true };

    if (urlStr.includes('/api/images/generate')) {
      // Dummy 1x1 transparent PNG to satisfy image loaders
      mockResponse = { imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' };
    } 
    else if (urlStr.includes('/api/teams')) {
      const matchJoin = urlStr.match(/\/api\/teams\/([^\/]+)\/join/);
      if (matchJoin) {
         mockResponse = { id: matchJoin[1], name: 'Mock Team' };
      } else {
         mockResponse = {
           id: bodyObj.id || 'god-mode-team-123',
           name: bodyObj.name || 'Mock Team',
           motto: bodyObj.motto || 'To infinity and beyond',
           goals: bodyObj.goals || [],
           members: [{ deviceId: 'presenter-device', role: 'developer' }],
           achievements: [],
           createdAt: new Date().toISOString(),
           ...bodyObj
         };
      }
    }
    // Phase 2: Virtual Squad Join
    else if (urlStr.includes('/api/squads') && urlStr.includes('/join')) {
      const matchSquad = urlStr.match(/\/api\/squads\/([^\/]+)\/join/);
      if (matchSquad) {
         const squadId = decodeURIComponent(matchSquad[1]);
         localStorage.setItem('rl_god_mode_squad', JSON.stringify({ squadId, squadName: bodyObj.squadName || squadId, shiftId: bodyObj.shiftId || '' }));
         mockResponse = { membership: { squadId, role: 'developer' }, squad: { id: squadId, name: bodyObj.squadName || squadId } };
      }
    }
    else if (urlStr.includes('/api/squads') && urlStr.includes('/leave')) {
      localStorage.removeItem('rl_god_mode_squad');
      mockResponse = { status: "success", squadId: "mock", membership: null };
    }
    else if (urlStr.includes('/api/auth/verify-code')) {
      mockResponse = {
        accessToken: 'god-mode-mock-token',
        role: bodyObj.role || 'developer',
        campId: 'god-mode-camp-123',
        exp: Math.floor(Date.now() / 1000) + 86400
      };
    }
    else if (urlStr.includes('/api/chat')) {
      mockResponse = {
        response: 'Это симуляция ответа сервера. Валюша спит.',
        suggestions: ['Что дальше?'],
        metadata: { badgeAssigned: false }
      };
    }

    // Simulate network delay for natural UI feel
    await new Promise(r => setTimeout(r, 600));

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  };
}
