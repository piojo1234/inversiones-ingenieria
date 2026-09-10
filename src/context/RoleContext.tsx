"use client";

import React, { createContext, useContext, useState } from "react";

export type Role = "Super Admin" | "Cartera";

interface RoleContextType {
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  isSuperAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<Role>("Super Admin");

  const isSuperAdmin = activeRole === "Super Admin";

  return (
    <RoleContext.Provider value={{ activeRole, setActiveRole, isSuperAdmin }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
