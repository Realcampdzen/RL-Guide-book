import { useEffect, useState } from 'react';

/**
 * Handles mapping of URL deep links to cabinet sections.
 */
export const useCabinetRouter = () => {
  // Navigation / Tab states
  const [activeSection, setActiveSection] = useState<string>('home');
  const [workshopTab, setWorkshopTab] = useState<'hub' | 'constructor' | 'proposals'>('hub');
  const [vozhatifikatorTab, setVozhatifikatorTab] = useState<string>('book');
  const [inspectorTab, setInspectorTab] = useState<string>('missions');

  const [wsProposalType, setWsProposalType] = useState<'badge' | 'category' | 'version'>('badge');
  const [activeTabId, setActiveTabId] = useState<string>('progress');
  const [squadCornerTab, setSquadCornerTab] = useState<'hub' | 'settings'>('hub');
  const [counselorSquadTab, setCounselorSquadTab] = useState<'shift' | 'progress' | 'chat'>(
    'progress'
  );
  const [adminPanelTab, setAdminPanelTab] = useState<'arts' | 'squads'>('arts');
  const [realDiaryTab, setRealDiaryTab] = useState<'chat' | 'stats' | 'photos'>('chat');

  // Legacy profile 4K and team dashboard tabs
  const [profile4KTab, setProfile4KTab] = useState<'progress' | 'arts' | 'squad' | 'tasks'>(
    'progress'
  );
  const [councilTab, setCouncilTab] = useState<'members' | 'roles' | 'activity'>('members');
  const [teamTab, setTeamTab] = useState<'hub' | 'members' | 'invites'>('hub');

  // Deep routing initialization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openPanel = urlParams.get('openPanel');
    const openTab = urlParams.get('openTab');

    if (openPanel === 'bro') setActiveSection('bro');
    else if (openPanel === 'wing') setActiveSection('wing');
    else if (openPanel === 'admin') setActiveSection('admin');
    else if (openPanel === 'bro_dela') setActiveSection('bro_dela');
    else if (openPanel === 'bro_squad') setActiveSection('bro_squad');
    else if (openPanel === 'ode_builder') setActiveSection('ode_builder');
    else if (openPanel === 'inspector') {
      setActiveSection('inspector');
      if (openTab) setInspectorTab(openTab);
    } else if (openPanel === 'vozhatifikator' && openTab) {
      setActiveSection('vozhatifikator');
      setVozhatifikatorTab(openTab);
    } else if (openPanel === 'community') {
      setActiveSection('community');
    }
  }, []);

  // Broadcast current cabinet context for NeuroValyusha AI chatbot
  useEffect(() => {
    const eventData = { detail: { section: activeSection, timestamp: Date.now() } };
    window.dispatchEvent(new CustomEvent('cabinet-context', eventData));
  }, [activeSection]);

  return {
    activeSection,
    setActiveSection,
    workshopTab,
    setWorkshopTab,
    vozhatifikatorTab,
    setVozhatifikatorTab,
    inspectorTab,
    setInspectorTab,
    wsProposalType,
    setWsProposalType,
    activeTabId,
    setActiveTabId,
    squadCornerTab,
    setSquadCornerTab,
    counselorSquadTab,
    setCounselorSquadTab,
    adminPanelTab,
    setAdminPanelTab,
    realDiaryTab,
    setRealDiaryTab,
    profile4KTab,
    setProfile4KTab,
    councilTab,
    setCouncilTab,
    teamTab,
    setTeamTab,
  };
};
