import re

path = 'd:\\openclaw-workspace\\putevoditel_alfa\\src\\components\\PersonalCabinet.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the individual useState line for the hooks we extracted
hooks_to_remove = [
    'scannerOpen', 'scannerLoading', 'inviteModalOpen', 'avatarSelectorOpen', 'roleRequestOpen', 'broInitiationModalOpen', 'broRoleToSelect',
    'profileEditing', 'nicknameInput', 'avatarInput', 'statusInput', 'bioInput', 'devPinInput', 'customAvatarUrl', 'squadInviteCode', 'joinSquadLoading', 'joinSquadError',
    'badgesConfig', 'badgesLoading', 'aiDataLoading', 'mySquadInfoApi', 'vozhatifikatorHtml', 'vozhatifikatorToc', 'vozhatifikatorLoading', 'vozhatifikatorError',
    'activeTab', 'activeSection', 'homeTab', 'squadCornerTab', 'broTab', 'shareTab', 'workshopTab', 'teamTab', 'councilTab', 'vozhatifikatorTab', 'inspectorTab', 'pathCarouselSteps', 'favCarouselSteps', 'mobileDrawerLevel'
]

# We will remove let/const [foo, setFoo] = useState
for hook in hooks_to_remove:
    # Match something like `const [scannerOpen, setScannerOpen] = useState(false);`
    # Also handle multiline or typed variants like `useState<...>(...)`
    pattern = r'^[ \t]*const \[\s*' + hook + r'\s*,\s*set[a-zA-Z0-9_]+\s*\]\s*=\s*useState[^;]+;\n?'
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

# Now inject the new hooks into the component start
component_start_pattern = r'(export const PersonalCabinet: React\.FC<PersonalCabinetProps> = \(props\) => \{)'
injection = """
  // Extracted States (SDD Phase 1)
  const { scannerOpen, setScannerOpen, scannerLoading, setScannerLoading, inviteModalOpen, setInviteModalOpen, avatarSelectorOpen, setAvatarSelectorOpen, roleRequestOpen, setRoleRequestOpen, broInitiationModalOpen, setBroInitiationModalOpen, broRoleToSelect, setBroRoleToSelect } = useCabinetModals();
  const { profileEditing, setProfileEditing, nicknameInput, setNicknameInput, avatarInput, setAvatarInput, statusInput, setStatusInput, bioInput, setBioInput, devPinInput, setDevPinInput, customAvatarUrl, setCustomAvatarUrl, squadInviteCode, setSquadInviteCode, joinSquadLoading, setJoinSquadLoading, joinSquadError, setJoinSquadError } = useCabinetForms();
  const { badgesConfig, setBadgesConfig, badgesLoading, setBadgesLoading, aiDataLoading, setAiDataLoading, mySquadInfoApi, setMySquadInfoApi, vozhatifikatorHtml, setVozhatifikatorHtml, vozhatifikatorToc, setVozhatifikatorToc, vozhatifikatorLoading, setVozhatifikatorLoading, vozhatifikatorError, setVozhatifikatorError } = useCabinetData();
  const { activeTab, setActiveTab, activeSection, setActiveSection, homeTab, setHomeTab, squadCornerTab, setSquadCornerTab, broTab, setBroTab, shareTab, setShareTab, workshopTab, setWorkshopTab, teamTab, setTeamTab, councilTab, setCouncilTab, vozhatifikatorTab, setVozhatifikatorTab, inspectorTab, setInspectorTab, pathCarouselSteps, setPathCarouselSteps, favCarouselSteps, setFavCarouselSteps, mobileDrawerLevel, setMobileDrawerLevel } = useCabinetTabs();
"""

content = re.sub(component_start_pattern, r'\1' + injection, content)

# Inject imports
import_injection = """import { useCabinetModals } from '../hooks/personal-cabinet/useCabinetModals';
import { useCabinetForms } from '../hooks/personal-cabinet/useCabinetForms';
import { useCabinetData } from '../hooks/personal-cabinet/useCabinetData';
import { useCabinetTabs } from '../hooks/personal-cabinet/useCabinetTabs';
"""
content = re.sub(r'(import .*?;?\n)(?=export const PersonalCabinet)', r'\1' + import_injection, content, count=1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
