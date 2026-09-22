"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  PenLine,
  Loader2,
  FileText,
  Calculator,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Check,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Receipt,
  FileCheck,
  Landmark,
  Edit3,
} from "lucide-react";
import {
  calcularProgresoContrato,
  calcularInteresMoraCuota,
  calcularDiasMora,
  formatCOP,
  CuotaCartera,
} from "@/lib/cartera-utils";
import { CarteraMetrics } from "@/components/cartera-metrics";
import { EstadoCuentaModal, PagoHistorial } from "@/components/estado-cuenta-modal";
import { ImportCarteraModal } from "@/components/import-cartera-modal";

interface Note {
  id: string;
  date: string;
  user: string;
  text: string;
}

export type MoraCategory =
  | "todos"
  | "pagos_septiembre"
  | "pagado_facturacion"
  | "al_dia"
  | "mora_1_10"
  | "mora_11_30"
  | "mora_31_45"
  | "mora_46_60"
  | "mora_61_90"
  | "mora_mas_90";

export interface SeptemberReceiptItem {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  soporte_url: string | null;
  loteLabel: string;
  clienteNombre: string;
  clienteDocumento: string;
  numeroCuota: number;
  montoCuota: number;
  contratoId: string;
}

interface ContractOption {
  id: string;
  tipo_contrato: string;
  valor_total: number;
  tasa_interes_mora: number;
  fecha_inicio?: string;
  inmuebleLabel: string;
  clienteNombre: string;
  clienteId: string | null;
  clienteDocumento?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  totalPagado: number;
  saldoPendiente: number;
  saldoVencido: number;
  maxDiasMora: number;
  moraCategory: MoraCategory;
  cuotasList: CuotaCartera[];
  numero_factura?: string | null;
  fecha_factura?: string | null;
  numero_escritura?: string | null;
  fecha_escritura?: string | null;
  notaria_escritura?: string | null;
  estado_escrituracion?: string | null;
  observaciones_escrituracion?: string | null;
  hasSeptemberPayment?: boolean;
  septemberPaidTotal?: number;
  septemberRecibosCount?: number;
}

const METODOS_PAGO = ["Transferencia", "Consignacion", "Efectivo"] as const;

