import { useState } from 'react';

type Tab = 'active' | 'favorites' | 'collection' | 'journal' | 'workshop' | 'squads';
type SquadCornerTabId = 'squad' | 'photos' | 'planner' | 'flag-badges';
type BroTabId = 'initiation' | 'wing';
type ShareTabId = 'create-card' | 'invite';
type WorkshopTabId = 'constructor' | 'arts' | 'my' | 'community';
type MobileDrawerLevel = 'main' | 'sections' | 'tabs';

export function useCabinetTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [activeSection, setActiveSection] = useState<string>('home');
  const [homeTab, setHomeTab] = useState<Tab>('active');
  
  const [squadCornerTab, setSquadCornerTab] = useState<SquadCornerTabId>('squad');
  const [broTab, setBroTab] = useState<BroTabId>('initiation');
  const [shareTab, setShareTab] = useState<ShareTabId>('create-card');
  const [workshopTab, setWorkshopTab] = useState<WorkshopTabId>('constructor');
  const [teamTab, setTeamTab] = useState<string>('squad');
  const [councilTab, setCouncilTab] = useState<string>('metrics');
  const [vozhatifikatorTab, setVozhatifikatorTab] = useState<string>('book');
  const [inspectorTab, setInspectorTab] = useState<string>('missions');

  const [pathCarouselSteps, setPathCarouselSteps] = useState(0);
  const [favCarouselSteps, setFavCarouselSteps] = useState(0);

  const [mobileDrawerLevel, setMobileDrawerLevel] = useState<MobileDrawerLevel>('main');
  
  return {
    activeTab, setActiveTab,
    activeSection, setActiveSection,
    homeTab, setHomeTab,
    squadCornerTab, setSquadCornerTab,
    broTab, setBroTab,
    shareTab, setShareTab,
    workshopTab, setWorkshopTab,
    teamTab, setTeamTab,
    councilTab, setCouncilTab,
    vozhatifikatorTab, setVozhatifikatorTab,
    inspectorTab, setInspectorTab,
    pathCarouselSteps, setPathCarouselSteps,
    favCarouselSteps, setFavCarouselSteps,
    mobileDrawerLevel, setMobileDrawerLevel,
  };
}
