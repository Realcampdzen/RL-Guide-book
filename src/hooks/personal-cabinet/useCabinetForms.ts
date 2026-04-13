import { useState } from 'react';

export function useCabinetForms() {
  const [profileEditing, setProfileEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [bioInput, setBioInput] = useState('');

  const [devPinInput, setDevPinInput] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  const [squadInviteCode, setSquadInviteCode] = useState('');
  const [joinSquadLoading, setJoinSquadLoading] = useState(false);
  const [joinSquadError, setJoinSquadError] = useState('');

  return {
    profileEditing,
    setProfileEditing,
    nicknameInput,
    setNicknameInput,
    avatarInput,
    setAvatarInput,
    statusInput,
    setStatusInput,
    bioInput,
    setBioInput,
    devPinInput,
    setDevPinInput,
    customAvatarUrl,
    setCustomAvatarUrl,
    squadInviteCode,
    setSquadInviteCode,
    joinSquadLoading,
    setJoinSquadLoading,
    joinSquadError,
    setJoinSquadError,
  };
}