export default function PortfolioPage() {
  const { activeCompany } = useCompany();

  // Toast system
  const [toast, setToast] = useState<{
    show: boolean;
    text: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    text: "",
    type: "success",
  });

  const triggerToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEstadoCuentaOpen, setIsEstadoCuentaOpen] = useState(false);
  const [isSeptemberModalOpen, setIsSeptemberModalOpen] = useState(false);
  const [septemberReceipts, setSeptemberReceipts] = useState<SeptemberReceiptItem[]>([]);
  
  // Facturación y Escrituración Modal state
  const [isEscrituracionModalOpen, setIsEscrituracionModalOpen] = useState(false);
  const [escrituracionContract, setEscrituracionContract] = useState<ContractOption | null>(null);
  const [escrituracionForm, setEscrituracionForm] = useState({
    numero_factura: "",
    fecha_factura: "",
    numero_escritura: "",
    fecha_escritura: "",
    notaria_escritura: "",
    estado_escrituracion: "Pendiente Facturación",
    observaciones_escrituracion: "",
  });
  const [savingEscrituracion, setSavingEscrituracion] = useState(false);

  // Contracts state
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Aging Filter & Search state
  const [selectedMoraTab, setSelectedMoraTab] = useState<MoraCategory>("todos");
  const [contractSearchTerm, setContractSearchTerm] = useState("");
  const [contractsPage, setContractsPage] = useState(1);
  const contractsPerPage = 10;

  // Contract details state
  const [planPagos, setPlanPagos] = useState<CuotaCartera[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pagosHistorial, setPagosHistorial] = useState<PagoHistorial[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [calculatingMora, setCalculatingMora] = useState(false);

  // Form registrar abono
  const [selectedCuotaId, setSelectedCuotaId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(METODOS_PAGO[0]);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const selectedContract = contracts.find((c) => c.id === selectedContractId) || null;

  useEffect(() => {
    async function fetchCurrentUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    fetchCurrentUser();
  }, []);

  // Fetch contracts for active company with cuotas to compute aging
  useEffect(() => {
    async function fetchContracts() {
      if (!activeCompany?.id) return;
      setLoadingContracts(true);
      const supabase = createClient();

      try {
        const [contratosRes, septPagosRes] = await Promise.all([
          supabase
            .from("contratos")
            .select(`
              id,
              tipo_contrato,
              valor_total,
              tasa_interes_mora,
              fecha_inicio,
              numero_factura,
              fecha_factura,
              numero_escritura,
              fecha_escritura,
              notaria_escritura,
              estado_escrituracion,
              observaciones_escrituracion,
              inmuebles ( identificador ),
              contratantes_contrato (
                cliente_id,
                clientes (
                  nombre_razon_social,
                  documento,
                  telefono,
                  correo
                )
              ),
              plan_pagos (
                id,
                numero_cuota,
                fecha_vencimiento,
                monto_cuota,
                monto_pagado,
                monto_interes_mora,
                estado,
                tipo_cuota
              )
            `)
            .eq("empresa_id", activeCompany.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("pagos_bitacora")
            .select(`
              id,
              fecha_pago,
              monto_pagado,
              metodo_pago,
              soporte_url,
              plan_pagos!inner (
                id,
                numero_cuota,
                monto_cuota,
                contrato_id
              )
            `)
            .gte("fecha_pago", "2026-09-01T00:00:00.000Z")
            .lt("fecha_pago", "2026-10-01T00:00:00.000Z")
        ]);

        if (contratosRes.error) throw contratosRes.error;

        const septContractMap: Record<string, { total: number; count: number }> = {};
        const septReceiptsList: SeptemberReceiptItem[] = [];

        // Pre-index contracts for fast lookup
        const contractInfoMap: Record<string, { lote: string; cliente: string; doc: string }> = {};
        (contratosRes.data || []).forEach((c: any) => {
          const contratante = c.contratantes_contrato?.[0];
          const cliente = contratante?.clientes;
          contractInfoMap[c.id] = {
            lote: c.inmuebles?.identificador || "Inmueble N/A",
            cliente: cliente?.nombre_razon_social || "Sin asignar",
            doc: cliente?.documento || "",
          };
        });

        (septPagosRes.data || []).forEach((p: any) => {
          const cid = p.plan_pagos?.contrato_id;
          if (cid) {
            const val = Number(p.monto_pagado) || 0;
            if (!septContractMap[cid]) {
              septContractMap[cid] = { total: 0, count: 0 };
            }
            septContractMap[cid].total += val;
            septContractMap[cid].count += 1;

            const info = contractInfoMap[cid] || { lote: "Lote", cliente: "Cliente", doc: "" };
            septReceiptsList.push({
              id: p.id,
              fecha_pago: p.fecha_pago,
              monto_pagado: val,
              metodo_pago: p.metodo_pago || "Transferencia",
              soporte_url: p.soporte_url,
              loteLabel: info.lote,
              clienteNombre: info.cliente,
              clienteDocumento: info.doc,
              numeroCuota: p.plan_pagos?.numero_cuota || 0,
              montoCuota: Number(p.plan_pagos?.monto_cuota) || 0,
              contratoId: cid,
            });
          }
        });

        septReceiptsList.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
        setSeptemberReceipts(septReceiptsList);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const options: ContractOption[] = (contratosRes.data || []).map((c: any) => {
          const contratante = c.contratantes_contrato?.[0];
          const cliente = contratante?.clientes;
          const valorTotal = Number(c.valor_total) || 0;

          const rawCuotas: CuotaCartera[] = (c.plan_pagos || []).map((cp: any) => ({
            id: cp.id,
            numero_cuota: cp.numero_cuota,
            fecha_vencimiento: cp.fecha_vencimiento,
            monto_cuota: Number(cp.monto_cuota) || 0,
            monto_pagado: Number(cp.monto_pagado) || 0,
            monto_interes_mora: Number(cp.monto_interes_mora) || 0,
            estado: cp.estado,
            tipo_cuota: cp.tipo_cuota,
          })).sort((a: any, b: any) => a.numero_cuota - b.numero_cuota);

          const totalPagado = rawCuotas.reduce((sum: number, q: any) => sum + (q.monto_pagado || 0), 0);
          const saldoPendiente = Math.max(0, valorTotal - totalPagado);

          let maxDiasMora = 0;
          let saldoVencido = 0;

          rawCuotas.forEach((q) => {
            const saldoCuota = Math.max(0, (q.monto_cuota || 0) - (q.monto_pagado || 0));
            if (saldoCuota > 0) {
              const venc = new Date(q.fecha_vencimiento);
              venc.setHours(0, 0, 0, 0);
              const diffTime = hoy.getTime() - venc.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0) {
                saldoVencido += saldoCuota;
                if (diffDays > maxDiasMora) {
                  maxDiasMora = diffDays;
                }
              }
            }
          });

          let moraCategory: MoraCategory = "al_dia";
          const isFullyPaid = (valorTotal > 0 && totalPagado >= valorTotal - 1.0) ||
            (rawCuotas.length > 0 && rawCuotas.every((q) => (q.monto_pagado || 0) >= (q.monto_cuota || 0) - 1.0));

          if (isFullyPaid) {
            moraCategory = "pagado_facturacion";
          } else if (maxDiasMora === 0) {
            moraCategory = "al_dia";
          } else if (maxDiasMora <= 10) {
            moraCategory = "mora_1_10";
          } else if (maxDiasMora <= 30) {
            moraCategory = "mora_11_30";
          } else if (maxDiasMora <= 45) {
            moraCategory = "mora_31_45";
          } else if (maxDiasMora <= 60) {
            moraCategory = "mora_46_60";
          } else if (maxDiasMora <= 90) {
            moraCategory = "mora_61_90";
          } else {
            moraCategory = "mora_mas_90";
          }

          const septInfo = septContractMap[c.id];

          return {
            id: c.id,
            tipo_contrato: c.tipo_contrato,
            valor_total: valorTotal,
            tasa_interes_mora: Number(c.tasa_interes_mora) || 2.5,
            fecha_inicio: c.fecha_inicio,
            inmuebleLabel: c.inmuebles?.identificador || "Inmueble N/A",
            clienteNombre: cliente?.nombre_razon_social || "Sin asignar",
            clienteId: contratante?.cliente_id || null,
            clienteDocumento: cliente?.documento || "",
            clienteTelefono: cliente?.telefono || "",
            clienteEmail: cliente?.correo || "",
            totalPagado,
            saldoPendiente,
            saldoVencido,
            maxDiasMora,
            moraCategory,
            cuotasList: rawCuotas,
            numero_factura: c.numero_factura,
            fecha_factura: c.fecha_factura,
            numero_escritura: c.numero_escritura,
            fecha_escritura: c.fecha_escritura,
            notaria_escritura: c.notaria_escritura,
            estado_escrituracion: c.estado_escrituracion || (isFullyPaid ? "Pendiente Facturación" : null),
            observaciones_escrituracion: c.observaciones_escrituracion,
            hasSeptemberPayment: !!septInfo,
            septemberPaidTotal: septInfo?.total || 0,
            septemberRecibosCount: septInfo?.count || 0,
          };
        });

        // Natural sort by inmueble identifier
        options.sort((a, b) => 
          a.inmuebleLabel.localeCompare(b.inmuebleLabel, undefined, { numeric: true, sensitivity: 'base' })
        );

        setContracts(options);
        setSelectedContractId((prev) =>
          options.some((o) => o.id === prev) ? prev : options[0]?.id || ""
        );
      } catch (error) {
        console.error("Error fetching contracts:", error);
        setContracts([]);
      } finally {
        setLoadingContracts(false);
      }
    }

    fetchContracts();
  }, [activeCompany?.id]);

  // Fetch detail for selected contract
  const fetchContractDetail = async (contractId: string) => {
    if (!contractId) {
      setPlanPagos([]);
      setNotes([]);
      setPagosHistorial([]);
      return;
    }
    setLoadingDetail(true);
    const supabase = createClient();

    try {
      const [{ data: cuotas, error: cuotasError }, { data: bitacora, error: bitacoraError }] =
        await Promise.all([
          supabase
            .from("plan_pagos")
            .select("*")
            .eq("contrato_id", contractId)
            .order("numero_cuota", { ascending: true }),
          supabase
            .from("gestion_cartera")
            .select("id, fecha_contacto, bitacora_notas, perfiles ( nombre )")
            .eq("contrato_id", contractId)
            .order("fecha_contacto", { ascending: false }),
        ]);

      if (cuotasError) throw cuotasError;
      if (bitacoraError) throw bitacoraError;

      const cuotasList = (cuotas as any[]) || [];
      setPlanPagos(cuotasList);
      setNotes(
        ((bitacora as any[]) || []).map((n) => ({
          id: n.id,
          date: new Date(n.fecha_contacto).toLocaleString("es-CO"),
          user: n.perfiles?.nombre || "Sistema",
          text: n.bitacora_notas,
        }))
      );

      // Fetch payment receipt history
      const cuotaIds = cuotasList.map((c) => c.id);
      if (cuotaIds.length > 0) {
        const { data: pagos } = await supabase
          .from("pagos_bitacora")
          .select("id, fecha_pago, monto_pagado, metodo_pago, soporte_url, plan_pagos_id, plan_pagos(numero_cuota)")
          .in("plan_pagos_id", cuotaIds)
          .order("fecha_pago", { ascending: false });

        setPagosHistorial(
          ((pagos as any[]) || []).map((p: any) => ({
            id: p.id,
            fecha_pago: p.fecha_pago,
            monto_pagado: p.monto_pagado,
            metodo_pago: p.metodo_pago,
            numero_cuota: p.plan_pagos?.numero_cuota,
            soporte_url: p.soporte_url,
          }))
        );
      } else {
        setPagosHistorial([]);
      }
    } catch (error) {
      console.error("Error fetching contract detail:", error);
      setPlanPagos([]);
      setNotes([]);
      setPagosHistorial([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchContractDetail(selectedContractId);
    setSelectedCuotaId("");
  }, [selectedContractId]);

  const pendingCuotas = planPagos.filter((c) => c.estado !== "Pagado");
  const contractProgress = calcularProgresoContrato(planPagos, selectedContract?.valor_total || 0);

  // Liquidate mora interest
  const handleLiquidarMora = async () => {
    if (!selectedContractId || planPagos.length === 0) return;
    setCalculatingMora(true);
    const supabase = createClient();

    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const tasa = selectedContract?.tasa_interes_mora || 2.5;

      let cuotasActualizadas = 0;
      let totalMoraGenerada = 0;

      for (const cuota of planPagos) {
        const saldo = Math.max(0, Number(cuota.monto_cuota) - Number(cuota.monto_pagado || 0));
        const venc = new Date(cuota.fecha_vencimiento);
        venc.setHours(0, 0, 0, 0);

        if (saldo > 0 && venc < hoy && cuota.estado !== "Pagado") {
          const moraCalculada = calcularInteresMoraCuota(
            cuota.monto_cuota,
            cuota.monto_pagado || 0,
            tasa,
            cuota.fecha_vencimiento
          );

          if (moraCalculada !== Number(cuota.monto_interes_mora || 0) || cuota.estado !== "Vencido") {
            await (supabase.from("plan_pagos") as any)
              .update({
                monto_interes_mora: moraCalculada,
                estado: "Vencido",
              })
              .eq("id", cuota.id);

            cuotasActualizadas++;
            totalMoraGenerada += moraCalculada;
          }
        }
      }

      if (cuotasActualizadas > 0) {
        if (selectedContract?.clienteId && currentUserId) {
          await (supabase.from("gestion_cartera") as any).insert({
            contrato_id: selectedContractId,
            cliente_id: selectedContract.clienteId,
            bitacora_notas: `Se ejecutó liquidación de mora para ${cuotasActualizadas} cuota(s) vencida(s) a la tasa del ${tasa}% mensual. Mora acumulada total: ${formatCOP(totalMoraGenerada)}.`,
            registrado_por: currentUserId,
          });
        }

        triggerToast(`Intereses de mora liquidados exitosamente en ${cuotasActualizadas} cuota(s).`, "success");
        await fetchContractDetail(selectedContractId);
      } else {
        triggerToast("No se encontraron cuotas vencidas pendientes de liquidar mora.", "info");
      }
    } catch (error: any) {
      console.error("Error liquidating mora:", error);
      triggerToast("Error al liquidar intereses: " + error.message, "error");
    } finally {
      setCalculatingMora(false);
    }
  };

  // Handle Abono registration
  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    const cuota = planPagos.find((c) => c.id === selectedCuotaId);
    const monto = Number(paymentAmount);

    if (!cuota || !monto || monto <= 0) {
      triggerToast("Seleccione una cuota y un monto válido a abonar.", "error");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      let soporteUrl: string | null = null;

      // Subir archivo de soporte si se seleccionó
      if (supportFile) {
        try {
          const fileExt = supportFile.name.split(".").pop();
          const cleanName = supportFile.name.replace(/[^a-zA-Z0-9]/g, "_");
          const fileName = `soporte_${cuota.id}_${Date.now()}_${cleanName}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("comprobantes_pago")
            .upload(fileName, supportFile);

          if (!uploadError && uploadData) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("comprobantes_pago").getPublicUrl(fileName);
            soporteUrl = publicUrl;
          } else {
            console.warn("Notice on storage upload:", uploadError?.message);
          }
        } catch (storageErr) {
          console.warn("Storage upload exception:", storageErr);
        }
      }

      // 1. Registrar en pagos_bitacora
      const { error: bitacoraError } = await (supabase.from("pagos_bitacora") as any).insert({
        plan_pagos_id: cuota.id,
        monto_pagado: monto,
        metodo_pago: paymentMethod,
        soporte_url: soporteUrl,
        registrado_por: currentUserId,
      });
      if (bitacoraError) throw bitacoraError;

      // 2. Actualizar plan_pagos
      const nuevoMontoPagado = Number(cuota.monto_pagado || 0) + monto;
      const update: Record<string, any> = { monto_pagado: nuevoMontoPagado };
      if (nuevoMontoPagado >= cuota.monto_cuota) {
        update.estado = "Pagado";
        update.monto_interes_mora = 0; // Se extingue mora al pagar totalmente la cuota
      }

      const { error: cuotaError } = await (supabase.from("plan_pagos") as any)
        .update(update)
        .eq("id", cuota.id);
      if (cuotaError) throw cuotaError;

      // 3. Registrar nota en gestión de cartera
      if (selectedContract?.clienteId) {
        await (supabase.from("gestion_cartera") as any).insert({
          contrato_id: selectedContractId,
          cliente_id: selectedContract.clienteId,
          bitacora_notas: `Se registró un abono de ${formatCOP(monto)} vía ${paymentMethod} a la cuota #${cuota.numero_cuota}.${soporteUrl ? " Con soporte adjunto." : ""}`,
          registrado_por: currentUserId || "ff5ca351-4cc1-41f5-9b8a-2282c972e3f7",
        });
      }

      setPaymentAmount("");
      setSelectedCuotaId("");
      setSupportFile(null);
      triggerToast(`Abono de ${formatCOP(monto)} aplicado correctamente a la cuota #${cuota.numero_cuota}.`, "success");
      await fetchContractDetail(selectedContractId);
    } catch (error: any) {
      console.error("Error registering abono:", error);
      triggerToast("Error al registrar el abono: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Add Note to Bitácora
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedContractId) return;

    const supabase = createClient();
    try {
      const { error } = await (supabase.from("gestion_cartera") as any).insert({
        contrato_id: selectedContractId,
        cliente_id: selectedContract?.clienteId || null,
        bitacora_notas: newNote.trim(),
        registrado_por: currentUserId || "ff5ca351-4cc1-41f5-9b8a-2282c972e3f7",
      });
      if (error) throw error;

      setNewNote("");
      triggerToast("Nota de seguimiento registrada en la bitácora.", "success");
      await fetchContractDetail(selectedContractId);
    } catch (error: any) {
      console.error("Error adding note:", error);
      triggerToast("Hubo un error al guardar la nota: " + error.message, "error");
    }
  };

  // Open Estado de Cuenta directly for a contract
  const handleOpenEstadoCuenta = async (c: ContractOption) => {
    setSelectedContractId(c.id);
    if (c.cuotasList && c.cuotasList.length > 0) {
      setPlanPagos(c.cuotasList);
    }
    await fetchContractDetail(c.id);
    setIsEstadoCuentaOpen(true);
  };

  // Open Escrituracion / Facturacion Modal
  const handleOpenEscrituracionModal = (c: ContractOption) => {
    setEscrituracionContract(c);
    setEscrituracionForm({
      numero_factura: c.numero_factura || "",
      fecha_factura: c.fecha_factura || "",
      numero_escritura: c.numero_escritura || "",
      fecha_escritura: c.fecha_escritura || "",
      notaria_escritura: c.notaria_escritura || "",
      estado_escrituracion: c.estado_escrituracion || "Pendiente Facturación",
      observaciones_escrituracion: c.observaciones_escrituracion || "",
    });
    setIsEscrituracionModalOpen(true);
  };

  const handleSaveEscrituracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escrituracionContract) return;
    setSavingEscrituracion(true);
    const supabase = createClient();

    try {
      const updateData = {
        numero_factura: escrituracionForm.numero_factura.trim() || null,
        fecha_factura: escrituracionForm.fecha_factura || null,
        numero_escritura: escrituracionForm.numero_escritura.trim() || null,
        fecha_escritura: escrituracionForm.fecha_escritura || null,
        notaria_escritura: escrituracionForm.notaria_escritura.trim() || null,
        estado_escrituracion: escrituracionForm.estado_escrituracion || "Pendiente Facturación",
        observaciones_escrituracion: escrituracionForm.observaciones_escrituracion.trim() || null,
      };

      const { error } = await (supabase.from("contratos") as any)
        .update(updateData)
        .eq("id", escrituracionContract.id);

      if (error) throw error;

      setContracts((prev) =>
        prev.map((item) =>
          item.id === escrituracionContract.id
            ? { ...item, ...updateData }
            : item
        )
      );

      triggerToast("Datos de escrituración y facturación actualizados exitosamente.", "success");
      setIsEscrituracionModalOpen(false);
    } catch (error: any) {
      console.error("Error guardando datos de escrituración:", error);
      triggerToast("Error al guardar escrituración: " + error.message, "error");
    } finally {
      setSavingEscrituracion(false);
    }
  };

  // Filtered contracts
  const filteredContracts = contracts.filter((c) => {
    const term = contractSearchTerm.toLowerCase().trim();
    if (term) {
      const matches =
        c.inmuebleLabel.toLowerCase().includes(term) ||
        c.clienteNombre.toLowerCase().includes(term) ||
        (c.clienteDocumento && c.clienteDocumento.toLowerCase().includes(term));
      if (!matches) return false;
    }

    if (selectedMoraTab === "todos") return true;
    if (selectedMoraTab === "pagos_septiembre") return c.hasSeptemberPayment === true;
    return c.moraCategory === selectedMoraTab;
  });

  const categoryCounts = {
    todos: contracts.length,
    pagos_septiembre: contracts.filter((c) => c.hasSeptemberPayment).length,
    pagado_facturacion: contracts.filter((c) => c.moraCategory === "pagado_facturacion").length,
    al_dia: contracts.filter((c) => c.moraCategory === "al_dia").length,
    mora_1_10: contracts.filter((c) => c.moraCategory === "mora_1_10").length,
    mora_11_30: contracts.filter((c) => c.moraCategory === "mora_11_30").length,
    mora_31_45: contracts.filter((c) => c.moraCategory === "mora_31_45").length,
    mora_46_60: contracts.filter((c) => c.moraCategory === "mora_46_60").length,
    mora_61_90: contracts.filter((c) => c.moraCategory === "mora_61_90").length,
    mora_mas_90: contracts.filter((c) => c.moraCategory === "mora_mas_90").length,
  };

  const totalContractPages = Math.ceil(filteredContracts.length / contractsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (contractsPage - 1) * contractsPerPage,
    contractsPage * contractsPerPage
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto relative pb-12">
      
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-top-2 border ${
            toast.type === "success"
              ? "bg-foreground text-background border-emerald-500"
              : toast.type === "error"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-foreground text-background border-primary"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-amber-300" />}
          {toast.type === "info" && <AlertCircle className="w-5 h-5 text-primary" />}
          <span className="text-sm font-medium">{toast.text}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Portafolio y Cartera</h1>
          <p className="text-muted-foreground mt-1">
            Control de amortizaciones, estados de cuenta, liquidación de mora y metas de recaudo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Excel</span>
          </button>
        </div>
      </div>

      {/* 1. Monthly Collection Targets & Global Metrics Dashboard */}
      <CarteraMetrics
        key={activeCompany.id}
        onViewSeptemberReceipts={() => setIsSeptemberModalOpen(true)}
      />

      {/* 2. Cartera Aging & Billing Segmentation Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span>Segmentación de Cartera & Edades de Mora</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtre los contratos por días de mora o identifique lotes pagados listos para facturación y paz y salvo.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por lote, cliente o CC..."
              value={contractSearchTerm}
              onChange={(e) => {
                setContractSearchTerm(e.target.value);
                setContractsPage(1);
              }}
              className="pl-9 pr-4 py-1.5 border border-border bg-background rounded-lg text-xs font-medium w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Filter Pills / Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            onClick={() => { setSelectedMoraTab("todos"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "todos"
                ? "bg-foreground text-background shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Todos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-bold">
              {categoryCounts.todos}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("pagos_septiembre"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "pagos_septiembre"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            <span>Pagos Septiembre 2026</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-700/20 font-bold">
              {categoryCounts.pagos_septiembre}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("pagado_facturacion"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "pagado_facturacion"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Pagados (Pend. Facturación)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-700/20 font-bold">
              {categoryCounts.pagado_facturacion}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("al_dia"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "al_dia"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Al Día (0 d)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700/20 font-bold">
              {categoryCounts.al_dia}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_1_10"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_1_10"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Mora 1 - 10 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-700/20 font-bold">
              {categoryCounts.mora_1_10}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_11_30"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_11_30"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-600/10 text-amber-800 dark:text-amber-300 hover:bg-amber-600/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Mora 11 - 30 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-800/20 font-bold">
              {categoryCounts.mora_11_30}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_31_45"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_31_45"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>Mora 31 - 45 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-700/20 font-bold">
              {categoryCounts.mora_31_45}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_46_60"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_46_60"
                ? "bg-orange-700 text-white shadow-xs"
                : "bg-orange-600/10 text-orange-800 dark:text-orange-300 hover:bg-orange-600/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            <span>Mora 46 - 60 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-800/20 font-bold">
              {categoryCounts.mora_46_60}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_61_90"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_61_90"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>Mora 61 - 90 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-700/20 font-bold">
              {categoryCounts.mora_61_90}
            </span>
          </button>

          <button
            onClick={() => { setSelectedMoraTab("mora_mas_90"); setContractsPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedMoraTab === "mora_mas_90"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Mora &gt; 90 d</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-800/20 font-bold">
              {categoryCounts.mora_mas_90}
            </span>
          </button>
        </div>

        {/* September Collection Banner if tab active */}
        {selectedMoraTab === "pagos_septiembre" && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  Recaudos Registrados en Septiembre 2026 ({septemberReceipts.length} recibos en {categoryCounts.pagos_septiembre} lotes)
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Total recaudado durante este mes: <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">$79.383.330 COP</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSeptemberModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs self-start sm:self-auto"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver desglose de {septemberReceipts.length} recibos</span>
            </button>
          </div>
        )}

        {/* Interactive Filtered Contracts Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          {loadingContracts ? (
            <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Cargando contratos y analizando cartera...</span>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No se encontraron contratos para este filtro o término de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-3">Cliente / Documento</th>
                    <th className="py-2.5 px-3">Valor / Recaudo</th>
                    <th className="py-2.5 px-3 text-right">Saldo en Mora</th>
                    <th className="py-2.5 px-3 text-center">Estado / Días Mora</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedContracts.map((c) => {
                    const isSelected = c.id === selectedContractId;
                    const pct = c.valor_total > 0 ? Math.min(100, (c.totalPagado / c.valor_total) * 100) : 0;

                    let moraBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Al día (0 d)
                      </span>
                    );

                    if (c.moraCategory === "pagado_facturacion") {
                      moraBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                          100% Pagado (Pend. Fact.)
                        </span>
                      );
                    } else if (c.maxDiasMora > 90) {
                      moraBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400">
                          {c.maxDiasMora} d mora (&gt;90d)
                        </span>
                      );
                    } else if (c.maxDiasMora > 60) {
                      moraBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
                          {c.maxDiasMora} d mora (61-90d)
                        </span>
                      );
                    } else if (c.maxDiasMora > 30) {
                      moraBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400">
                          {c.maxDiasMora} d mora ({c.maxDiasMora <= 45 ? "31-45d" : "46-60d"})
                        </span>
                      );
                    } else if (c.maxDiasMora > 0) {
                      moraBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {c.maxDiasMora} d mora
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContractId(c.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 font-medium"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-foreground">{c.inmuebleLabel}</div>
                          {c.hasSeptemberPayment && (
                            <div className="mt-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                              <Receipt className="w-3 h-3" />
                              <span>Sep: {formatCOP(c.septemberPaidTotal || 0)} ({c.septemberRecibosCount} rec.)</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground truncate max-w-[180px]">{c.clienteNombre}</p>
                          <p className="text-[10px] text-muted-foreground">CC: {c.clienteDocumento || "N/A"}</p>
                        </td>
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-foreground font-semibold">{formatCOP(c.totalPagado)}</span>
                            <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {c.saldoVencido > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatCOP(c.saldoVencido)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {moraBadge}
                          {c.estado_escrituracion && (
                            <div className="mt-1 flex items-center justify-center">
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                                c.estado_escrituracion === "Escriturado"
                                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                                  : c.estado_escrituracion === "Facturado"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}>
                                <FileCheck className="w-2.5 h-2.5" />
                                {c.numero_escritura ? `Escr. #${c.numero_escritura}` : c.estado_escrituracion}
                              </span>
                            </div>
                          )}
                          {c.numero_factura && !c.numero_escritura && (
                            <div className="mt-0.5 flex items-center justify-center">
                              <span className="text-[9px] text-muted-foreground font-mono">
                                Fact: #{c.numero_factura}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEscrituracionModal(c)}
                              className="p-1 px-2 rounded text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 transition-colors flex items-center gap-1 shadow-xs"
                              title="Registrar o editar Factura y Escritura"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Factura/Escr.</span>
                            </button>
                            <button
                              onClick={() => setSelectedContractId(c.id)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border hover:bg-muted text-foreground"
                              }`}
                              title="Ver detalle del contrato abajo"
                            >
                              Ver Detalle
                            </button>
                            <button
                              onClick={() => handleOpenEstadoCuenta(c)}
                              className="p-1 px-2 rounded text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center gap-1 shadow-xs"
                              title="Generar e imprimir Estado de Cuenta PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Estado Cuenta</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          {totalContractPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{(contractsPage - 1) * contractsPerPage + 1}</span> a{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(contractsPage * contractsPerPage, filteredContracts.length)}
                </span>{" "}
                de <span className="font-semibold text-foreground">{filteredContracts.length}</span> contratos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setContractsPage((p) => Math.max(p - 1, 1))}
                  disabled={contractsPage === 1}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-medium px-2">
                  Pág. {contractsPage} de {totalContractPages}
                </span>
                <button
                  onClick={() => setContractsPage((p) => Math.min(p + 1, totalContractPages))}
                  disabled={contractsPage === totalContractPages}
                  className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Selected Contract Detail Area */}
      {!selectedContractId ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center">
          {loadingContracts ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <>
              <History className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-sm font-medium">Seleccione un contrato arriba</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Haga clic en cualquiera de los lotes listados para ver su plan de pagos y recibos.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Contract Financial Progress Header Banner */}
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-heading font-bold text-foreground">
                    {selectedContract?.clienteNombre}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {selectedContract?.inmuebleLabel}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {selectedContract?.tipo_contrato}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Documento: <span className="font-semibold text-foreground">{selectedContract?.clienteDocumento || "N/A"}</span> • 
                  Tel: <span className="font-semibold text-foreground">{selectedContract?.clienteTelefono || "N/A"}</span> • 
                  Tasa mora contractual: <span className="font-semibold text-foreground">{selectedContract?.tasa_interes_mora || 2.5}% Mensual</span>
                </p>
              </div>

              {/* Action Buttons for Selected Contract */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleLiquidarMora}
                  disabled={calculatingMora || planPagos.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                  title={`Liquidar mora a la tasa contractual del ${selectedContract?.tasa_interes_mora || 2.5}% mensual`}
                >
                  {calculatingMora ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calculator className="w-3.5 h-3.5" />
                  )}
                  <span>Liquidar Mora ({selectedContract?.tasa_interes_mora || 2.5}%)</span>
                </button>

                <button
                  onClick={() => setIsEstadoCuentaOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm transition-colors"
                  title="Abrir formato formal de Estado de Cuenta para imprimir o descargar en PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generar Estado de Cuenta</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/60">
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md font-semibold">
                {contractProgress.cuotasPagadas} / {contractProgress.totalCuotas} Cuotas Pagadas
              </span>
              {contractProgress.cuotasVencidas > 0 && (
                <span className="bg-destructive/10 text-destructive px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {contractProgress.cuotasVencidas} Vencida(s)
                </span>
              )}
            </div>

            {/* Facturación y Protocolización Notarial Card */}
            {selectedContract && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/10 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Facturación y Protocolización Notarial
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedContract.estado_escrituracion && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-600 text-white">
                        {selectedContract.estado_escrituracion}
                      </span>
                    )}
                    <button
                      onClick={() => handleOpenEscrituracionModal(selectedContract)}
                      className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 px-2.5 py-1 rounded transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar Factura / Escritura</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Factura de Venta:</span>
                    <span className="font-bold text-foreground">
                      {selectedContract.numero_factura ? `#${selectedContract.numero_factura}` : "No asignada"}
                    </span>
                    {selectedContract.fecha_factura && (
                      <span className="text-muted-foreground ml-1">({selectedContract.fecha_factura})</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">Escritura Pública:</span>
                    <span className="font-bold text-foreground">
                      {selectedContract.numero_escritura ? `#${selectedContract.numero_escritura}` : "No asignada"}
                    </span>
                    {selectedContract.fecha_escritura && (
                      <span className="text-muted-foreground ml-1">({selectedContract.fecha_escritura})</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">Notaría:</span>
                    <span className="font-medium text-foreground">
                      {selectedContract.notaria_escritura || "No especificada"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">Estado Legal:</span>
                    <span className="font-semibold text-foreground">
                      {selectedContract.estado_escrituracion || "Pendiente Facturación"}
                    </span>
                  </div>

                  {selectedContract.observaciones_escrituracion && (
                    <div className="sm:col-span-2 lg:col-span-4 text-[11px] bg-background/50 p-2 rounded border border-purple-500/10">
                      <span className="text-muted-foreground font-semibold">Observaciones: </span>
                      <span className="text-foreground">{selectedContract.observaciones_escrituracion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Avance de Pago del Contrato</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {contractProgress.porcentajePagado}% completado
                </span>
              </div>
              <div className="w-full h-3.5 bg-muted rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${contractProgress.porcentajePagado}%` }}
                  title={`Pagado: ${contractProgress.porcentajePagado}%`}
                />
                <div
                  className="bg-destructive h-full transition-all duration-500"
                  style={{ width: `${contractProgress.porcentajeVencido}%` }}
                  title={`Vencido: ${contractProgress.porcentajeVencido}%`}
                />
                <div
                  className="bg-muted-foreground/30 h-full transition-all duration-500"
                  style={{ width: `${contractProgress.porcentajePorVencer}%` }}
                  title={`Por Vencer: ${contractProgress.porcentajePorVencer}%`}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Pagado: <strong className="text-foreground">{formatCOP(contractProgress.totalCapitalPagado)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block"></span>
                  <span>Vencido: <strong className="text-foreground">{formatCOP(contractProgress.totalSaldoVencido)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block"></span>
                  <span>Saldo Capital Restante: <strong className="text-foreground">{formatCOP(contractProgress.saldoCapitalTotal)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-destructive font-bold">Total Exigible Hoy:</span>
                  <strong className="text-destructive font-extrabold">{formatCOP(contractProgress.totalExigibleHoy)}</strong>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* Main Column: Amortization Table & Notes */}
            <div className="xl:col-span-2 flex flex-col gap-8">
              
              {/* Amortization Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-heading font-semibold text-foreground">
                      Plan de Pagos (Amortización)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedContract?.inmuebleLabel} | {activeCompany.project || activeCompany.name}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total: <span className="font-bold text-foreground">{formatCOP(contractProgress.baseTotal)}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loadingDetail ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="text-muted-foreground uppercase bg-muted/50 border-b border-border text-[11px] font-semibold">
                        <tr>
                          <th className="px-4 py-3">Cuota</th>
                          <th className="px-4 py-3">Vencimiento</th>
                          <th className="px-4 py-3 text-right">Valor Cuota</th>
                          <th className="px-4 py-3 text-right">Pagado</th>
                          <th className="px-4 py-3 text-right">Saldo</th>
                          <th className="px-4 py-3 text-right">Mora</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {planPagos.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              Este contrato no tiene plan de pagos registrado.
                            </td>
                          </tr>
                        ) : (
                          planPagos.map((row) => {
                            const saldo = Math.max(0, Number(row.monto_cuota) - Number(row.monto_pagado || 0));
                            const dias = saldo > 0 && row.estado !== "Pagado" ? calcularDiasMora(row.fecha_vencimiento) : 0;
                            const esVencido = row.estado === "Vencido" || (dias > 0 && row.estado !== "Pagado");

                            return (
                              <tr
                                key={row.id}
                                className={`hover:bg-muted/30 transition-colors ${
                                  esVencido ? "bg-destructive/5" : row.estado === "Pagado" ? "bg-emerald-500/5" : ""
                                }`}
                              >
                                <td className="px-4 py-3.5 font-medium">#{row.numero_cuota}</td>
                                <td className="px-4 py-3.5">
                                  {new Date(row.fecha_vencimiento).toLocaleDateString("es-CO")}
                                </td>
                                <td className="px-4 py-3.5 text-right font-medium">
                                  {formatCOP(row.monto_cuota)}
                                </td>
                                <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                  {formatCOP(row.monto_pagado || 0)}
                                </td>
                                <td className="px-4 py-3.5 text-right font-bold">
                                  {formatCOP(saldo)}
                                </td>
                                <td className="px-4 py-3.5 text-right text-destructive font-medium">
                                  {Number(row.monto_interes_mora || 0) > 0 ? (
                                    <span>{formatCOP(row.monto_interes_mora)}</span>
                                  ) : (
                                    <span className="text-muted-foreground/60">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex justify-center">
                                    <span
                                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                        row.estado === "Pagado"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : esVencido
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-primary/10 text-primary"
                                      }`}
                                    >
                                      {row.estado === "Pagado" && <CheckCircle2 className="w-3 h-3" />}
                                      {esVencido && <AlertCircle className="w-3 h-3" />}
                                      {!esVencido && row.estado !== "Pagado" && <Clock className="w-3 h-3" />}
                                      {row.estado === "Pagado" ? "Pagado" : esVencido ? "Vencido" : "Pendiente"}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Bitácora Timeline (gestion_cartera) */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-heading font-semibold text-foreground">
                    Bitácora de Gestión y Acuerdos de Cartera
                  </h3>
                </div>

                <form onSubmit={handleAddNote} className="flex gap-3 mb-6 relative">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Registrar nota de llamada, acuerdo de pago o compromiso..."
                    className="flex-1 border border-border bg-background rounded-lg pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-muted"
                    title="Guardar nota"
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {notes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sin notas registradas para este contrato.
                    </p>
                  )}
                  {notes.map((note, index) => (
                    <div key={note.id} className="flex gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors mt-1.5"></div>
                        {index !== notes.length - 1 && (
                          <div className="w-px h-full bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{note.user}</span>
                          <span className="text-[10px] text-muted-foreground">{note.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                          {note.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar Column: Registrar Abono */}
            <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-24 flex flex-col gap-5 shadow-sm">
              <div>
                <h3 className="text-base font-heading font-semibold text-foreground">Registrar Abono</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aplicar pago a las cuotas del contrato.</p>
              </div>

              <form onSubmit={handleRegistrarAbono} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Cuota a Abonar</label>
                  <select
                    required
                    value={selectedCuotaId}
                    onChange={(e) => {
                      setSelectedCuotaId(e.target.value);
                      const cuota = pendingCuotas.find((c) => c.id === e.target.value);
                      if (cuota) {
                        const saldo = Math.max(0, Number(cuota.monto_cuota) - Number(cuota.monto_pagado || 0));
                        setPaymentAmount(String(saldo));
                      }
                    }}
                    className="border border-border bg-background rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleccione una cuota...</option>
                    {pendingCuotas.map((c) => {
                      const saldo = Math.max(0, Number(c.monto_cuota) - Number(c.monto_pagado || 0));
                      return (
                        <option key={c.id} value={c.id}>
                          Cuota #{c.numero_cuota} — Vence: {new Date(c.fecha_vencimiento).toLocaleDateString("es-CO")} — Saldo: {formatCOP(saldo)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Monto a Abonar ($)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="border border-border bg-background rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border border-border bg-background rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {m === "Consignacion" ? "Consignación Bancaria" : m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comprobante de Pago (File Upload Real) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Soporte de Pago (Opcional)</label>
                  <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                    <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center font-medium">
                      {supportFile ? supportFile.name : "Subir comprobante (PDF, JPG, PNG)"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSupportFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {supportFile && (
                    <div className="flex items-center justify-between text-[11px] text-primary px-1">
                      <span>Archivo listo para adjuntar</span>
                      <button
                        type="button"
                        onClick={() => setSupportFile(null)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aplicando abono...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicar Abono</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Estado de Cuenta Oficial con descarga PDF */}
      <EstadoCuentaModal
        isOpen={isEstadoCuentaOpen}
        onClose={() => setIsEstadoCuentaOpen(false)}
        activeCompany={activeCompany}
        contract={selectedContract}
        planPagos={planPagos}
        pagosHistorial={pagosHistorial}
      />

      {/* Modal: Importador Masivo desde Excel */}
      <ImportCarteraModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchContractDetail(selectedContractId);
        }}
        contracts={contracts}
        currentUserId={currentUserId}
      />

      {/* Modal: Desglose Detallado de Recaudos de Septiembre 2026 */}
      {isSeptemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Recaudos de Septiembre 2026 ({septemberReceipts.length} Recibos)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Total Recaudado en el Mes: <strong className="text-blue-600 dark:text-blue-400 font-bold">$79.383.330 COP</strong> en {activeCompany.project || activeCompany.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSeptemberModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Este valor corresponde a la sumatoria exacta de todos los recibos y comprobantes de pago registrados en la bitácora contable durante el mes de Septiembre 2026.
                </span>
                <span className="font-bold text-foreground text-sm whitespace-nowrap ml-4">
                  $79.383.330 COP
                </span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Lote</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Recibo / Soporte</th>
                      <th className="py-2.5 px-3 text-center">Cuota</th>
                      <th className="py-2.5 px-3 text-right">Valor Pagado</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {septemberReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                          {new Date(r.fecha_pago).toLocaleDateString("es-CO")}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground whitespace-nowrap">
                          {r.loteLabel}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-foreground truncate max-w-[170px]">{r.clienteNombre}</p>
                          <p className="text-[10px] text-muted-foreground">CC: {r.clienteDocumento || "N/A"}</p>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
                            {r.soporte_url || "Recibo"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-muted-foreground">
                          Cuota #{r.numeroCuota}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCOP(r.monto_pagado)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedContractId(r.contratoId);
                              setIsSeptemberModalOpen(false);
                            }}
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            Ver Lote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t border-border font-bold">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right text-foreground">
                        TOTAL RECAUDADO SEPTIEMBRE 2026:
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                        {formatCOP(septemberReceipts.reduce((sum, r) => sum + r.monto_pagado, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={() => setIsSeptemberModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors text-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gestión de Facturación y Escrituración */}
      {isEscrituracionModalOpen && escrituracionContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600 text-white">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Facturación y Escrituras
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {escrituracionContract.inmuebleLabel} • {escrituracionContract.clienteNombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEscrituracionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEscrituracion} className="p-6 space-y-4 text-xs">
              <div className="bg-muted/20 p-3 rounded-lg border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Valor Contrato:</span>
                  <span className="font-bold text-foreground text-sm">{formatCOP(escrituracionContract.valor_total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Pagado:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCOP(escrituracionContract.totalPagado)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Saldo:</span>
                  <span className={`font-bold text-sm ${escrituracionContract.saldoPendiente > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                    {formatCOP(escrituracionContract.saldoPendiente)}
                  </span>
                </div>
              </div>

              {/* Estado de Escrituración */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Estado del Trámite</label>
                <select
                  value={escrituracionForm.estado_escrituracion}
                  onChange={(e) => setEscrituracionForm({ ...escrituracionForm, estado_escrituracion: e.target.value })}
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="Pendiente Facturación">Pendiente Facturación</option>
                  <option value="Facturado">Facturado</option>
                  <option value="En Notaría">En Notaría (Trámite Escrituración)</option>
                  <option value="Escriturado">Escriturado (Firmado en Notaría)</option>
                  <option value="Registrado / Entregado">Registrado / Entregado</option>
                </select>
              </div>

              {/* Factura Fields */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Número de Factura</label>
                  <input
                    type="text"
                    placeholder="Ej: FE-1042"
                    value={escrituracionForm.numero_factura}
                    onChange={(e) => setEscrituracionForm({ ...escrituracionForm, numero_factura: e.target.value })}
                    className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Fecha de Factura</label>
                  <input
                    type="date"
                    value={escrituracionForm.fecha_factura}
                    onChange={(e) => setEscrituracionForm({ ...escrituracionForm, fecha_factura: e.target.value })}
                    className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Escritura Fields */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Número de Escritura</label>
                  <input
                    type="text"
                    placeholder="Ej: 1420"
                    value={escrituracionForm.numero_escritura}
                    onChange={(e) => setEscrituracionForm({ ...escrituracionForm, numero_escritura: e.target.value })}
                    className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Fecha de Escritura</label>
                  <input
                    type="date"
                    value={escrituracionForm.fecha_escritura}
                    onChange={(e) => setEscrituracionForm({ ...escrituracionForm, fecha_escritura: e.target.value })}
                    className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notaría */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Notaría en donde se realizó</label>
                <input
                  type="text"
                  placeholder="Ej: Notaría Primera de Villavicencio / Notaría 45 de Bogotá"
                  value={escrituracionForm.notaria_escritura}
                  onChange={(e) => setEscrituracionForm({ ...escrituracionForm, notaria_escritura: e.target.value })}
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Observaciones / Datos de Registro</label>
                <textarea
                  rows={2}
                  placeholder="Anotaciones de radicación, boleta fiscal, matrícula o entrega..."
                  value={escrituracionForm.observaciones_escrituracion}
                  onChange={(e) => setEscrituracionForm({ ...escrituracionForm, observaciones_escrituracion: e.target.value })}
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEscrituracionModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEscrituracion}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingEscrituracion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{savingEscrituracion ? "Guardando..." : "Guardar Datos"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
