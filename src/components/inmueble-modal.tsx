"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/context/CompanyContext";

export type InmuebleData = {
  id?: string;
  proyecto_id: string;
  identificador: string;
  precio_venta: number;
  area_m2: number;
  estado: 'Disponible' | 'Reservado' | 'Vendido' | 'Arrendado';
  matricula_inmobiliaria: string;
  cedula_catastral: string;
  linderos: string;
  tradicion: string;
};

interface InmuebleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inmueble: InmuebleData) => void;
  inmuebleToEdit?: InmuebleData | null;
}

export function InmuebleModal({ isOpen, onClose, onSave, inmuebleToEdit }: InmuebleModalProps) {
  const { activeCompany } = useCompany();
  const [formData, setFormData] = useState<InmuebleData>({
    proyecto_id: '',
    identificador: '',
    precio_venta: 0,
    area_m2: 0,
    estado: 'Disponible',
    matricula_inmobiliaria: '',
    cedula_catastral: '',
    linderos: '',
    tradicion: '',
  });
  
  const [proyectos, setProyectos] = useState<Array<{id: string, nombre: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProyectos() {
      if (!activeCompany?.id) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('proyectos')
        .select('id, nombre')
        .eq('empresa_id', activeCompany.id);
      
      if (data) {
        setProyectos(data);
        // Default to first project if none selected and no edit
        if (data.length > 0 && !inmuebleToEdit && !formData.proyecto_id) {
          setFormData(prev => ({ ...prev, proyecto_id: (data as any[])[0].id }));
        }
      }
    }
    fetchProyectos();
  }, [activeCompany?.id, inmuebleToEdit]);

  useEffect(() => {
    if (inmuebleToEdit) {
      setFormData(inmuebleToEdit);
    } else {
      setFormData({
        proyecto_id: (proyectos && proyectos.length > 0) ? proyectos[0].id : '',
        identificador: '',
        precio_venta: 0,
        area_m2: 0,
        estado: 'Disponible',
        matricula_inmobiliaria: '',
        cedula_catastral: '',
        linderos: '',
        tradicion: '',
      });
    }
    setError("");
  }, [inmuebleToEdit, isOpen, proyectos]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proyecto_id) {
      setError("Debe seleccionar un proyecto válido. Asegúrese de que la empresa tenga proyectos creados.");
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();

    try {
      const dataToSave = {
        proyecto_id: formData.proyecto_id,
        identificador: formData.identificador,
        precio_venta: formData.precio_venta || 0,
        area_m2: formData.area_m2 || 0,
        estado: formData.estado,
        matricula_inmobiliaria: formData.matricula_inmobiliaria || null,
        cedula_catastral: formData.cedula_catastral || null,
        linderos: formData.linderos || null,
        tradicion: formData.tradicion || null,
      };

      let result;
      if (formData.id) {
        result = await (supabase.from('inmuebles') as any)
          .update(dataToSave)
          .eq('id', formData.id)
          .select()
          .single();
      } else {
        result = await (supabase.from('inmuebles') as any)
          .insert([dataToSave])
          .select()
          .single();
      }

      if (result.error) throw result.error;
      onSave(result.data);
      onClose();
    } catch (err: any) {
      console.error("Error saving inmueble:", err);
      setError(err.message || "Ocurrió un error al guardar el inmueble.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold">
                {formData.id ? 'Editar Inmueble' : 'Nuevo Inmueble'}
              </h2>
              <p className="text-xs text-muted-foreground">Complete los datos técnicos y legales</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted p-2 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="inmueble-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Proyecto <span className="text-destructive">*</span></label>
                <select
                  required
                  value={formData.proyecto_id}
                  onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="" disabled>Seleccione un proyecto</option>
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Identificador (Ej: Lote 1) <span className="text-destructive">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.identificador}
                  onChange={(e) => setFormData({ ...formData, identificador: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Lote No. 332"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado <span className="text-destructive">*</span></label>
                <select
                  required
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Reservado">Reservado / Apartado</option>
                  <option value="Vendido">Vendido</option>
                  <option value="Arrendado">Arrendado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Precio de Venta ($) <span className="text-destructive">*</span></label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Área (m²) <span className="text-destructive">*</span></label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: Number(e.target.value) })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Matrícula Inmobiliaria</label>
                <input
                  type="text"
                  value={formData.matricula_inmobiliaria}
                  onChange={(e) => setFormData({ ...formData, matricula_inmobiliaria: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="000-000000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cédula Catastral</label>
                <input
                  type="text"
                  value={formData.cedula_catastral}
                  onChange={(e) => setFormData({ ...formData, cedula_catastral: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="00-00-00-0000-00"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Linderos y Medidas</label>
                <textarea
                  rows={3}
                  value={formData.linderos}
                  onChange={(e) => setFormData({ ...formData, linderos: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="NORTE: En extensión de X metros con... SUR: ..."
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Tradición (Origen de la Propiedad)</label>
                <textarea
                  rows={3}
                  value={formData.tradicion}
                  onChange={(e) => setFormData({ ...formData, tradicion: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Adquirido mediante Escritura Pública No. XXXX de la Notaría YYY..."
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/20 flex justify-end gap-3 shrink-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="inmueble-form"
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {formData.id ? 'Guardar Cambios' : 'Crear Inmueble'}
          </button>
        </div>
      </div>
    </div>
  );
}
