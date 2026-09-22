"use client";

import React, { useRef, useState } from "react";
import { X, Download, Printer, FileText, Building2, User, Loader2, FileCheck, CheckCircle2 } from "lucide-react";
import { formatCOP, calcularDiasMora, calcularProgresoContrato, CuotaCartera } from "@/lib/cartera-utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PagoHistorial {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  numero_cuota?: number;
  soporte_url?: string | null;
  registrado_por?: string | null;
}

interface EstadoCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: {
    id: string;
    name: string;
    nit?: string;
    project?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  contract: {
    id: string;
    tipo_contrato: string;
    valor_total: number;
    tasa_interes_mora: number;
    inmuebleLabel: string;
    clienteNombre: string;
    clienteDocumento?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    fecha_inicio?: string;
    numero_factura?: string | null;
    fecha_factura?: string | null;
    numero_escritura?: string | null;
    fecha_escritura?: string | null;
    notaria_escritura?: string | null;
    estado_escrituracion?: string | null;
    observaciones_escrituracion?: string | null;
  } | null;
  planPagos: CuotaCartera[];
  pagosHistorial: PagoHistorial[];
}

export function EstadoCuentaModal({
  isOpen,
  onClose,
  activeCompany,
  contract,
  planPagos,
  pagosHistorial,
}: EstadoCuentaModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen || !contract) return null;

  const progreso = calcularProgresoContrato(planPagos, contract.valor_total);
  const fechaCorte = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Estado_Cuenta_${contract.clienteNombre.replace(/\s+/g, "_")}_${contract.inmuebleLabel.replace(/\s+/g, "_")}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Estado de Cuenta Inmobiliario</h2>
              <p className="text-xs text-muted-foreground">
                {contract.clienteNombre} • {contract.inmuebleLabel} • {activeCompany.project || activeCompany.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors text-foreground"
              title="Imprimir formato"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm transition-colors disabled:opacity-50"
              title="Descargar en PDF"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadingPdf ? "Generando..." : "Descargar PDF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-muted/20 flex-1">
          <div
            ref={printRef}
            id="estado-cuenta-printable"
            className="bg-card border border-border rounded-xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto text-card-foreground space-y-6 print:shadow-none print:border-none print:p-0"
          >
            {/* Header Document */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border pb-6 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" />
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {activeCompany.name}
                  </span>
                </div>
                {activeCompany.nit && (
                  <p className="text-xs text-muted-foreground">NIT: {activeCompany.nit}</p>
                )}
                <p className="text-xs text-muted-foreground">Proyecto: {activeCompany.project || "Desarrollo Inmobiliario"}</p>
                {activeCompany.address && (
                  <p className="text-xs text-muted-foreground">{activeCompany.address}</p>
                )}
                {activeCompany.phone && (
                  <p className="text-xs text-muted-foreground">Contacto: {activeCompany.phone} {activeCompany.email ? `• ${activeCompany.email}` : ''}</p>
                )}
              </div>

              <div className="sm:text-right space-y-1 bg-muted/40 p-3 sm:p-4 rounded-lg border border-border/50">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary mb-1">
                  Extracto Oficial
                </div>
                <div className="text-sm font-semibold text-foreground">ESTADO DE CUENTA</div>
                <div className="text-xs text-muted-foreground">
                  Fecha de Emisión: <span className="font-medium text-foreground">{fechaCorte}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tasa Mora: <span className="font-medium text-foreground">{contract.tasa_interes_mora || 2.5}% Mensual</span>
                </div>
              </div>
            </div>

            {/* Client & Contract Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  Información del Titular
                </div>
                <div className="text-sm font-bold text-foreground">{contract.clienteNombre}</div>
                {contract.clienteDocumento && (
                  <div className="text-xs text-muted-foreground">Documento: <span className="text-foreground font-medium">{contract.clienteDocumento}</span></div>
                )}
                {contract.clienteTelefono && (
                  <div className="text-xs text-muted-foreground">Teléfono: <span className="text-foreground font-medium">{contract.clienteTelefono}</span></div>
                )}
                {contract.clienteEmail && (
                  <div className="text-xs text-muted-foreground">Email: <span className="text-foreground font-medium">{contract.clienteEmail}</span></div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  Detalle del Inmueble y Negocio
                </div>
                <div className="text-sm font-bold text-foreground">{contract.inmuebleLabel}</div>
                <div className="text-xs text-muted-foreground">Tipo de Contrato: <span className="text-foreground font-medium">{contract.tipo_contrato}</span></div>
                {contract.fecha_inicio && (
                  <div className="text-xs text-muted-foreground">Fecha Contrato: <span className="text-foreground font-medium">{new Date(contract.fecha_inicio).toLocaleDateString('es-CO')}</span></div>
                )}
                <div className="text-xs text-muted-foreground">ID Referencia: <span className="text-foreground font-mono text-[11px]">{contract.id.slice(0, 8)}...</span></div>
              </div>
            </div>

            {/* Paz y Salvo Banner if 100% paid */}
            {progreso.porcentajePagado >= 100 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    PAZ Y SALVO FINANCIERO TOTAL:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    El inmueble se encuentra al día y con el 100% de los pagos amortizados.
                  </span>
                </div>
              </div>
            )}

            {/* Facturación y Notaría Section */}
            {(contract.numero_factura || contract.numero_escritura || contract.estado_escrituracion) && (
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    <FileCheck className="w-4 h-4 text-purple-600" />
                    Información de Facturación y Escrituración
                  </div>
                  {contract.estado_escrituracion && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-600 text-white">
                      {contract.estado_escrituracion}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                  {contract.numero_factura && (
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Factura de Venta:</span>
                      <span className="font-bold text-foreground">#{contract.numero_factura}</span>
                      {contract.fecha_factura && <span className="text-muted-foreground ml-1">({contract.fecha_factura})</span>}
                    </div>
                  )}
                  {contract.numero_escritura && (
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Escritura Pública:</span>
                      <span className="font-bold text-foreground">#{contract.numero_escritura}</span>
                      {contract.fecha_escritura && <span className="text-muted-foreground ml-1">({contract.fecha_escritura})</span>}
                    </div>
                  )}
                  {contract.notaria_escritura && (
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Notaría:</span>
                      <span className="font-medium text-foreground">{contract.notaria_escritura}</span>
                    </div>
                  )}
                  {contract.observaciones_escrituracion && (
                    <div className="sm:col-span-2 lg:col-span-4 text-[11px] bg-background/50 p-2 rounded border border-purple-500/10">
                      <span className="text-muted-foreground font-semibold">Observaciones: </span>
                      <span className="text-foreground">{contract.observaciones_escrituracion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Executive Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/40 border border-border p-3.5 rounded-lg space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Valor Total Contrato</div>
                <div className="text-base font-bold text-foreground">{formatCOP(progreso.baseTotal)}</div>
                <div className="text-[10px] text-muted-foreground">Precio pactado</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-lg space-y-1">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Capital Pagado</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(progreso.totalCapitalPagado)}</div>
                <div className="text-[10px] text-emerald-600/80 font-medium">{progreso.porcentajePagado}% completado</div>
              </div>

              <div className="bg-muted/40 border border-border p-3.5 rounded-lg space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Saldo Pendiente Capital</div>
                <div className="text-base font-bold text-foreground">{formatCOP(progreso.saldoCapitalTotal)}</div>
                <div className="text-[10px] text-muted-foreground">Por amortizar</div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-lg space-y-1">
                <div className="text-[11px] text-destructive font-medium">Total Exigible Hoy</div>
                <div className="text-base font-bold text-destructive">{formatCOP(progreso.totalExigibleHoy)}</div>
                <div className="text-[10px] text-destructive font-medium">
                  {progreso.cuotasVencidas} cuota(s) + {formatCOP(progreso.totalMoraAcumulada)} mora
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-border">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Avance Financiero de la Obligación</span>
                <span className="font-bold text-primary">{progreso.porcentajePagado}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all" 
                  style={{ width: `${progreso.porcentajePagado}%` }} 
                  title={`Pagado: ${progreso.porcentajePagado}%`}
                />
                <div 
                  className="bg-destructive h-full transition-all" 
                  style={{ width: `${progreso.porcentajeVencido}%` }} 
                  title={`Vencido: ${progreso.porcentajeVencido}%`}
                />
                <div 
                  className="bg-muted-foreground/30 h-full transition-all" 
                  style={{ width: `${progreso.porcentajePorVencer}%` }} 
                  title={`Por Vencer: ${progreso.porcentajePorVencer}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Pagado ({progreso.cuotasPagadas} cuotas)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-destructive inline-block"></span>
                  <span>Vencido ({progreso.cuotasVencidas} cuotas)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block"></span>
                  <span>Por Vencer ({progreso.cuotasPendientes} cuotas)</span>
                </div>
              </div>
            </div>

            {/* Amortization Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between">
                <span>Plan de Pagos y Amortización</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Total {planPagos.length} cuotas programadas
                </span>
              </h3>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Vencimiento</th>
                      <th className="px-3 py-2.5 text-right">Valor Cuota</th>
                      <th className="px-3 py-2.5 text-right">Pagado</th>
                      <th className="px-3 py-2.5 text-right">Saldo Capital</th>
                      <th className="px-3 py-2.5 text-center">Días Mora</th>
                      <th className="px-3 py-2.5 text-right">Int. Mora</th>
                      <th className="px-3 py-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {planPagos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          Sin cuotas registradas para este contrato.
                        </td>
                      </tr>
                    ) : (
                      planPagos.map((cuota) => {
                        const saldo = Math.max(0, Number(cuota.monto_cuota) - Number(cuota.monto_pagado || 0));
                        const dias = saldo > 0 && cuota.estado !== 'Pagado' ? calcularDiasMora(cuota.fecha_vencimiento) : 0;
                        const esVencido = cuota.estado === 'Vencido' || (dias > 0 && cuota.estado !== 'Pagado');

                        return (
                          <tr 
                            key={cuota.id} 
                            className={`hover:bg-muted/30 transition-colors ${
                              esVencido ? "bg-destructive/5" : cuota.estado === 'Pagado' ? "bg-emerald-500/5" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-medium">#{cuota.numero_cuota}</td>
                            <td className="px-3 py-2">
                              {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-CO")}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCOP(cuota.monto_cuota)}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatCOP(cuota.monto_pagado || 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCOP(saldo)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {dias > 0 ? (
                                <span className="font-bold text-destructive">{dias} d</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-destructive">
                              {Number(cuota.monto_interes_mora || 0) > 0 ? formatCOP(cuota.monto_interes_mora) : "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  cuota.estado === "Pagado"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : esVencido
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {cuota.estado === "Pagado" ? "Pagado" : esVencido ? "Vencido" : "Pendiente"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {planPagos.length > 0 && (
                    <tfoot className="bg-muted/50 font-bold border-t border-border">
                      <tr>
                        <td colSpan={2} className="px-3 py-2.5 text-foreground">TOTALES</td>
                        <td className="px-3 py-2.5 text-right">{formatCOP(progreso.baseTotal)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{formatCOP(progreso.totalCapitalPagado)}</td>
                        <td className="px-3 py-2.5 text-right">{formatCOP(progreso.saldoCapitalTotal)}</td>
                        <td className="px-3 py-2.5 text-center">-</td>
                        <td className="px-3 py-2.5 text-right text-destructive">{formatCOP(progreso.totalMoraAcumulada)}</td>
                        <td className="px-3 py-2.5 text-center">-</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Payments History */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Historial de Abonos y Pagos Registrados
              </h3>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Concepto / Cuota</th>
                      <th className="px-3 py-2">Método</th>
                      <th className="px-3 py-2 text-right">Monto Pagado</th>
                      <th className="px-3 py-2 text-center">Soporte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagosHistorial.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                          No se registran abonos en la bitácora aún.
                        </td>
                      </tr>
                    ) : (
                      pagosHistorial.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2">
                            {new Date(p.fecha_pago).toLocaleDateString("es-CO")}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {p.numero_cuota ? `Cuota #${p.numero_cuota}` : "Abono a contrato"}
                          </td>
                          <td className="px-3 py-2">{p.metodo_pago}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCOP(p.monto_pagado)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.soporte_url ? (
                              <a
                                href={p.soporte_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium text-[11px]"
                              >
                                Ver Soporte
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legal Footer Note */}
            <div className="text-[10px] text-muted-foreground border-t border-border pt-4 text-center leading-relaxed">
              Este extracto es un documento de control informativo emitido por {activeCompany.name}. Las cuotas en mora generan intereses moratorios a la tasa contractual pactada hasta la fecha efectiva de pago. Para aclaraciones o acuerdos comerciales, comuníquese con el departamento administrativo.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
