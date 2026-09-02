'use client';

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export type StudioState = {
  currentStep: number;
  totalSteps: number;
  leadsCount: number;
  selectedName: string | null;
  city: string;
  segment: string;
  sourceMode: 'idle' | 'blocked' | 'google' | 'openstreetmap';
};

const defaultStudioState: StudioState = {
  currentStep: 1,
  totalSteps: 5,
  leadsCount: 0,
  selectedName: null,
  city: '',
  segment: '',
  sourceMode: 'idle',
};

type StudioContextValue = {
  studio: StudioState;
  setStudio: Dispatch<SetStateAction<StudioState>>;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [studio, setStudio] = useState<StudioState>(defaultStudioState);
  const value = useMemo(() => ({ studio, setStudio }), [studio]);
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio precisa estar dentro de StudioProvider.');
  }
  return context;
}
