import { useState } from 'react';

export function useProfileModals() {
  const [showAvatarUploadConfirm, setShowAvatarUploadConfirm] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showPersonalCabinet, setShowPersonalCabinet] = useState(true);

  const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);

  // You can add more simple boolean toggles here

  return {
    showAvatarUploadConfirm,
    setShowAvatarUploadConfirm,
    showAdminDashboard,
    setShowAdminDashboard,
    showPersonalCabinet,
    setShowPersonalCabinet,
    initiativeModalOpen,
    setInitiativeModalOpen,
  };
}
