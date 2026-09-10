"use client";

import React, { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import { Edit2, Save, X, Loader2 } from "lucide-react";

interface Projection {
  id: string;
  month: string;
  target: number;
  actual: number;
}

const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function MetricsGrid() {
  const { activeCompany } = useCompany();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Projection[]>([]);

  useEffect(() => {
    async function fetchProjections() {
      setLoading(true);
      const supabase = createClient();
      
      try {
        const { data: proyecciones, error } = await supabase
          .from('proyecciones_recaudo')
          .select('*')
          .eq('empresa_id', activeCompany.id)
          .order('anio', { ascending: true })
          .order('mes', { ascending: true });

        if (error) throw error;

        if (proyecciones && proyecciones.length > 0) {
          setData((proyecciones as any[]).map(p => ({
            id: p.id,
            month: `${MONTH_LABELS[(p.mes || 1) - 1]} ${p.anio}`,
            target: p.valor_proyectado,
            actual: p.valor_historico_calculado || 0
          })));
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching projections:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjections();
  }, [activeCompany.id]);

  const startEdit = (projection: Projection) => {
    setEditingId(projection.id);
    setEditValue(projection.target);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    const supabase = createClient();
    
    // Update local state first for immediate feedback
    setData(data.map((item) => (item.id === id ? { ...item, target: editValue } : item)));
    setEditingId(null);
    
    // Update Supabase
    try {
      const { error } = await (supabase.from('proyecciones_recaudo') as any)
        .update({ valor_proyectado: editValue })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error updating projection:", error);
      // Revert if error occurs could be added here
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-[400px]">
      <div className="p-6 border-b border-border bg-muted/20">
        <h3 className="text-lg font-heading font-semibold">Metas de Recaudo</h3>
        <p className="text-sm text-muted-foreground">Proyecciones mensuales para {activeCompany.name}</p>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-semibold">Mes</th>
                <th className="px-6 py-3 font-semibold text-right">Meta (Expectativa)</th>
                <th className="px-6 py-3 font-semibold text-right">Recaudo Real</th>
                <th className="px-6 py-3 font-semibold text-center">Progreso</th>
                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No hay proyecciones registradas para esta empresa.
                  </td>
                </tr>
              ) : data.map((item) => {
                const progress = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                const isEditing = editingId === item.id;
                
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{item.month}</td>
                    
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editValue} 
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          className="w-32 bg-background border border-primary/50 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold">${item.target.toLocaleString()}</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      ${item.actual.toLocaleString()}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-muted rounded-full h-2 min-w-[60px]">
                          <div 
                            className={`h-2 rounded-full ${progress >= 100 ? 'bg-emerald-500' : progress >= 80 ? 'bg-primary' : 'bg-tertiary'}`} 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(item.id)} className="text-emerald-500 hover:text-emerald-600 transition-colors p-1" title="Guardar">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="text-destructive hover:text-destructive/80 transition-colors p-1" title="Cancelar">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Editar Meta">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
