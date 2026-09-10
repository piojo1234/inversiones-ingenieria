"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Box, 
  Wallet,
  Settings,
  Users
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Contratos", href: "/contracts", icon: FileText },
  { name: "Inventario", href: "/inventory", icon: Box },
  { name: "Portafolio", href: "/portfolio", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeCompany } = useCompany();

  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col transition-colors duration-300 relative z-20">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="font-heading font-bold text-xl tracking-tight text-primary">
          C&R Group
        </h1>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1 mt-4">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Menú Principal
          </p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className="text-sm">{item.name}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-md transition-all duration-300" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 border-t border-border">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Configuración</span>
        </button>
      </div>
    </aside>
  );
}
