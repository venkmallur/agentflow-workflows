'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Org = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type OrgContextType = {
  currentOrg: Org | null;
  setCurrentOrg: (org: Org) => void;
};

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);

  useEffect(() => {
    const savedOrg = localStorage.getItem('currentOrg');
    if (savedOrg) {
      try {
        setCurrentOrg(JSON.parse(savedOrg));
      } catch (e) {
        console.error('Failed to parse org', e);
      }
    }
  }, []);

  const handleSetOrg = (org: Org) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrg', JSON.stringify(org));
  };

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrg: handleSetOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
