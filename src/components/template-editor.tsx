"use client";

import React, { useState } from "react";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";

interface Clause {
  id: string;
  title: string;
  content: string;
}

export function TemplateEditor() {
  const { activeCompany } = useCompany();
  const [templateName, setTemplateName] = useState("Plantilla Estándar Compraventa");
  const [clauses, setClauses] = useState<Clause[]>([
    { id: "1", title: "Objeto del Contrato", content: "El promitente vendedor se obliga a transferir a favor del promitente comprador..." },
    { id: "2", title: "Precio y Forma de Pago", content: "El precio pactado es de $0.00, pagadero en las siguientes cuotas..." },
  ]);

  const addClause = () => {
    setClauses([...clauses, { id: Date.now().toString(), title: "Nueva Cláusula", content: "" }]);
  };

  const removeClause = (id: string) => {
    setClauses(clauses.filter((c) => c.id !== id));
  };

  const updateClause = (id: string, field: keyof Clause, value: string) => {
    setClauses(clauses.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('plantillas_contratos') as any)
        .upsert({
          titulo_documento: templateName,
          tipo_contrato: "Compraventa",
          clausulas: clauses as any, // jsonb casting
          empresa_id: activeCompany.id
        }, { onConflict: 'empresa_id,tipo_contrato' });
      
      if (error) throw error;
      alert(`Plantilla "${templateName}" guardada exitosamente en la base de datos.`);
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Error al guardar la plantilla: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold">Editor de Plantillas de Contratos</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Plantilla
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Nombre de la Plantilla</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Cláusulas del Contrato</h3>
          <button
            onClick={addClause}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir Cláusula
          </button>
        </div>

        {clauses.map((clause, index) => (
          <div key={clause.id} className="border border-border rounded-md p-4 flex flex-col gap-3 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-muted-foreground w-8">#{index + 1}</span>
              <input
                type="text"
                value={clause.title}
                onChange={(e) => updateClause(clause.id, "title", e.target.value)}
                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Título de la cláusula"
              />
              <button
                onClick={() => removeClause(clause.id)}
                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                title="Eliminar cláusula"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="pl-12">
              <textarea
                value={clause.content}
                onChange={(e) => updateClause(clause.id, "content", e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Contenido de la cláusula..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
