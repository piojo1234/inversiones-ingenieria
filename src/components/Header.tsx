"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany, Company } from "@/context/CompanyContext";
import { useRole, Role } from "@/context/RoleContext";
import { createClient } from "@/lib/supabase/client";
import { Building2, Shield, ChevronDown, Check, LogOut } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { activeCompany, setActiveCompany, companies } = useCompany();
  const { activeRole, setActiveRole } = useRole();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = React.useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10 transition-colors duration-300">
      <div className="flex items-center gap-4">
        {/* Corporate Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCompanyOpen(!isCompanyOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted transition-all duration-200`}
            style={{ borderLeftWidth: '4px', borderLeftColor: `var(--${activeCompany.themeColor})` }}
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-semibold leading-none">{activeCompany.name}</span>
              <span className="text-[10px] text-muted-foreground mt-1">
                NIT: {activeCompany.nit} | {activeCompany.project}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          </button>

          {isCompanyOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-accordion-down z-50">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    setActiveCompany(company);
                    setIsCompanyOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{company.name}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {company.project}
                    </span>
                  </div>
                  {activeCompany.id === company.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Controller Toggle */}
        <div className="flex items-center bg-muted rounded-full p-1 border border-border">
          <button
            onClick={() => setActiveRole("Super Admin")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeRole === "Super Admin"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Super Admin
          </button>
          <button
            onClick={() => setActiveRole("Cartera")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeRole === "Cartera"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cartera
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir
        </button>
      </div>
    </header>
  );
}
