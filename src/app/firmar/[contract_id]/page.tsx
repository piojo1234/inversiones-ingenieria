"use client";

import React, { useState, useEffect, useRef } from "react";
import { CanvasSignature } from "@/components/canvas-signature";
import { FileSignature, CheckCircle2, Building2, Loader2, Download, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function SignPage({ params }: { params: { contract_id: string } }) {
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<Record<string, any>>({});
  const [isFullySigned, setIsFullySigned] = useState(false);
  
  // Guardará el string final de HTML a inyectar
  const [compiledHtml, setCompiledHtml] = useState<string>("");
  const [templateFound, setTemplateFound] = useState<boolean>(true);

  const [hasReadDocument, setHasReadDocument] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState("");

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchContract() {
      const supabase = createClient();
      try {
        const { data: ct, error } = await supabase
          .from('contratos')
          .select(`
            *,
            empresas ( nombre ),
            inmuebles ( identificador, area_m2, matricula_inmobiliaria, cedula_catastral, linderos, tradicion ),
            plan_pagos ( * ),
            contratantes_contrato (
              id,
              rol_contratante,
              firma_hash,
              firma_ip,
              clientes ( nombre_razon_social, documento )
            )
          `)
          .eq('id', params.contract_id)
          .single();

        if (error) throw error;
        if (ct) {
          const ctAny = ct as any;
          setContract(ctAny);
          
          let sortedPaymentPlan: any[] = [];
          if (ctAny.plan_pagos) {
            sortedPaymentPlan = ctAny.plan_pagos.sort((a: any, b: any) => a.numero_cuota - b.numero_cuota);
            setPaymentPlan(sortedPaymentPlan);
          }

          // Fetch real template
          // Intenta traer 'contenido_json' si existe, o 'clausulas' como fallback
          const { data: tmplData, error: tmplError } = await supabase
            .from('plantillas_contratos')
            .select('*')
            .eq('empresa_id', ctAny.empresa_id)
            .eq('tipo_contrato', ctAny.tipo_contrato)
            .single();
            
          const tmpl = tmplData as any;
          let rawData = null;

          if (tmpl) {
            rawData = tmpl.contenido_json || tmpl.texto_completo || tmpl.clausulas || null;
          }

          if (rawData) {
            setTemplateFound(true);
            const parsed = buildFinalHtml(rawData, ctAny, sortedPaymentPlan);
            setCompiledHtml(parsed);
          } else {
            setTemplateFound(false);
            setCompiledHtml("");
          }

          // Map participants
          const parts = (ctAny.contratantes_contrato as any[] || []).map(p => ({
            id: p.id,
            nombre: p.clientes?.nombre_razon_social || 'Desconocido',
            documento: p.clientes?.documento || 'N/A',
            rol: p.rol_contratante,
            alreadySigned: !!p.firma_hash,
            ip: p.firma_ip,
            hash: p.firma_hash
          }));
          
          setParticipants(parts);
          
          if (ctAny.estado_firma === 'Firmado' || (parts.length > 0 && parts.every(p => p.alreadySigned))) {
            setIsFullySigned(true);
          }
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [params.contract_id]);

  const generatePaymentPlanHtml = (plan: any[]) => {
    if (!plan || plan.length === 0) return "<p><em>[Pendiente: No hay un plan de pagos asociado]</em></p>";
    const rowsHtml = plan.map(cuota => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px;">${cuota.numero_cuota}</td>
        <td style="padding: 8px;">${cuota.fecha_vencimiento}</td>
        <td style="padding: 8px;">${(cuota.tipo_cuota || '').replace('_', ' ')}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">$${(cuota.monto_cuota || 0).toLocaleString('es-CO')}</td>
      </tr>
    `).join('');

    return `
      <div style="width: 100%; overflow: hidden; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 24px; font-size: 12px; font-family: sans-serif;">
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead style="background-color: #f3f4f6; border-bottom: 1px solid #d1d5db;">
            <tr>
              <th style="padding: 8px;"># Cuota</th>
              <th style="padding: 8px;">Fecha Vencimiento</th>
              <th style="padding: 8px;">Tipo</th>
              <th style="padding: 8px; text-align: right;">Valor a Pagar</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  };

  const buildFinalHtml = (rawData: any, ctObj: any, plan: any[]) => {
    let baseHtml = "";

    // 1. Parser Robusto
    if (typeof rawData === "string") {
      baseHtml = rawData;
    } else if (Array.isArray(rawData)) {
      // Arreglo de cláusulas
      baseHtml = rawData.map(c => `
        <div style="margin-bottom: 1.5rem;">
          ${c.title || c.titulo ? `<h3 style="font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem;">${c.title || c.titulo}</h3>` : ''}
          <div style="white-space: pre-wrap;">${c.content || c.contenido || ''}</div>
        </div>
      `).join('');
    } else if (typeof rawData === "object" && rawData !== null) {
      if (rawData.texto) baseHtml = rawData.texto;
      else if (rawData.html) baseHtml = rawData.html;
      else baseHtml = JSON.stringify(rawData);
    }

    // 2. Extracción segura de datos
    const partes = ctObj?.contratantes_contrato || [];
    const clienteObj = partes.length > 0 ? partes[0].clientes : {};
    const inmueble = ctObj?.inmuebles || {};

    // 3. Reemplazo Seguro
    let parsed = baseHtml;

    // Reemplazo de Clientes
    parsed = parsed.replace(/\{\{cliente_nombre\}\}/g, clienteObj?.nombre_razon_social || '');
    parsed = parsed.replace(/\{\{cliente_cedula\}\}/g, clienteObj?.documento || '');

    // Reemplazo de Inmuebles
    parsed = parsed.replace(/\{\{inmueble_identificador\}\}/g, inmueble?.identificador || '');
    parsed = parsed.replace(/\{\{proyecto_nombre\}\}/g, inmueble?.proyectos?.nombre || ctObj?.proyecto_nombre || '');
    parsed = parsed.replace(/\{\{lote_linderos\}\}/g, inmueble?.linderos || '');
    parsed = parsed.replace(/\{\{matricula\}\}/g, inmueble?.matricula_inmobiliaria || '');
    parsed = parsed.replace(/\{\{cedula_catastral\}\}/gi, inmueble?.cedula_catastral || '');
    parsed = parsed.replace(/\{\{tradicion\}\}/gi, inmueble?.tradicion || '');
    parsed = parsed.replace(/\{\{area_m2\}\}/gi, inmueble?.area_m2 ? inmueble.area_m2.toString() : '');

    // Reemplazo de Valores
    parsed = parsed.replace(/\{\{valor_total_numero\}\}/g, ctObj?.valor_total ? `$${Number(ctObj.valor_total).toLocaleString('es-CO')}` : '');
    parsed = parsed.replace(/\{\{valor_total_letras\}\}/g, ctObj?.valor_total_letras || '');
    parsed = parsed.replace(/\{\{tasa_interes_mora\}\}/g, ctObj?.tasa_interes_mora || '2.5');

    // Fechas
    const fecha = ctObj?.created_at ? new Date(ctObj.created_at) : new Date();
    parsed = parsed.replace(/\{\{fecha_dia\}\}/g, fecha.getDate().toString());
    parsed = parsed.replace(/\{\{fecha_mes\}\}/g, fecha.toLocaleString('es-CO', { month: 'long' }));
    parsed = parsed.replace(/\{\{fecha_anio\}\}/g, fecha.getFullYear().toString());

    // Reemplazo del Plan de Pagos
    parsed = parsed.replace(/\{\{PLAN_PAGOS_TABLA\}\}/gi, generatePaymentPlanHtml(plan));

    // Fix basic line breaks if it's plaintext without HTML tags
    if (!parsed.includes('<p>') && !parsed.includes('<div>') && !parsed.includes('<br')) {
      parsed = parsed.replace(/\n/g, '<br />');
    }

    // Limpieza final de cualquier otro marcador {{...}} residual o nulo
    parsed = parsed.replace(/\{\{[^}]+\}\}/g, '');

    return parsed;
  };

  const handleSignatureCapture = (participantId: string, data: any) => {
    setSignatures(prev => ({ ...prev, [participantId]: data }));
  };

  const allSignaturesCaptured = participants.length > 0 && participants.every(p => signatures[p.id]);

  const handleFinalSubmit = async () => {
    if (!hasReadDocument || !allSignaturesCaptured) return;
    
    setIsProcessing(true);
    setProcessError("");
    const supabase = createClient();

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const pageNode = documentRef.current;
      if (pageNode) {
        const canvas = await html2canvas(pageNode, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfPageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfPageHeight;
        }
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `contrato_${params.contract_id}_${Date.now()}.pdf`;

      let finalPdfUrl = null;
      const { error: uploadError } = await supabase
        .storage
        .from('contratos_firmados')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.warn("Storage upload failed, bucket might not exist:", uploadError);
      } else {
        const { data: urlData } = supabase.storage.from('contratos_firmados').getPublicUrl(fileName);
        finalPdfUrl = urlData.publicUrl;
      }

      for (const p of participants) {
        const sigData = signatures[p.id];
        const { error: updateError } = await (supabase.from('contratantes_contrato') as any)
          .update({
            firma_dibujo: sigData.signatureBase64,
            firma_hash: sigData.hash,
            firma_ip: sigData.ip,
            firma_timestamp: new Date().toISOString()
          })
          .eq('id', p.id);
          
        if (updateError) throw updateError;
      }

      const { error: contractError } = await (supabase.from('contratos') as any)
        .update({ 
          estado_firma: 'Firmado',
          pdf_url: finalPdfUrl
        })
        .eq('id', params.contract_id);
        
      if (contractError) throw contractError;

      setIsFullySigned(true);
    } catch (error: any) {
      console.error("Error finalizing signature:", error);
      setProcessError("Ocurrió un error al procesar la firma. Verifique su conexión.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderizado Defensivo: Skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Cargando documento seguro...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Contrato no encontrado</h1>
        <p className="text-muted-foreground">El enlace es inválido o el contrato ha sido eliminado.</p>
      </div>
    );
  }

  if (isFullySigned) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-3xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 w-full">
          <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-heading font-bold mb-4">Contrato Firmado Exitosamente</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg">
            Todas las partes han completado el proceso de firma digital. El documento ha sido asegurado criptográficamente y guardado en PDF.
          </p>
          
          {contract.pdf_url && (
            <a 
              href={contract.pdf_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md font-medium transition-colors mb-10"
            >
              <Download className="w-5 h-5" />
              Descargar Copia Firmada
            </a>
          )}
          
          <div className="bg-card border border-border rounded-lg p-6 w-full text-left shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Certificado de Firmas (SHA-256)</h3>
            {participants.map(p => (
              <div key={p.id} className="mb-4 last:mb-0">
                <span className="font-medium text-sm block mb-1">{p.nombre} ({p.rol})</span>
                <div className="flex flex-col gap-1">
                  <code className="text-xs text-emerald-600 break-all bg-emerald-500/10 px-2 py-1.5 rounded block">
                    Hash: {p.hash || signatures[p.id]?.hash}
                  </code>
                  <span className="text-[10px] text-muted-foreground">IP registrada: {p.ip || signatures[p.id]?.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const RenderedSignatures = () => (
    <div className="grid grid-cols-2 gap-x-8 gap-y-12 mt-12 mb-8">
      {participants.map(p => (
        <div key={p.id} className="flex flex-col border border-gray-200 rounded p-4 relative min-h-[120px]">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-2">{p.rol}</span>
          <div className="flex-1 flex flex-col items-center justify-center">
            {signatures[p.id] ? (
              <div className="text-emerald-600 flex flex-col items-center">
                <img src={signatures[p.id].signatureBase64} alt="Firma" className="max-h-16 object-contain mb-1" />
                <span className="text-[8px] text-gray-400 font-mono mt-1">{signatures[p.id].hash.substring(0, 16)}...</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Pendiente por firmar al final</span>
            )}
          </div>
          <div className="mt-4 pt-2 border-t border-gray-200 text-center">
            <p className="font-bold text-xs">{p.nombre}</p>
            <p className="text-[10px] text-gray-500">Doc: {p.documento}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="bg-background border-b border-border sticky top-0 z-50 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Firma Digital</h1>
            <p className="text-xs text-muted-foreground">{contract.empresas?.nombre} - {contract.tipo_contrato}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex text-xs items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <FileSignature className={`w-4 h-4 ${allSignaturesCaptured ? 'text-emerald-500' : 'text-gray-400'}`} />
            Firmas ({Object.keys(signatures).length}/{participants.length})
          </div>
          <button 
            onClick={handleFinalSubmit}
            disabled={!hasReadDocument || !allSignaturesCaptured || isProcessing || !templateFound}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            Aceptar y Registrar
          </button>
        </div>
      </div>

      {processError && (
        <div className="max-w-4xl mx-auto mt-4 w-full px-4">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {processError}
          </div>
        </div>
      )}

      <div className="flex-1 py-8 px-2 sm:px-8 overflow-y-auto w-full flex flex-col gap-6 items-center">
        
        {!templateFound ? (
          <div className="max-w-4xl w-full bg-white shadow-md rounded-lg p-12 text-center text-black border border-gray-200">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Plantilla no configurada</h2>
            <p className="text-gray-600 mb-6">No se encontró el contenido de la plantilla para este tipo de contrato en la base de datos. Por favor, asegúrese de haber guardado la plantilla en el Editor de Plantillas antes de intentar firmar.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium"
            >
              Reintentar Carga
            </button>
          </div>
        ) : (
          <>
            {/* Documento Único y Continuo Estilizado */}
            <div 
              ref={documentRef}
              className="max-w-4xl w-full mx-auto p-8 sm:p-12 bg-white shadow-md text-black min-h-[500px] border border-gray-200"
              style={{ paddingBottom: '40px' }}
            >
              <div className="text-[10px] text-gray-400 mb-8 border-b border-gray-200 pb-2 flex justify-between uppercase tracking-wider font-sans">
                <span>{contract.empresas?.nombre}</span>
                <span>Ref: {params.contract_id.split('-')[0]}</span>
              </div>
              
              <div 
                className="text-sm leading-relaxed text-justify font-serif"
                dangerouslySetInnerHTML={{ __html: compiledHtml }} 
              />
              
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="mb-6 italic">Para constancia se firma a los {new Date().toLocaleDateString('es-CO')}.</p>
                <RenderedSignatures />
              </div>
            </div>

            {/* Consola de Firma y Confirmación */}
            <div className="max-w-4xl w-full mx-auto bg-white shadow-lg p-8 rounded-lg border border-border">
              <h2 className="text-lg font-bold text-center mb-6 uppercase border-b border-gray-200 pb-4 text-black">Consola de Aceptación y Firmas</h2>
              
              <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <label className="flex items-center gap-3 font-semibold cursor-pointer text-sm text-black">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-primary cursor-pointer"
                    checked={hasReadDocument}
                    onChange={() => setHasReadDocument(!hasReadDocument)}
                  />
                  He leído y acepto íntegramente todo el contenido del documento.
                </label>
              </div>

              <p className="text-center text-gray-500 text-xs mb-8">
                Dibuje su firma en los recuadros a continuación. Su firma será asegurada criptográficamente en el documento final.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {participants.map(p => (
                  <div key={p.id} className="relative text-black">
                    {signatures[p.id] ? (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg border border-emerald-500/50 shadow-sm">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <span className="font-semibold text-emerald-500">Firma Capturada</span>
                        <button 
                          onClick={() => {
                            const newSigs = {...signatures};
                            delete newSigs[p.id];
                            setSignatures(newSigs);
                          }}
                          className="mt-2 text-[10px] text-blue-600 underline"
                        >
                          Volver a firmar
                        </button>
                      </div>
                    ) : null}
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileSignature className="w-4 h-4 text-gray-700" />
                        <h3 className="font-medium text-sm">Firma de {p.nombre}</h3>
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{p.rol}</span>
                    </div>
                    
                    <CanvasSignature onSave={(data) => handleSignatureCapture(p.id, data)} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
