import { useState, useRef, useEffect } from 'react';

export function useProfileForms() {
  const [proofBadge, setProofBadge] = useState<{ id: string; title: string; image?: string } | null>(null);
  const [proofForm, setProofForm] = useState({ learned: '', impact: '', link: '' });
  const [proofPhotoCount, setProofPhotoCount] = useState(0);
  const proofPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [workshopForm, setWorkshopForm] = useState({ title: '', description: '', level1: '', level2: '', image: null as string | null });
  const [workshopProposalType, setWorkshopProposalType] = useState<'badge' | 'category' | 'version'>('badge');

  const [eduTaskForm, setEduTaskForm] = useState({ title: '', description: '', badgeId: '' });

  // Child Badges Import Modal state
  const [showChildBadges, setShowChildBadges] = useState(false);
  const [childProgressFromFile, setChildProgressFromFile] = useState<Record<string, { status?: string; achievedAt?: string }> | null>(null);
  const [childReportMeta, setChildReportMeta] = useState<{ nickname?: string; exportedAt?: string } | null>(null);
  const [showChildRouteForm, setShowChildRouteForm] = useState(false);
  const [childRouteText, setChildRouteText] = useState('');

  // Dev state
  const [devLoginError, setDevLoginError] = useState('');

  useEffect(() => {
    (window as any).__openBadgeProof__ = (badgeInfo: { id: string; title: string, image?: string }) => {
      setProofForm({ learned: '', impact: '', link: '' });
      setProofPhotoCount(0);
      if (proofPhotoInputRef.current) proofPhotoInputRef.current.value = '';
      setProofBadge(badgeInfo);
    };

    return () => {
      delete (window as any).__openBadgeProof__;
    };
  }, []);

  return {
    proofBadge,
    setProofBadge,
    proofForm,
    setProofForm,
    proofPhotoCount,
    setProofPhotoCount,
    proofPhotoInputRef,
    workshopForm,
    setWorkshopForm,
    workshopProposalType,
    setWorkshopProposalType,
    eduTaskForm,
    setEduTaskForm,
    showChildBadges,
    setShowChildBadges,
    childProgressFromFile,
    setChildProgressFromFile,
    childReportMeta,
    setChildReportMeta,
    showChildRouteForm,
    setShowChildRouteForm,
    childRouteText,
    setChildRouteText,
    devLoginError,
    setDevLoginError,
  };
}
