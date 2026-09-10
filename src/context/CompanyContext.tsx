"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export type Company = {
  id: string;
  name: string;
  nit: string;
  project?: string;
  themeColor?: string;
};

interface CompanyContextType {
  activeCompany: Company;
  setActiveCompany: (company: Company) => void;
  companies: Company[];
  loading: boolean;
}

// empresas no tiene columna de color; se asigna por posición solo para diferenciar visualmente el selector.
const THEME_COLORS = ["emerald-600", "blue-600", "amber-600", "purple-600"];

const ACTIVE_COMPANY_STORAGE_KEY = "activeEmpresaId";

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserCompanies() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Consultar empresas vinculadas al perfil activo
        const { data: rows, error } = await supabase
          .from('perfiles_empresas')
          .select('empresas(id, nombre, nit)')
          .eq('perfil_id', user.id);

        if (error) {
          console.error("Error fetching companies for user:", error);
          setLoading(false);
          return;
        }

        const empresas = (rows || [])
          .map((row: any) => row.empresas)
          .filter(Boolean);

        if (empresas.length === 0) {
          setLoading(false);
          return;
        }

        const empresaIds = empresas.map((e: any) => e.id);

        // "project" es una etiqueta legacy de UI; usamos el primer proyecto registrado de cada empresa.
        const { data: proyectos } = await supabase
          .from('proyectos')
          .select('empresa_id, nombre, created_at')
          .in('empresa_id', empresaIds)
          .order('created_at', { ascending: true });

        const firstProjectByCompany = new Map<string, string>();
        (proyectos || []).forEach((p: any) => {
          if (p.empresa_id && !firstProjectByCompany.has(p.empresa_id)) {
            firstProjectByCompany.set(p.empresa_id, p.nombre);
          }
        });

        const fetchedCompanies: Company[] = empresas.map((emp: any, index: number) => ({
          id: emp.id,
          name: emp.nombre,
          nit: emp.nit || "",
          project: firstProjectByCompany.get(emp.id) || "",
          themeColor: THEME_COLORS[index % THEME_COLORS.length],
        }));

        setCompanies(fetchedCompanies);

        // Buscar si hay un ID guardado en localStorage y si pertenece a la lista
        const savedCompanyId = typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
          : null;
          
        const found = savedCompanyId ? fetchedCompanies.find((c) => c.id === savedCompanyId) : undefined;
        const companyToSet = found || fetchedCompanies[0];

        setActiveCompanyState(companyToSet);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyToSet.id);
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserCompanies();
  }, []);

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, company.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <div className="space-y-4 max-w-md mx-auto">
          <h2 className="text-xl font-semibold">Sin empresas asignadas</h2>
          <p className="text-muted-foreground text-sm">
            Actualmente no tienes ninguna empresa vinculada a tu perfil. 
            Por favor, contacta a un administrador para que te asigne una empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, companies, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
