"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import { Mail, MessageSquare, Upload, CheckCircle2, AlertCircle, Clock, History, PenLine, Loader2 } from "lucide-react";

interface Note {
  id: string;
  date: string;
  user: string;
  text: string;
}

interface Cuota {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_cuota: number;
  monto_pagado: number;
  monto_interes_mora: number;
  estado: string;
}

interface ContractOption {
  id: string;
  tipo_contrato: string;
  inmuebleLabel: string;
  clienteNombre: string;
  clienteId: string | null;
}

const METODOS_PAGO = ["Transferencia", "Consignacion", "Efectivo"] as const;

export default function PortfolioPage() {
  const { activeCompany } = useCompany();
  const [showToast, setShowToast] = useState(false);

  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [loadingContracts, setLoadingContracts] = useState(true);

  const [planPagos, setPlanPagos] = useState<Cuota[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedCuotaId, setSelectedCuotaId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(METODOS_PAGO[0]);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  useEffect(() => {
    async function fetchCurrentUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    async function fetchContracts() {
      if (!activeCompany?.id) return;
      setLoadingContracts(true);
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from('contratos')
          .select(`
            id,
            tipo_contrato,
            inmuebles ( identificador ),
            contratantes_contrato ( cliente_id, clientes ( nombre_razon_social ) )
          `)
          .eq('empresa_id', activeCompany.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const options: ContractOption[] = (data || []).map((c: any) => ({
          id: c.id,
          tipo_contrato: c.tipo_contrato,
          inmuebleLabel: c.inmuebles?.identificador || "Inmueble N/A",
          clienteNombre: c.contratantes_contrato?.[0]?.clientes?.nombre_razon_social || "Sin asignar",
          clienteId: c.contratantes_contrato?.[0]?.cliente_id || null,
        }));

        setContracts(options);
        setSelectedContractId((prev) => (options.some((o) => o.id === prev) ? prev : (options[0]?.id || "")));
      } catch (error) {
        console.error("Error fetching contracts:", error);
        setContracts([]);
      } finally {
        setLoadingContracts(false);
      }
    }

    fetchContracts();
  }, [activeCompany?.id]);

  const fetchContractDetail = async (contractId: string) => {
    if (!contractId) {
      setPlanPagos([]);
      setNotes([]);
      return;
    }
    setLoadingDetail(true);
    const supabase = createClient();

    try {
      const [{ data: cuotas, error: cuotasError }, { data: bitacora, error: bitacoraError }] = await Promise.all([
        supabase
          .from('plan_pagos')
          .select('*')
          .eq('contrato_id', contractId)
          .order('numero_cuota', { ascending: true }),
        supabase
          .from('gestion_cartera')
          .select('id, fecha_contacto, bitacora_notas, perfiles ( nombre )')
          .eq('contrato_id', contractId)
          .order('fecha_contacto', { ascending: false }),
      ]);

      if (cuotasError) throw cuotasError;
      if (bitacoraError) throw bitacoraError;

      setPlanPagos((cuotas as any[]) || []);
      setNotes(
        ((bitacora as any[]) || []).map((n) => ({
          id: n.id,
          date: new Date(n.fecha_contacto).toLocaleString('es-CO'),
          user: n.perfiles?.nombre || "Sistema",
          text: n.bitacora_notas,
        }))
      );
    } catch (error) {
      console.error("Error fetching contract detail:", error);
      setPlanPagos([]);
      setNotes([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchContractDetail(selectedContractId);
    setSelectedCuotaId("");
  }, [selectedContractId]);

  const pendingCuotas = planPagos.filter((c) => c.estado !== 'Pagado');

  const handleEmailAlert = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleWhatsAppAlert = (cuota: Cuota) => {
    const amount = (cuota.monto_cuota - cuota.monto_pagado + cuota.monto_interes_mora).toLocaleString();
    const text = `🏢 *${activeCompany.name}* (NIT: ${activeCompany.nit})\n\nHola ${selectedContract?.clienteNombre || 'Cliente'}, te informamos que tu cuota *#${cuota.numero_cuota}* del proyecto *${activeCompany.project}* por valor de *$${amount}* se encuentra vencida.\n\nPor favor, reporta tu abono ingresando aquí: https://app.crgroup.com/pago`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/573000000000?text=${encoded}`, '_blank');
  };

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    const cuota = planPagos.find((c) => c.id === selectedCuotaId);
    const monto = Number(paymentAmount);

    if (!cuota || !monto || monto <= 0) {
      alert("Seleccione una cuota y un monto válido.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const { error: bitacoraError } = await (supabase.from('pagos_bitacora') as any).insert({
        plan_pagos_id: cuota.id,
        monto_pagado: monto,
        metodo_pago: paymentMethod,
        registrado_por: currentUserId,
      });
      if (bitacoraError) throw bitacoraError;

      const nuevoMontoPagado = Number(cuota.monto_pagado || 0) + monto;
      const update: Record<string, any> = { monto_pagado: nuevoMontoPagado };
      if (nuevoMontoPagado >= cuota.monto_cuota) {
        update.estado = 'Pagado';
      }

      const { error: cuotaError } = await (supabase.from('plan_pagos') as any)
        .update(update)
        .eq('id', cuota.id);
      if (cuotaError) throw cuotaError;

      if (selectedContract?.clienteId && currentUserId) {
        await (supabase.from('gestion_cartera') as any).insert({
          contrato_id: selectedContractId,
          cliente_id: selectedContract.clienteId,
          bitacora_notas: `Se registró un abono de $${monto.toLocaleString('es-CO')} vía ${paymentMethod} a la cuota #${cuota.numero_cuota}.`,
          registrado_por: currentUserId,
        });
      }

      setPaymentAmount("");
      setSelectedCuotaId("");
      await fetchContractDetail(selectedContractId);
    } catch (error: any) {
      console.error("Error registering abono:", error);
      alert("Hubo un error al registrar el abono: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedContractId || !currentUserId) return;

    const supabase = createClient();
    try {
      const { error } = await (supabase.from('gestion_cartera') as any).insert({
        contrato_id: selectedContractId,
        cliente_id: selectedContract?.clienteId || null,
        bitacora_notas: newNote,
        registrado_por: currentUserId,
      });
      if (error) throw error;

      setNewNote("");
      await fetchContractDetail(selectedContractId);
    } catch (error: any) {
      console.error("Error adding note:", error);
      alert("Hubo un error al guardar la nota: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-foreground text-background px-4 py-3 rounded-md shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium">Estado de cuenta enviado al correo del cliente.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Portafolio y Cartera</h1>
          <p className="text-muted-foreground mt-1">Gestión de recaudos y alertas de cobro.</p>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-72">
          <label className="text-xs font-medium text-muted-foreground">Contrato</label>
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            disabled={loadingContracts || contracts.length === 0}
            className="border border-border bg-background rounded-md px-3 py-2 text-sm"
          >
            {contracts.length === 0 && <option value="">Sin contratos para esta empresa</option>}
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clienteNombre} — {c.inmuebleLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedContractId ? (
        <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
          {loadingContracts ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <>
              <History className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-sm font-medium">No hay contratos registrados</h3>
              <p className="text-xs text-muted-foreground mt-1">Cree un contrato en la sección de Contratos para gestionar su cartera aquí.</p>
            </>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Main Column: Amortization Table */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-heading font-semibold">Plan de Pagos (Cliente: {selectedContract?.clienteNombre})</h3>
                <p className="text-sm text-muted-foreground">{selectedContract?.inmuebleLabel} | {activeCompany.project}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingDetail ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cuota</th>
                    <th className="px-4 py-3 font-semibold">Vencimiento</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor Cuota</th>
                    <th className="px-4 py-3 font-semibold text-right">Pagado</th>
                    <th className="px-4 py-3 font-semibold text-right">Mora</th>
                    <th className="px-4 py-3 font-semibold text-center">Estado</th>
                    <th className="px-4 py-3 font-semibold text-center">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {planPagos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Este contrato no tiene plan de pagos registrado.
                      </td>
                    </tr>
                  ) : planPagos.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 font-medium">#{row.numero_cuota}</td>
                      <td className="px-4 py-4">{new Date(row.fecha_vencimiento).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-4 text-right">${Number(row.monto_cuota).toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right">${Number(row.monto_pagado || 0).toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4 text-right text-destructive font-medium">${Number(row.monto_interes_mora || 0).toLocaleString('es-CO')}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            row.estado === 'Pagado' ? 'bg-emerald-500/10 text-emerald-500' :
                            row.estado === 'Vencido' ? 'bg-destructive/10 text-destructive' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {row.estado === 'Pagado' && <CheckCircle2 className="w-3 h-3" />}
                            {row.estado === 'Vencido' && <AlertCircle className="w-3 h-3" />}
                            {row.estado === 'Pendiente' && <Clock className="w-3 h-3" />}
                            {row.estado}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {row.estado === 'Vencido' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleWhatsAppAlert(row)} className="text-[#25D366] hover:bg-[#25D366]/10 p-1.5 rounded-md transition-colors" title="Enviar WhatsApp">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button onClick={handleEmailAlert} className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors" title="Enviar Correo">
                              <Mail className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs text-center block">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>

          {/* Bitácora Timeline (gestion_cartera) */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-heading font-semibold">Bitácora de Gestión de Cartera</h3>
            </div>

            <form onSubmit={handleAddNote} className="flex gap-3 mb-6 relative">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una nueva nota de seguimiento..."
                className="flex-1 border border-border bg-background rounded-md pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
              >
                <PenLine className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-4">
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin notas registradas para este contrato.</p>
              )}
              {notes.map((note, index) => (
                <div key={note.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors mt-1.5"></div>
                    {index !== notes.length - 1 && (
                      <div className="w-px h-full bg-border mt-2"></div>
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{note.user}</span>
                      <span className="text-[10px] text-muted-foreground">{note.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50">
                      {note.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar Column: Registrar Abono */}
        <div className="bg-card border border-border rounded-lg p-6 h-fit sticky top-24 flex flex-col gap-6 shadow-sm">
          <div>
            <h3 className="text-lg font-heading font-semibold">Registrar Abono</h3>
            <p className="text-sm text-muted-foreground mt-1">Aplicar pago a las cuotas pendientes.</p>
          </div>

          <form onSubmit={handleRegistrarAbono} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Cuota</label>
              <select
                required
                value={selectedCuotaId}
                onChange={(e) => setSelectedCuotaId(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccione una cuota...</option>
                {pendingCuotas.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.numero_cuota} — {new Date(c.fecha_vencimiento).toLocaleDateString('es-CO')} — Saldo: ${(Number(c.monto_cuota) - Number(c.monto_pagado || 0)).toLocaleString('es-CO')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Monto a abonar ($)</label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                placeholder="0"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m === 'Consignacion' ? 'Consignación' : m}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Soporte de Pago</label>
              <div className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  Click para subir comprobante<br/>(PDF, JPG, PNG)
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? "Aplicando..." : "Aplicar Abono"}
            </button>
          </form>
        </div>

      </div>
      )}
    </div>
  );
}
