import sys

file_path = "d:\\openclaw-workspace\\putevoditel_alfa\\src\\views\\ProfileView.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

props_string = """<OrganizerContainer
                  role={role}
                  accessToken={accessToken}
                  deviceId={deviceId}
                  canReadShiftsAndSquads={canReadShiftsAndSquads}
                  canManageShiftsAndSquads={canManageShiftsAndSquads}
                  canDeleteShiftsAndSquads={canDeleteShiftsAndSquads}
                  mySquadInfo={mySquadInfo}
                  squadJoinRequestBusyId={squadJoinRequestBusyId}
                  onRequestJoinSquad={requestJoinSquad}
                  onOpenSquadCornerFromOrganizer={() => {
                    setSquadCornerReturnToOrganizer(false);
                    setActiveTab('active');
                    window.dispatchEvent(new CustomEvent('profile:openTab', { detail: { panel: 'squad-corner', tab: 'squad' } }));
                    openCabinPanel('squad-corner', 'left');
                  }}
                  onOpenSquadFromOrganizer={handleOpenSquadFromOrganizer}
                  loadMySquadInfo={loadMySquadInfo}
                  showHint={showHint}
                />"""

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "const renderOrganizerShiftsSection = () => (" in line:
        skip = True
    
    if skip:
        if "const renderPanelContent = () => (" in line:
            skip = False
        else:
            continue
            
    if "{showOrganizerPanel && renderOrganizerModals()}" in line:
        continue
        
    if "{renderOrganizerShiftsSection()}" in line:
        new_lines.append(line.replace("{renderOrganizerShiftsSection()}", props_string))
        continue

    if "{showOrganizerPanel && renderOrganizerShiftsSection()}" in line:
        props2 = props_string.replace("\n                ", "\n          ").replace("                    ", "            ")
        new_lines.append(line.replace("{showOrganizerPanel && renderOrganizerShiftsSection()}", "{showOrganizerPanel && (\n          " + props2 + "\n        )}"))
        continue
        
    new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Done patching.")
