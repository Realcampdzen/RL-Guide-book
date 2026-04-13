import { useState } from 'react';

export function useCabinetModals() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  const [roleRequestOpen, setRoleRequestOpen] = useState(false);
  const [broInitiationModalOpen, setBroInitiationModalOpen] = useState(false);

  // Custom Modal Data States
  const [broRoleToSelect, setBroRoleToSelect] = useState<'wing' | 'mentor' | null>(null);

  return {
    scannerOpen,
    setScannerOpen,
    scannerLoading,
    setScannerLoading,
    inviteModalOpen,
    setInviteModalOpen,
    avatarSelectorOpen,
    setAvatarSelectorOpen,
    roleRequestOpen,
    setRoleRequestOpen,
    broInitiationModalOpen,
    setBroInitiationModalOpen,
    broRoleToSelect,
    setBroRoleToSelect,
  };
}
