"use client";

import React, { useState, useEffect } from "react";
import { X, Save, User, Building, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ClientData = {
  id?: string;
  tipo_persona: 'Natural' | 'Juridica';
  documento: string;
  nombre_razon_social: string;
  rep_legal_nombre?: string | null;
  rep_legal_documento?: string | null;
  correo: string;
  telefono: string;
  direccion?: string | null;
};

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: ClientData) => void;
  clientToEdit?: ClientData | null;
}

export function ClientModal({ isOpen, onClose, onSave, clientToEdit }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientData>({
    tipo_persona: 'Natural',
    documento: '',
    nombre_razon_social: '',
    rep_legal_nombre: '',
    rep_legal_documento: '',
    correo: '',
    telefono: '',
    direccion: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (clientToEdit) {
      setFormData(clientToEdit);
    } else {
      setFormData({
        tipo_persona: 'Natural',
        documento: '',
        nombre_razon_social: '',
        rep_legal_nombre: '',
        rep_legal_documento: '',
        correo: '',
        telefono: '',
        direccion: '',
      });
    }
    setError("");
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      
      const payload: any = {
        tipo_persona: formData.tipo_persona,
        documento: formData.documento,
        nombre_razon_social: formData.nombre_razon_social,
        correo: formData.correo,
        telefono: formData.telefono,
        direccion: formData.direccion || null,
      };

      if (formData.tipo_persona === 'Juridica') {
        payload.rep_legal_nombre = formData.rep_legal_nombre || null;
        payload.rep_legal_documento = formData.rep_legal_documento || null;
      } else {
        payload.rep_legal_nombre = null;
        payload.rep_legal_documento = null;
      }

      if (formData.id) {
        payload.id = formData.id;
      }

      const { data, error: upsertError } = await (supabase.from('clientes') as any)
        .upsert(payload, { onConflict: 'documento' })
        .select()
        .single();

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al guardar el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            {formData.tipo_persona === 'Juridica' ? <Building className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
            {formData.id ? "Editar Cliente" : "Crear Cliente"}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Persona</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_persona: 'Natural' })}
                  className={`py-2 px-3 text-sm rounded-md border transition-all flex items-center justify-center gap-2 ${
                    formData.tipo_persona === 'Natural' 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <User className="w-4 h-4" /> Natural
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_persona: 'Juridica' })}
                  className={`py-2 px-3 text-sm rounded-md border transition-all flex items-center justify-center gap-2 ${
                    formData.tipo_persona === 'Juridica' 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Building className="w-4 h-4" /> Jurídica
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {formData.tipo_persona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.nombre_razon_social}
                  onChange={(e) => setFormData({ ...formData, nombre_razon_social: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={formData.tipo_persona === 'Natural' ? 'Ej. Juan Pérez' : 'Ej. Empresa S.A.S'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {formData.tipo_persona === 'Natural' ? 'Documento (CC/CE)' : 'NIT'} <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Número de documento"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Teléfono <span className="text-destructive">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej. 300 000 0000"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Correo Electrónico <span className="text-destructive">*</span></label>
                <input
                  required
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Dirección (Opcional)</label>
                <input
                  type="text"
                  value={formData.direccion || ''}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Dirección completa"
                />
              </div>

              {formData.tipo_persona === 'Juridica' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nombre Representante Legal</label>
                    <input
                      type="text"
                      value={formData.rep_legal_nombre || ''}
                      onChange={(e) => setFormData({ ...formData, rep_legal_nombre: e.target.value })}
                      className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Nombre del representante"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Doc. Representante Legal</label>
                    <input
                      type="text"
                      value={formData.rep_legal_documento || ''}
                      onChange={(e) => setFormData({ ...formData, rep_legal_documento: e.target.value })}
                      className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="CC del representante"
                    />
                  </div>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="client-form"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {formData.id ? "Guardar Cambios" : "Crear Cliente"}
          </button>
        </div>

      </div>
    </div>
  );
}
