"use client";

import React from "react";
import { DynamicContract } from "@/components/dynamic-contract";
import { TemplateEditor } from "@/components/template-editor";
import { ExistingContracts } from "@/components/existing-contracts";
import { useRole } from "@/context/RoleContext";
import { Lock } from "lucide-react";

export default function ContractsPage() {
  const { isSuperAdmin } = useRole();

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Gestión de Contratos</h1>
        <p className="text-muted-foreground mt-1">Generación y edición de plantillas legales.</p>
      </div>

      {!isSuperAdmin && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-5 h-5" />
          <div>
            <h4 className="font-semibold text-sm">Acceso Restringido</h4>
            <p className="text-xs mt-0.5">Su rol actual (Cartera) tiene acceso de solo lectura al creador de contratos. Contacte al Área Jurídica para modificaciones.</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <ExistingContracts />
      </div>

      <div className={`transition-opacity duration-300 mt-4 ${!isSuperAdmin ? "opacity-50 pointer-events-none grayscale-[30%]" : ""}`}>
        <DynamicContract />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Plantillas de Contratos (Área Jurídica)</h2>
        </div>
        
        {isSuperAdmin ? (
          <TemplateEditor />
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
            <Lock className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">Sección Bloqueada</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              El editor de plantillas es de uso exclusivo para el Área Jurídica (Super Admin).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
