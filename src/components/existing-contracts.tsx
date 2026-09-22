"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileText, CheckCircle2, Clock, Copy, MessageCircle, Mail, Download, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EditContractModal } from "./edit-contract-modal";

interface Contrato {
  id: string;
  tipo_contrato: string;
  fecha_inicio: string;
  valor_total: number;
  estado_firma: string;
  inmuebles?: {
    identificador: string;
  };
  contratantes_contrato?: Array<{
    clientes?: {
      nombre_razon_social: string;
    }
  }>;
}

export function ExistingContracts() {
  const { activeCompany } = useCompany();
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id, 
          tipo_contrato, 
          fecha_inicio, 
          valor_total, 
          estado_firma,
          inmuebles ( identificador ),
          contratantes_contrato ( 
            clientes ( nombre_razon_social ) 
          )
        `)
        .eq('empresa_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setContracts(data as unknown as Contrato[]);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.id) {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany]);

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/firmar/${id}`;
    navigator.clipboard.writeText(link);
    alert("Enlace copiado al portapapeles:\n" + link);
  };

  const handleWhatsApp = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/firmar/${id}`;
    const text = encodeURIComponent(`¡Hola! Aquí tienes el enlace para firmar tu contrato con ${activeCompany.name}:\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/firmar/${id}`;
    const subject = encodeURIComponent(`Firma de contrato - ${activeCompany.name}`);
    const body = encodeURIComponent(`Por favor, ingrese al siguiente enlace para firmar su contrato digital:\n\n${link}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleDownload = (e: React.MouseEvent, contract: Contrato) => {
    e.stopPropagation();
    if (contract.estado_firma === 'Firmado') {
      const pdfUrl = (contract as any).pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      } else {
        alert("Descargando PDF Consolidado del contrato firmado...");
      }
    } else {
      alert("Descargando Borrador en PDF...");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de que deseas eliminar este contrato? Esta acción no se puede deshacer y borrará también el plan de pagos asociado.")) return;
    
    try {
      const supabase = createClient();
      
      // Delete relationships first (plan_pagos, contratantes_contrato)
      await supabase.from('plan_pagos').delete().eq('contrato_id', id);
      await supabase.from('contratantes_contrato').delete().eq('contrato_id', id);
      
      // Finally delete the contract
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) throw error;
      
      alert("Contrato eliminado exitosamente.");
      fetchContracts();
    } catch (error: any) {
      console.error("Error deleting contract:", error);
      alert("Hubo un error al eliminar el contrato: " + error.message);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Contratos Existentes
        </h2>
        <span className="text-sm text-muted-foreground">{contracts.length} encontrados</span>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Listado de contratos generados para {activeCompany.name}. Gestione el envío de firmas o descargue los documentos.
      </p>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-md border border-dashed border-border">
          <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-sm font-medium">No hay contratos</h3>
          <p className="text-xs text-muted-foreground mt-1">Esta empresa aún no tiene contratos registrados en la base de datos.</p>
        </div>
      ) : (
        <div className="overflow-x-visible mt-2">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 rounded-tl-md">Inmueble / Proyecto</th>
                <th className="px-4 py-3">Cliente Principal</th>
                <th className="px-4 py-3">Fecha Inicio</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right rounded-tr-md">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const cliente = contract.contratantes_contrato?.[0]?.clientes?.nombre_razon_social || "Sin asignar";
                
                return (
                  <tr key={contract.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {contract.inmuebles?.identificador || "Inmueble N/A"}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate w-24" title={contract.id}>
                        {contract.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{cliente}</span>
                    </td>
                    <td className="px-4 py-3">{new Date(contract.fecha_inicio).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">${contract.valor_total?.toLocaleString('es-CO') || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                        contract.estado_firma === 'Firmado' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {contract.estado_firma === 'Firmado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {contract.estado_firma || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => handleCopyLink(e, contract.id)}
                          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          title="Copiar Link de Firma"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={(e) => handleWhatsApp(e, contract.id)}
                          className="p-1.5 hover:bg-emerald-500/10 rounded-md text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="Enviar por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={(e) => handleEmail(e, contract.id)}
                          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          title="Enviar Correo"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={(e) => handleDownload(e, contract)}
                          className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {contract.estado_firma !== 'Firmado' && (
                          <>
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingContractId(contract.id);
                              }}
                              className="p-1.5 hover:bg-blue-500/10 rounded-md text-muted-foreground hover:text-blue-600 transition-colors"
                              title="Editar Contrato"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, contract.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-600 transition-colors"
                              title="Eliminar Contrato"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <EditContractModal 
        isOpen={!!editingContractId}
        contractId={editingContractId}
        onClose={() => setEditingContractId(null)}
        onSuccess={() => {
          setEditingContractId(null);
          fetchContracts();
        }}
      />
    </div>
  );
}
