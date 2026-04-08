import React, { useEffect, useRef, ReactNode, createContext } from 'react';
import { useAuth } from './AuthContext';
import { useProgressStore, getProgressStorageKey as _getProgressStorageKey, initialData, applyTestDefaults, normalizeUserData } from '../store/progressStore';
import { IUserData } from '../types/userProgress';

const LEGACY_STORAGE_KEY = 'rl_guide_progress_v1';

// We keep a dummy context so legacy apps importing it don't crash if they assume React Context,
// though `useUserProgress` itself abstracts it.
const ProgressContext = createContext<any>(undefined);

export const getProgressStorageKey = _getProgressStorageKey;

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    role: authRole,
    accountId,
    personId,
    legacyRoleOwner,
    legacyMigrated,
    setAuth,
  } = useAuth();

  const userData = useProgressStore((state) => state.userData);
  const isLoading = useProgressStore((state) => state.isLoading);
  // We don't subscribe to EVERYTHING to avoid massive ProgressProvider re-renders,
  // but we do need to re-render it if userData changes to save it.
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<IUserData | null>(null);
  const hydratedKeyRef = useRef<string>('');

  const resolvedPersonId = (personId || '').trim();
  const resolvedAccountId = (accountId || '').trim();
  const storageKey = getProgressStorageKey(resolvedAccountId || undefined);

  // One-time migration policy:
  useEffect(() => {
    if (legacyMigrated) return;
    if (!legacyRoleOwner || !resolvedPersonId || !authRole) return;

    try {
      const ownerAccountId = `${resolvedPersonId}:${legacyRoleOwner}`;
      const ownerStorageKey = getProgressStorageKey(ownerAccountId);
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw && !localStorage.getItem(ownerStorageKey)) {
        localStorage.setItem(ownerStorageKey, legacyRaw);
      }
      setAuth({
        role: authRole,
        legacyRoleOwner,
        legacyMigrated: true,
      });
    } catch {
      // ignore
    }
  }, [authRole, legacyMigrated, legacyRoleOwner, resolvedPersonId, setAuth]);

  // Load from LocalStorage (account-scoped for v2).
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingDataRef.current = null;
    hydratedKeyRef.current = '';
    
    useProgressStore.getState().setIsLoading(true);

    const stored = localStorage.getItem(storageKey);
    const isTestMode = useProgressStore.getState().isTestMode;
    let loadedData = initialData;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        loadedData = normalizeUserData(parsed);
      } catch (e) {
        console.error('Failed to parse user progress', e);
        loadedData = applyTestDefaults(initialData, isTestMode);
      }
    } else {
      loadedData = applyTestDefaults(initialData, isTestMode);
    }

    useProgressStore.getState().setUserData(loadedData);
    hydratedKeyRef.current = storageKey;
    useProgressStore.getState().setIsLoading(false);
  }, [storageKey]);

  // Save to LocalStorage on change (debounced)
  useEffect(() => {
    if (isLoading) return;
    if (hydratedKeyRef.current !== storageKey) return;
    
    pendingDataRef.current = userData;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const data = pendingDataRef.current;
      if (!data) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
          console.error('Слишком много данных (например, фото).');
          alert('Не удалось сохранить: слишком много данных. Удалите несколько фото в отрядном уголке.');
        } else {
          console.error('Failed to save progress', e);
        }
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        const data = pendingDataRef.current;
        if (data) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      }
    };
  }, [isLoading, storageKey, userData]);

  return (
    <ProgressContext.Provider value={{}}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useUserProgress = () => {
  return useProgressStore();
};
