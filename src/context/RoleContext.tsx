'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Role } from '@/type/pr';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  roleReady: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);
const ROLE_STORAGE_KEY = 'pr-system-role';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('REQUESTER');
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
      if (savedRole === 'REQUESTER' || savedRole === 'APPROVER') {
        setRoleState(savedRole);
      }
      setRoleReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const setRole = useCallback((nextRole: Role) => {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setRoleState(nextRole);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole, roleReady }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}