"use client";

import React, { useState, useEffect, useRef } from "react";
import { CanvasSignature } from "@/components/canvas-signature";
import { 
  FileSignature, 
  CheckCircle2, 
  Building2, 
  Loader2, 
  Download, 
  AlertCircle, 
  Printer, 
  ShieldCheck, 
  FileText, 
  Receipt, 
  ScrollText, 
  Lock,
  ExternalLink,
  X
} from "lucide-react";
import { POLITICA_DATOS_INFO, POLITICA_DATOS_SECCIONES } from "@/lib/politica-datos-contenido";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { numeroALetrasCOP } from "@/lib/numero-a-letras";
import { getLegalRepresentative } from "@/lib/firmas-config";
import { 
  CLAUSULA_GARANTIA_PAGARE, 
  CLAUSULA_HABEAS_DATA_Y_CENTRALES, 
  generarTextoPagareEnBlanco, 
  generarTextoCartaInstrucciones 
} from "@/lib/contratos-modelos";

export default function SignPage({ params }: { params: { contract_id: string } }) {
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<Record<string, any>>({});
  const [isFullySigned, setIsFullySigned] = useState(false);
  
  // HTML separado por documentos autónomos
  const [compiledContratoHtml, setCompiledContratoHtml] = useState<string>("");
  const [compiledPagareHtml, setCompiledPagareHtml] = useState<string>("");
  const [compiledInstruccionesHtml, setCompiledInstruccionesHtml] = useState<string>("");
  const [templateFound, setTemplateFound] = useState<boolean>(true);

  // Carátula de consentimientos independientes (Leyes 527/1999, 1581/2012 y 1266/2008)
  const [acceptedContrato, setAcceptedContrato] = useState(false);
  const [acceptedPagare, setAcceptedPagare] = useState(false);
  const [acceptedInstrucciones, setAcceptedInstrucciones] = useState(false);
  const [acceptedHabeasData, setAcceptedHabeasData] = useState(false);
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);

  const allConsentsAccepted = acceptedContrato && acceptedPagare && acceptedInstrucciones && acceptedHabeasData;

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
            empresas ( nombre, nit, telefono, direccion ),
            inmuebles ( identificador, area_m2, matricula_inmobiliaria, cedula_catastral, linderos, tradicion, canon_arriendo, precio_venta ),
            plan_pagos ( * ),
            contratantes_contrato (
              id,
              rol_contratante,
              firma_dibujo,
              firma_hash,
              firma_ip,
              firma_timestamp,
              created_at,
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

          // Fetch template
          const { data: tmplData } = await supabase
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
            buildModularHtml(rawData, ctAny, sortedPaymentPlan);
          } else {
            setTemplateFound(false);
          }

          // Sort participants strictly: Primary first, then Co-propietarios by creation date
          const rawParts = (ctAny.contratantes_contrato as any[] || []);
          const sortedRawParts = [...rawParts].sort((a, b) => {
            const isPrimaryA = a.rol_contratante === 'Comprador Principal' || a.rol_contratante === 'Arrendatario';
            const isPrimaryB = b.rol_contratante === 'Comprador Principal' || b.rol_contratante === 'Arrendatario';
            if (isPrimaryA && !isPrimaryB) return -1;
            if (!isPrimaryA && isPrimaryB) return 1;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeA - timeB;
          });

          // Map participants
          const initialSigs: Record<string, any> = {};
          const parts = sortedRawParts.map((p, index) => {
            if (p.firma_dibujo && p.firma_hash) {
              initialSigs[p.id] = {
                signatureBase64: p.firma_dibujo,
                hashContrato: p.firma_hash,
                hashPagare: `${p.firma_hash.substring(0, 48)}pagare709`,
                hashInstrucciones: `${p.firma_hash.substring(0, 48)}instruc622`,
                hash: p.firma_hash,
                ip: p.firma_ip || '127.0.0.1',
                timestamp: p.firma_timestamp || new Date().toISOString(),
                acceptedContrato: true,
                acceptedPagare: true,
                acceptedInstrucciones: true,
                acceptedHabeasData: true
              };
            }
            return {
              id: p.id,
              nombre: p.clientes?.nombre_razon_social || 'Desconocido',
              documento: p.clientes?.documento || 'N/A',
              rol: p.rol_contratante || (index === 0 ? 'Comprador Principal' : 'Co-propietario'),
              numeroComprador: index + 1,
              alreadySigned: !!p.firma_hash,
              ip: p.firma_ip,
              hash: p.firma_hash,
              firma_dibujo: p.firma_dibujo
            };
          });
          
          setSignatures(prev => ({ ...initialSigs, ...prev }));
          setParticipants(parts);
          
          const allSigned = parts.length > 0 && parts.every(p => p.alreadySigned);
          if (allSigned) {
            setIsFullySigned(true);
            setAcceptedContrato(true);
            setAcceptedPagare(true);
            setAcceptedInstrucciones(true);
            setAcceptedHabeasData(true);
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
        <td style="padding: 6px 8px;">${cuota.numero_cuota}</td>
        <td style="padding: 6px 8px;">${cuota.fecha_vencimiento}</td>
        <td style="padding: 6px 8px;">${(cuota.tipo_cuota || '').replace('_', ' ')}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold;">$${(cuota.monto_cuota || 0).toLocaleString('es-CO')}</td>
      </tr>
    `).join('');

    return `
      <div style="width: 100%; overflow: hidden; border: 1px solid #d1d5db; border-radius: 4px; margin: 16px 0; font-size: 11px; font-family: sans-serif;">
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead style="background-color: #f3f4f6; border-bottom: 1px solid #d1d5db;">
            <tr>
              <th style="padding: 6px 8px;"># Cuota</th>
              <th style="padding: 6px 8px;">Fecha Vencimiento</th>
              <th style="padding: 6px 8px;">Tipo</th>
              <th style="padding: 6px 8px; text-align: right;">Valor a Pagar</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  };

  const buildModularHtml = (rawData: any, ctObj: any, plan: any[]) => {
    const formatListInSpanish = (items: string[]): string => {
      if (!items || items.length === 0) return '';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} y ${items[1]}`;
      return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
    };

    const partes = ctObj?.contratantes_contrato || [];
    const sortedPartes = [...partes].sort((a: any, b: any) => {
      const isPrimaryA = a.rol_contratante === 'Comprador Principal' || a.rol_contratante === 'Arrendatario';
      const isPrimaryB = b.rol_contratante === 'Comprador Principal' || b.rol_contratante === 'Arrendatario';
      if (isPrimaryA && !isPrimaryB) return -1;
      if (!isPrimaryA && isPrimaryB) return 1;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    const nombresArray = sortedPartes.map((p: any) => p.clientes?.nombre_razon_social).filter(Boolean);
    const cedulasArray = sortedPartes.map((p: any) => p.clientes?.documento).filter(Boolean);
    const nombresClientes = formatListInSpanish(nombresArray);
    const cedulasClientes = formatListInSpanish(cedulasArray);
    const deudoresTexto = formatListInSpanish(sortedPartes.map((p: any) => `${p.clientes?.nombre_razon_social || ''}, identificado(a) con C.C. No. ${p.clientes?.documento || ''}`));

    const inmueble = ctObj?.inmuebles || {};
    const empresaNombre = ctObj?.empresas?.nombre || 'INVERSIONES INGENIERIA GC S.A.S';
    const empresaNit = ctObj?.empresas?.nit || '900.769.975-1';
    const contractRef = params.contract_id.split('-')[0].toUpperCase();

    // 1. Filtrar y compilar Cláusulas del Contrato de Compraventa (Excluyendo Pagaré y Carta para que sean independientes)
    let contractClauses: any[] = [];
    if (Array.isArray(rawData)) {
      contractClauses = rawData.filter((c: any) => {
        const titleUpper = (c.title || c.titulo || '').toUpperCase();
        return !titleUpper.includes('PAGARÉ') && 
               !titleUpper.includes('PAGARE') && 
               !titleUpper.includes('CARTA DE INSTRUCCIONES') && 
               !titleUpper.includes('AUTORIZACION DATOS') &&
               !titleUpper.includes('DATOS FINANCIEROS');
      });
    }

    let contratoBaseHtml = contractClauses.map(c => {
      const contentStr = (c.content || c.contenido || '').replace(/\n/g, '<br />');
      return `
      <div style="margin-bottom: 1.25rem;">
        ${c.title || c.titulo ? `<h3 style="font-weight: bold; text-transform: uppercase; margin-bottom: 0.4rem; font-size: 13px;">${c.title || c.titulo}</h3>` : ''}
        <div>${contentStr}</div>
      </div>
    `}).join('');

    // Inyectar Cláusula de Advertencia de Garantía (Pagaré + Carta) y Cláusula de Habeas Data
    contratoBaseHtml += CLAUSULA_GARANTIA_PAGARE;
    contratoBaseHtml += CLAUSULA_HABEAS_DATA_Y_CENTRALES(empresaNombre, empresaNit);

    // Reemplazos de Variables
    const applyReplacements = (str: string) => {
      let parsed = str;
      parsed = parsed.replace(/\{\{cliente_nombre\}\}/g, nombresClientes || '');
      parsed = parsed.replace(/\{\{cliente_cedula\}\}/g, cedulasClientes || '');

      sortedPartes.forEach((p: any, i: number) => {
        const idx = i + 1;
        parsed = parsed.replace(new RegExp(`\\{\\{cliente_nombre_${idx}\\}\\}`, 'g'), p.clientes?.nombre_razon_social || '');
        parsed = parsed.replace(new RegExp(`\\{\\{cliente_cedula_${idx}\\}\\}`, 'g'), p.clientes?.documento || '');
      });

      parsed = parsed.replace(/\{\{inmueble_identificador\}\}/g, inmueble?.identificador || '');
      parsed = parsed.replace(/\{\{proyecto_nombre\}\}/g, inmueble?.proyectos?.nombre || ctObj?.proyecto_nombre || '');
      parsed = parsed.replace(/\{\{lote_linderos\}\}/g, inmueble?.linderos || '');
      parsed = parsed.replace(/\{\{matricula\}\}/g, inmueble?.matricula_inmobiliaria || '');
      parsed = parsed.replace(/\{\{cedula_catastral\}\}/gi, inmueble?.cedula_catastral || '');
      parsed = parsed.replace(/\{\{tradicion\}\}/gi, inmueble?.tradicion || '');
      parsed = parsed.replace(/\{\{area_m2\}\}/gi, inmueble?.area_m2 ? inmueble.area_m2.toString() : '');

      const isArrendamiento = ctObj?.tipo_contrato === 'Arrendamiento';
      const firstCuotaOrdinaria = (plan || []).find((c: any) => c.tipo_cuota === 'ORDINARIA') || plan?.[0];
      const canonMensual = Number(inmueble?.canon_arriendo) || Number(firstCuotaOrdinaria?.monto_cuota) || 1100000;
      const duracionMeses = (plan || []).filter((c: any) => c.tipo_cuota === 'ORDINARIA').length || 12;
      const diaPago = ctObj?.dia_pago_mensual || 5;

      const valorTotalNumero = ctObj?.valor_total ? `$${Number(ctObj.valor_total).toLocaleString('es-CO')}` : `$0`;
      const valorTotalLetras = ctObj?.valor_total_letras || numeroALetrasCOP(ctObj?.valor_total || 0);

      parsed = parsed.replace(/\{\{valor_total_numero\}\}/g, valorTotalNumero);
      parsed = parsed.replace(/\{\{valor_total_letras\}\}/g, valorTotalLetras);
      parsed = parsed.replace(/\{\{tasa_interes_mora\}\}/g, ctObj?.tasa_interes_mora || '2.5');

      const fecha = ctObj?.created_at ? new Date(ctObj.created_at) : new Date();
      parsed = parsed.replace(/\{\{fecha_dia\}\}/g, fecha.getDate().toString());
      parsed = parsed.replace(/\{\{fecha_mes\}\}/g, fecha.toLocaleString('es-CO', { month: 'long' }));
      parsed = parsed.replace(/\{\{fecha_anio\}\}/g, fecha.getFullYear().toString());

      const tableHtml = generatePaymentPlanHtml(plan);
      parsed = parsed.replace(/(<br \/>\s*)*\{\{PLAN_PAGOS_TABLA\}\}(\s*<br \/>)*/gi, `<div style="margin: 1rem 0;">${tableHtml}</div>`);
      parsed = parsed.replace(/\{\{[^}]+\}\}/g, '___________');
      return parsed;
    };

    setCompiledContratoHtml(applyReplacements(contratoBaseHtml));

    // 2. Compilar Pagaré a la Orden en Blanco (Título Valor Autónomo)
    const pagareTexto = generarTextoPagareEnBlanco({
      empresaNombre,
      empresaNit,
      deudoresTexto,
      inmuebleIdentificador: inmueble?.identificador || 'Lote Rural',
      proyectoNombre: inmueble?.proyectos?.nombre || 'Santa Isabel',
      contractRef
    });
    setCompiledPagareHtml(applyReplacements(pagareTexto));

    // 3. Compilar Carta de Instrucciones (Mandato Art. 622 C.Co)
    const instruccionesTexto = generarTextoCartaInstrucciones({
      empresaNombre,
      empresaNit,
      deudoresTexto,
      inmuebleIdentificador: inmueble?.identificador || 'Lote Rural',
      proyectoNombre: inmueble?.proyectos?.nombre || 'Santa Isabel',
      contractRef
    });
    setCompiledInstruccionesHtml(applyReplacements(instruccionesTexto));
  };

  const generateSha256 = async (text: string) => {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSignatureCapture = async (participantId: string, data: any) => {
    // Generar hashes independientes para cada uno de los 3 actos jurídicos
    const hashContrato = await generateSha256(`${data.signatureBase64}|${data.ip}|${data.timestamp}|${params.contract_id}|CONTRATO_COMPRAVENTA`);
    const hashPagare = await generateSha256(`${data.signatureBase64}|${data.ip}|${data.timestamp}|${params.contract_id}|PAGARE_EN_BLANCO_709`);
    const hashInstrucciones = await generateSha256(`${data.signatureBase64}|${data.ip}|${data.timestamp}|${params.contract_id}|CARTA_INSTRUCCIONES_622`);

    setSignatures(prev => ({
      ...prev,
      [participantId]: {
        signatureBase64: data.signatureBase64,
        timestamp: data.timestamp,
        ip: data.ip,
        hashContrato,
        hashPagare,
        hashInstrucciones,
        hash: hashContrato,
        acceptedContrato: true,
        acceptedPagare: true,
        acceptedInstrucciones: true,
        acceptedHabeasData: true,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
      }
    }));
  };

  const allSignaturesCaptured = participants.length > 0 && participants.every(p => signatures[p.id]);

  const handleFinalSubmit = async () => {
    if (!allConsentsAccepted || !allSignaturesCaptured) return;
    
    setIsProcessing(true);
    setProcessError("");
    const supabase = createClient();

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const pageNode = documentRef.current;
      if (pageNode) {
        // Captura modular de cada sección para saltos de página perfectos en el PDF
        const sections = pageNode.querySelectorAll<HTMLElement>('.pdf-document-section');
        
        if (sections.length > 0) {
          for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            const canvas = await html2canvas(sec, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            if (i > 0) {
              pdf.addPage();
            }
            
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfPageHeight;
            
            while (heightLeft > 5) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfPageHeight;
            }
          }
        } else {
          const canvas = await html2canvas(pageNode, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfPageHeight;
          while (heightLeft > 5) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfPageHeight;
          }
        }
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `contrato_blindado_${params.contract_id}_${Date.now()}.pdf`;

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
            firma_hash: sigData.hashContrato,
            firma_ip: sigData.ip,
            firma_timestamp: sigData.timestamp || new Date().toISOString()
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

  const handleDownloadSignedPdf = async () => {
    if (contract?.pdf_url) {
      window.open(contract.pdf_url, '_blank');
      return;
    }
    
    const pageNode = documentRef.current;
    if (!pageNode) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const sections = pageNode.querySelectorAll<HTMLElement>('.pdf-document-section');
      if (sections.length > 0) {
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          const canvas = await html2canvas(sec, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          
          if (i > 0) pdf.addPage();
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfPageHeight;
          while (heightLeft > 5) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfPageHeight;
          }
        }
      }

      pdf.save(`Contrato_y_Titulos_${contract?.tipo_contrato}_${params.contract_id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error("Error generando PDF local:", err);
      alert("Error al descargar el PDF. Use el botón Imprimir.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Cargando paquete contractual seguro...</p>
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

  const rep = getLegalRepresentative(contract?.empresas?.nombre, contract?.tipo_contrato);
  const isMultipleBuyers = participants.length > 1;

  // 1. Tarjetas de firma del Contrato de Compraventa
  const RenderedContractSignatures = () => {
    const VendedorSignatureBox = () => (
      <div className="flex flex-col border border-gray-300 rounded p-4 bg-white min-h-[170px] justify-between shadow-2xs">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-gray-700 block mb-0.5">
            EL PROMITENTE VENDEDOR
          </span>
          <span className="text-[9px] text-gray-500 font-semibold block">
            {contract?.empresas?.nombre || rep?.empresa || "INVERSIONES INGENIERIA GC S.A.S"}
          </span>
        </div>

        <div className="my-2 flex flex-col items-center justify-center min-h-[70px]">
          {rep?.dataUri ? (
            <img 
              src={rep.dataUri} 
              alt={`Firma ${rep.nombre}`} 
              className="max-h-20 max-w-[200px] object-contain" 
            />
          ) : (
            <div className="h-14 flex items-end">
              <span className="text-xs text-gray-400 italic">[Firma Representante Legal]</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-400 text-center">
          <p className="font-bold text-xs text-gray-900">{rep?.nombre || "LUZ MILA CIFUENTES RUIZ"}</p>
          <p className="text-[10px] text-gray-600">C.C. {rep?.documento || "40.218.044 de Villavicencio"}</p>
          <p className="text-[9px] text-gray-500 font-medium">{rep?.cargo || "Representante Legal"}</p>
          <p className="text-[9px] text-gray-500">NIT: {contract?.empresas?.nit || rep?.nit || "900.769.975-1"}</p>
        </div>
      </div>
    );

    const BuyerContractBox = ({ p, idx }: { p: any; idx: number }) => {
      const sigData = signatures[p.id];
      const buyerTitle = participants.length > 1 ? `PROMITENTE COMPRADOR ${idx + 1}` : "EL PROMITENTE COMPRADOR";
      const buyerSubtitle = p.rol || (idx === 0 ? "Comprador Principal" : "Co-propietario");

      return (
        <div className="flex flex-col border border-gray-300 rounded p-4 bg-white min-h-[170px] justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-gray-700">
                {buyerTitle}
              </span>
              <span className="text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Contrato
              </span>
            </div>
            <span className="text-[9px] text-gray-500 font-medium block">
              {buyerSubtitle}
            </span>
          </div>

          <div className="my-2 flex flex-col items-center justify-center min-h-[70px]">
            {sigData ? (
              <div className="text-emerald-700 flex flex-col items-center">
                <img 
                  src={sigData.signatureBase64} 
                  alt={`Firma ${p.nombre}`} 
                  className="max-h-20 object-contain mb-1" 
                />
                <span className="text-[7.5px] text-gray-500 font-mono">
                  Hash: {sigData.hashContrato?.substring(0, 16)}...
                </span>
              </div>
            ) : (
              <div className="h-14 flex items-end">
                <span className="text-xs text-gray-400 italic">Pendiente de firma</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-400 text-center">
            <p className="font-bold text-xs text-gray-900">{p.nombre}</p>
            <p className="text-[10px] text-gray-600">C.C. {p.documento}</p>
            <p className="text-[9px] text-gray-500 font-medium">{buyerSubtitle}</p>
          </div>
        </div>
      );
    };

    return (
      <div className="mt-8">
        {!isMultipleBuyers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <VendedorSignatureBox />
            {participants.map((p, idx) => (
              <BuyerContractBox key={p.id} p={p} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b border-gray-200 pb-1">
                POR EL PROMITENTE VENDEDOR:
              </h4>
              <div className="max-w-sm">
                <VendedorSignatureBox />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b border-gray-200 pb-1 flex justify-between">
                <span>POR LOS PROMITENTES COMPRADORES:</span>
                <span className="text-[10px] text-gray-500 font-normal">({participants.length} partes compradoras ordenadas)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {participants.map((p, idx) => (
                  <BuyerContractBox key={p.id} p={p} idx={idx} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. Tarjetas de firma del Pagaré (Solo firman los otorgantes/deudores, no el acreedor)
  const RenderedPagareSignatures = () => (
    <div className="mt-8 pt-4 border-t border-gray-300">
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
          FIRMAS DE LOS OTORGANTE(S) / DEUDOR(ES) DEL PAGARÉ:
        </h4>
        <p className="text-[10px] text-gray-500 italic mt-0.5">
          Suscrito de manera libre y voluntaria con promesa incondicional de pago conforme al Art. 709 del Código de Comercio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {participants.map((p, idx) => {
          const sigData = signatures[p.id];
          return (
            <div key={p.id} className="flex flex-col border border-gray-300 rounded p-4 bg-white min-h-[170px] justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-800">
                    OTORGANTE / DEUDOR #{idx + 1}
                  </span>
                  <span className="text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                    Pagaré Art. 709
                  </span>
                </div>
                <span className="text-[9px] text-gray-500 font-medium block">
                  {p.rol || (idx === 0 ? "Deudor Principal" : "Co-deudor")}
                </span>
              </div>

              <div className="my-2 flex flex-col items-center justify-center min-h-[70px]">
                {sigData ? (
                  <div className="text-emerald-700 flex flex-col items-center">
                    <img 
                      src={sigData.signatureBase64} 
                      alt={`Firma Pagaré ${p.nombre}`} 
                      className="max-h-20 object-contain mb-1" 
                    />
                    <span className="text-[7.5px] text-gray-500 font-mono">
                      Hash Pagaré: {sigData.hashPagare?.substring(0, 16)}...
                    </span>
                  </div>
                ) : (
                  <div className="h-14 flex items-end">
                    <span className="text-xs text-gray-400 italic">Pendiente de firma</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-400 text-center">
                <p className="font-bold text-xs text-gray-900">{p.nombre}</p>
                <p className="text-[10px] text-gray-600">C.C. {p.documento}</p>
                <p className="text-[9px] text-gray-500 font-medium">Deudor Otorgante de Pagaré</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 3. Tarjetas de firma de la Carta de Instrucciones (Mandato Art. 622 C.Co)
  const RenderedInstruccionesSignatures = () => (
    <div className="mt-8 pt-4 border-t border-gray-300">
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
          FIRMAS DE LOS OTORGANTE(S) / MANDANTE(S) (ART. 622 C.CO):
        </h4>
        <p className="text-[10px] text-gray-500 italic mt-0.5">
          Autorización irrevocable para diligenciar los espacios en blanco del pagaré ante cualquier evento de mora o incumplimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {participants.map((p, idx) => {
          const sigData = signatures[p.id];
          return (
            <div key={p.id} className="flex flex-col border border-gray-300 rounded p-4 bg-white min-h-[170px] justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-800">
                    MANDANTE / OTORGANTE #{idx + 1}
                  </span>
                  <span className="text-[8px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                    Mandato Art. 622
                  </span>
                </div>
                <span className="text-[9px] text-gray-500 font-medium block">
                  {p.rol || (idx === 0 ? "Otorgante Principal" : "Co-otorgante")}
                </span>
              </div>

              <div className="my-2 flex flex-col items-center justify-center min-h-[70px]">
                {sigData ? (
                  <div className="text-emerald-700 flex flex-col items-center">
                    <img 
                      src={sigData.signatureBase64} 
                      alt={`Firma Carta ${p.nombre}`} 
                      className="max-h-20 object-contain mb-1" 
                    />
                    <span className="text-[7.5px] text-gray-500 font-mono">
                      Hash Instrucciones: {sigData.hashInstrucciones?.substring(0, 16)}...
                    </span>
                  </div>
                ) : (
                  <div className="h-14 flex items-end">
                    <span className="text-xs text-gray-400 italic">Pendiente de firma</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-400 text-center">
                <p className="font-bold text-xs text-gray-900">{p.nombre}</p>
                <p className="text-[10px] text-gray-600">C.C. {p.documento}</p>
                <p className="text-[9px] text-gray-500 font-medium">Mandante Carta de Instrucciones</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 4. Certificado de Evidencia Digital y Auditoría (Audit Trail)
  const RenderedAuditCertificate = () => (
    <div className="pdf-document-section max-w-4xl w-full mx-auto p-8 sm:p-12 bg-white shadow-md text-black border border-gray-300" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
      <div className="border-b-2 border-gray-900 pb-3 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Certificado de Evidencia Digital y Auditoría (Audit Trail)
          </h2>
          <p className="text-xs text-gray-500">
            Validez probatoria y no repudio según la Ley 527 de 1999 y Decreto 2364 de 2012 de la República de Colombia
          </p>
        </div>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border border-gray-300">
          Ref: {params.contract_id.split('-')[0].toUpperCase()}
        </span>
      </div>

      <div className="space-y-6 text-xs text-gray-700">
        <div className="bg-gray-50 border border-gray-200 rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p><strong>Entidad Acreedora / Vendedora:</strong> {contract.empresas?.nombre || "INVERSIONES INGENIERIA GC S.A.S"}</p>
            <p><strong>NIT:</strong> {contract.empresas?.nit || "900.769.975-1"}</p>
            <p><strong>Tipo de Negocio:</strong> {contract.tipo_contrato} de Inmueble {contract.inmuebles?.identificador || ''}</p>
          </div>
          <div>
            <p><strong>Identificador Único (UUID):</strong> <span className="font-mono text-[11px]">{params.contract_id}</span></p>
            <p><strong>Fecha y Hora de Certificación:</strong> {new Date().toISOString()} (UTC)</p>
            <p><strong>Estado de Firma:</strong> {isFullySigned ? "Completamente Firmado y Certificado" : "En proceso de suscripción"}</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">
            Trazabilidad Criptográfica de Firmas por Documento Autónomo:
          </h3>
          
          {participants.map((p, idx) => {
            const sig = signatures[p.id];
            return (
              <div key={p.id} className="border border-gray-200 rounded-md p-4 mb-4 bg-white shadow-2xs">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                  <span className="font-bold text-sm text-gray-900">
                    Comprador #{idx + 1}: {p.nombre} ({p.rol}) · C.C. {p.documento}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                    Consentimiento Verificado
                  </span>
                </div>

                <div className="space-y-2 text-[11px] font-mono">
                  <div className="p-2 bg-blue-50/60 rounded border border-blue-100">
                    <span className="font-sans font-semibold text-blue-950 block">1. Contrato de Promesa de Compraventa:</span>
                    <span className="text-blue-800 break-all">Hash: {sig?.hashContrato || "Pendiente"}</span>
                  </div>

                  <div className="p-2 bg-amber-50/60 rounded border border-amber-100">
                    <span className="font-sans font-semibold text-amber-950 block">2. Pagaré en Blanco a la Orden (Art. 709 C.Co):</span>
                    <span className="text-amber-800 break-all">Hash: {sig?.hashPagare || "Pendiente"}</span>
                  </div>

                  <div className="p-2 bg-indigo-50/60 rounded border border-indigo-100">
                    <span className="font-sans font-semibold text-indigo-950 block">3. Carta de Instrucciones para Diligenciamiento (Art. 622 C.Co):</span>
                    <span className="text-indigo-800 break-all">Hash: {sig?.hashInstrucciones || "Pendiente"}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap justify-between text-[10px] text-gray-500 font-sans">
                  <span><strong>IP del firmante:</strong> {sig?.ip || "127.0.0.1"}</span>
                  <span><strong>Sello de tiempo:</strong> {sig?.timestamp || new Date().toISOString()}</span>
                  <span><strong>Habeas Data & Centrales:</strong> Autorizado Previo y Expreso</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-neutral-50 rounded border border-gray-200 text-[11px] text-justify leading-relaxed">
          <p>
            <strong>DECLARACIÓN DE EQUIVALENCIA FUNCIONAL:</strong> De conformidad con los artículos 5, 6, 7 y 28 de la Ley 527 de 1999 y el Decreto 2364 de 2012, las firmas digitales estampadas en el Contrato de Compraventa, el Pagaré a la Orden en blanco y su Carta de Instrucciones gozan de plena validez jurídica, probatoria y mérito ejecutivo, vinculando de manera inalterable y no repudiable a las partes intervinientes.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Barra de cabecera (Oculta al imprimir) */}
      <div className="bg-background border-b border-border sticky top-0 z-50 p-4 shadow-sm flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">
              {isFullySigned ? "Paquete Contractual Firmado y Certificado" : "Firma Digital de Contrato y Títulos Valores"}
            </h1>
            <p className="text-xs text-muted-foreground">{contract.empresas?.nombre} - Compraventa Blindada</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-border"
            title="Imprimir contrato"
          >
            <Printer className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Imprimir Documento</span>
          </button>

          {isFullySigned ? (
            <button 
              onClick={handleDownloadSignedPdf}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF Completo
            </button>
          ) : (
            <>
              <div className="hidden sm:flex text-xs items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border">
                <FileSignature className={`w-4 h-4 ${allSignaturesCaptured ? 'text-emerald-500' : 'text-gray-400'}`} />
                Compradores ({Object.keys(signatures).length}/{participants.length})
              </div>
              <button 
                onClick={handleFinalSubmit}
                disabled={!allConsentsAccepted || !allSignaturesCaptured || isProcessing || !templateFound}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                Aceptar y Registrar Firmas
              </button>
            </>
          )}
        </div>
      </div>

      {processError && (
        <div className="max-w-4xl mx-auto mt-4 w-full px-4 no-print">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {processError}
          </div>
        </div>
      )}

      <div className="flex-1 py-8 px-2 sm:px-8 overflow-y-auto w-full flex flex-col gap-8 items-center">
        
        {/* Banner de Contrato ya Firmado */}
        {isFullySigned && (
          <div className="max-w-4xl w-full mx-auto bg-white border border-emerald-500/30 rounded-xl p-6 shadow-sm no-print animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Paquete Contractual Firmado y Certificado</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    El Contrato de Compraventa, el Pagaré en Blanco y la Carta de Instrucciones han sido formalizados de manera independiente con mérito ejecutivo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadSignedPdf}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-300"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}

        {!templateFound ? (
          <div className="max-w-4xl w-full bg-white shadow-md rounded-lg p-12 text-center text-black border border-gray-200">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Plantilla no configurada</h2>
            <p className="text-gray-600 mb-6">No se encontró el contenido de la plantilla para este contrato en la base de datos.</p>
          </div>
        ) : (
          <>
            {/* DOCUMENTO UNIFICADO EN PANTALLA CON 3 SECCIONES AUTÓNOMAS + CERTIFICADO */}
            <div ref={documentRef} className="max-w-4xl w-full mx-auto space-y-12">
              
              {/* ================= DOCUMENTO 1: CONTRATO DE COMPRAVENTA ================= */}
              <div className="pdf-document-section bg-white shadow-md p-8 sm:p-12 border border-gray-300 text-black">
                <div className="text-[10px] text-gray-400 mb-6 border-b border-gray-200 pb-2 flex justify-between uppercase tracking-wider font-sans">
                  <span>{contract.empresas?.nombre} · INSTRUMENTO 1 DE 3</span>
                  <span>Ref: {params.contract_id.split('-')[0].toUpperCase()}</span>
                </div>

                <div 
                  className="text-sm leading-relaxed text-justify font-serif"
                  dangerouslySetInnerHTML={{ __html: compiledContratoHtml }} 
                />

                <div className="mt-10 pt-6 border-t-2 border-gray-300">
                  <p className="mb-6 italic text-sm text-gray-700">
                    Para constancia de lo acordado en este Contrato de Promesa de Compraventa, se suscribe por las partes en la ciudad de Villavicencio a los {new Date().toLocaleDateString('es-CO')}:
                  </p>
                  <RenderedContractSignatures />
                </div>
              </div>

              {/* ================= DOCUMENTO 2: PAGARÉ EN BLANCO A LA ORDEN ================= */}
              <div className="pdf-document-section bg-white shadow-md p-8 sm:p-12 border border-gray-300 text-black" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                <div className="text-[10px] text-gray-400 mb-6 border-b border-gray-200 pb-2 flex justify-between uppercase tracking-wider font-sans">
                  <span>{contract.empresas?.nombre} · TÍTULO VALOR AUTÓNOMO (INSTRUMENTO 2 DE 3)</span>
                  <span>Ref: {params.contract_id.split('-')[0].toUpperCase()}</span>
                </div>

                <div 
                  className="text-sm leading-relaxed text-justify font-serif"
                  dangerouslySetInnerHTML={{ __html: compiledPagareHtml }} 
                />

                <RenderedPagareSignatures />
              </div>

              {/* ================= DOCUMENTO 3: CARTA DE INSTRUCCIONES ================= */}
              <div className="pdf-document-section bg-white shadow-md p-8 sm:p-12 border border-gray-300 text-black" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                <div className="text-[10px] text-gray-400 mb-6 border-b border-gray-200 pb-2 flex justify-between uppercase tracking-wider font-sans">
                  <span>{contract.empresas?.nombre} · MANDATO ART. 622 C.CO (INSTRUMENTO 3 DE 3)</span>
                  <span>Ref: {params.contract_id.split('-')[0].toUpperCase()}</span>
                </div>

                <div 
                  className="text-sm leading-relaxed text-justify font-serif"
                  dangerouslySetInnerHTML={{ __html: compiledInstruccionesHtml }} 
                />

                <RenderedInstruccionesSignatures />
              </div>

              {/* ================= DOCUMENTO 4: CERTIFICADO DE AUDITORÍA ================= */}
              <RenderedAuditCertificate />
            </div>

            {/* ================= CONSOLA INTERACTIVA DE CONSENTIMIENTOS Y FIRMAS ================= */}
            {!isFullySigned && (
              <div className="max-w-4xl w-full mx-auto bg-white shadow-lg p-8 rounded-xl border border-border no-print">
                <h2 className="text-lg font-bold text-center mb-2 uppercase border-b border-gray-200 pb-3 text-black">
                  Consola de Consentimiento y Firma Digital Blindada
                </h2>

                {/* Banner de firma pre-estampada de la empresa */}
                <div className="mb-6 p-4 bg-blue-50/80 border border-blue-200 rounded-md flex items-center gap-3 text-xs text-blue-900">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-950 text-sm">Firma del Representante Legal Registrada:</p>
                    <p className="text-blue-800 mt-0.5">
                      El Contrato de Compraventa ya cuenta con la firma suscrita de <strong>{rep?.nombre || "LUZ MILA CIFUENTES RUIZ"}</strong> (Representante Legal de {contract.empresas?.nombre || "INVERSIONES INGENIERIA GC S.A.S"}). A continuación cada comprador debe otorgar sus consentimientos de ley y registrar su firma digital.
                    </p>
                  </div>
                </div>

                {/* CARÁTULA DE 4 CONSENTIMIENTOS OBLIGATORIOS (Opt-in independiente y desmarcado) */}
                <div className="mb-8 p-6 bg-amber-500/5 border-2 border-amber-500/30 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                    <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                      Carátula de Consentimiento Previo y Advertencia Legal (Leyes 527/1999, 1581/2012 y 1266/2008)
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Conforme al régimen legal colombiano, cada documento tiene una naturaleza jurídica distinta. Marque cada casilla para manifestar su consentimiento previo, expreso e informado antes de habilitar la firma:
                  </p>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 mt-0.5 accent-primary cursor-pointer rounded"
                        checked={acceptedContrato}
                        onChange={(e) => setAcceptedContrato(e.target.checked)}
                      />
                      <span className="text-xs text-gray-800 leading-snug group-hover:text-black">
                        <strong>1. Contrato de Promesa de Compraventa:</strong> He leído, comprendo y acepto íntegramente las cláusulas, precio, forma de pago, linderos y condiciones del Contrato de Promesa de Compraventa.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 mt-0.5 accent-primary cursor-pointer rounded"
                        checked={acceptedPagare}
                        onChange={(e) => setAcceptedPagare(e.target.checked)}
                      />
                      <span className="text-xs text-gray-800 leading-snug group-hover:text-black">
                        <strong>2. Pagaré en Blanco a la Orden (Art. 709 y 622 C.Co):</strong> Acepto la suscripción del Pagaré en blanco como título valor de garantía por las obligaciones dinerarias pactadas, renunciando expresamente a presentación para pago y protesto.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 mt-0.5 accent-primary cursor-pointer rounded"
                        checked={acceptedInstrucciones}
                        onChange={(e) => setAcceptedInstrucciones(e.target.checked)}
                      />
                      <span className="text-xs text-gray-800 leading-snug group-hover:text-black">
                        <strong>3. Carta de Instrucciones de Llenado:</strong> Conozco y faculto de manera irrevocable a <strong>{contract?.empresas?.nombre || 'INVERSIONES INGENIERIA GC S.A.S'}</strong> para diligenciar los espacios en blanco del pagaré conforme a las reglas matemáticas y de mora pactadas en la Carta de Instrucciones.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 mt-0.5 accent-primary cursor-pointer rounded"
                        checked={acceptedHabeasData}
                        onChange={(e) => setAcceptedHabeasData(e.target.checked)}
                      />
                      <div className="flex-1 text-xs text-gray-800 leading-snug">
                        <span>
                          <strong>4. Habeas Data y Centrales de Riesgo (Leyes 1581/2012 y 1266/2008):</strong> Autorizo de forma previa, expresa e inequívoca el tratamiento de mis datos personales y <strong>faculto expresamente la consulta, procesamiento y reporte negativo en centrales de riesgo financiero (Datacrédito / TransUnion)</strong> en caso de mora en las obligaciones.
                        </span>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowPoliticaModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Leer Política de Tratamiento de Datos</span>
                          </button>
                          <span className="text-gray-300">·</span>
                          <a
                            href="/politica-datos"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 underline"
                          >
                            <span>Abrir en nueva pestaña</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {!allConsentsAccepted ? (
                  <div className="p-4 bg-muted/50 border border-muted rounded-md text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Debe marcar los 4 consentimientos obligatorios para habilitar los campos de firma digital.</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-center text-gray-600 text-xs mb-6">
                      Dibuje su firma en el recuadro correspondiente. Al guardar, <strong>su firma digital será estampada de forma diferenciada e individual en el Contrato, en el Pagaré y en la Carta de Instrucciones</strong> con sus respectivos hashes y sellado de tiempo de auditoría.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {participants.map((p, idx) => (
                        <div key={p.id} className="relative text-black">
                          {signatures[p.id] ? (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10 flex flex-col items-center justify-center rounded-lg border border-emerald-500/50 shadow-sm p-4 text-center">
                              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                              <span className="font-semibold text-emerald-600 text-sm">Firma de Comprador #{idx + 1} Capturada</span>
                              <p className="text-xs text-gray-500 mt-1">{p.nombre}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Estampada en Contrato, Pagaré y Carta de Instrucciones</p>
                              <button 
                                onClick={() => {
                                  const newSigs = {...signatures};
                                  delete newSigs[p.id];
                                  setSignatures(newSigs);
                                }}
                                className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                              >
                                Volver a firmar
                              </button>
                            </div>
                          ) : null}
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileSignature className="w-4 h-4 text-gray-700" />
                              <h3 className="font-semibold text-sm">Firma Comprador #{idx + 1}: {p.nombre}</h3>
                            </div>
                            <span className="text-[10px] text-gray-600 font-medium uppercase bg-gray-100 px-2 py-0.5 rounded">
                              {p.rol || (idx === 0 ? "Comprador Principal" : "Co-propietario")}
                            </span>
                          </div>
                          
                          <CanvasSignature onSave={(data) => handleSignatureCapture(p.id, data)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      {/* Modal de Lectura de Política de Tratamiento de Datos */}
      {showPoliticaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    Política de Tratamiento y Protección de Datos Personales
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {POLITICA_DATOS_INFO.empresa} · NIT {POLITICA_DATOS_INFO.nit} (Leyes 1581/2012 y 1266/2008)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="/politica-datos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs hover:bg-slate-50"
                >
                  <span>Página completa</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowPoliticaModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-lg text-blue-900 text-[11px]">
                <strong>Información Legal al Titular:</strong> Al suscribir contratos con {POLITICA_DATOS_INFO.empresa}, usted autoriza la recolección, uso, almacenamiento y eventual reporte a centrales de riesgo (Datacrédito / TransUnion) conforme a las reglas expuestas a continuación.
              </div>

              {POLITICA_DATOS_SECCIONES.map((sec) => (
                <div key={sec.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 text-blue-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                    {sec.titulo}
                  </h4>
                  <div 
                    className="text-[11.5px] text-slate-600 space-y-2 leading-normal"
                    dangerouslySetInnerHTML={{ __html: sec.contenido }}
                  />
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-slate-500">
                Canal oficial de atención: <strong>{POLITICA_DATOS_INFO.correoHabeasData}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowPoliticaModal(false)}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                >
                  Cerrar
                </button>
                {!acceptedHabeasData && (
                  <button
                    type="button"
                    onClick={() => {
                      setAcceptedHabeasData(true);
                      setShowPoliticaModal(false);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-xs"
                  >
                    Aceptar Política y Marcar Casilla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .pdf-document-section {
            page-break-before: always !important;
            break-before: page !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .pdf-document-section:first-child {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
