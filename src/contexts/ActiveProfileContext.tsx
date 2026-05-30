import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../db/types';
import { ensureDefaultProfile, useProfiles } from '../hooks/useProfiles';

const STORAGE_KEY = 'ukyu.activeProfileId';

type ActiveProfileContextValue = {
  activeProfileId: number | undefined;
  setActiveProfile: (profileId: number) => void;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

function readStoredActiveProfileId(): number | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

function writeStoredActiveProfileId(profileId: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(profileId));
}

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { profiles } = useProfiles();
  const [activeProfileId, setActiveProfileId] = useState<number | undefined>(
    readStoredActiveProfileId,
  );

  useEffect(() => {
    if (profiles === undefined) return;
    if (profiles.length === 0) {
      void ensureDefaultProfile();
      return;
    }

    const stored = readStoredActiveProfileId();
    const candidate = activeProfileId ?? stored;
    const selected = profiles.some((p) => p.id === candidate)
      ? candidate
      : profiles[0].id;

    if (selected === undefined) return;
    if (selected !== activeProfileId) {
      setActiveProfileId(selected);
    }
    writeStoredActiveProfileId(selected);
  }, [profiles, activeProfileId]);

  function setActiveProfile(profileId: number) {
    setActiveProfileId(profileId);
    writeStoredActiveProfileId(profileId);
  }

  return (
    <ActiveProfileContext.Provider value={{ activeProfileId, setActiveProfile }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

function useActiveProfileContext(): ActiveProfileContextValue {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error('ActiveProfileProvider の内側で使ってください');
  }
  return context;
}

export function useActiveProfileId(): number | undefined {
  return useActiveProfileContext().activeProfileId;
}

export function useSetActiveProfile(): (profileId: number) => void {
  return useActiveProfileContext().setActiveProfile;
}

export function useActiveProfile(): Profile | undefined {
  const activeProfileId = useActiveProfileId();
  const { profiles } = useProfiles();
  return profiles?.find((profile) => profile.id === activeProfileId);
}
