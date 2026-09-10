"use client";

import { useRouter } from "next/navigation";

import React, { useState, useEffect } from "react";
import { CanvasSignature } from "./canvas-signature";
import { ClientModal, ClientData } from "./client-modal";
import { Calculator, AlertCircle, FilePlus2, UserPlus, Link as LinkIcon, Trash2, Loader2, Search, Plus } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";

interface Participant {
  id: string;
  tipoPersona: "Persona Natural" | "Persona Jurídica";
  nombreCompleto: string;
  documento: string;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  documentoRepresentante: string;
  rolContractual: string;
  correo: string;
  telefono: string;
}

export function DynamicContract() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoContrato, setTipoContrato] = useState("Compraventa");
  const [withInterest, setWithInterest] = useState(false);
  const [interestRate, setInterestRate] = useState(2.0);
  const [moraRate, setMoraRate] = useState(3.0); // 2 to 5 points below usury
  // Complex Payment Structure States
  const [amount, setAmount] = useState<number | "">("");
  
  const [cuotaInicialMonto, setCuotaInicialMonto] = useState<number | "">("");
  const [cuotaInicialPagos, setCuotaInicialPagos] = useState<number | "">(1);
  const [cuotaInicialFecha, setCuotaInicialFecha] = useState<string>("");

  const [cuotaOrdinariaPagos, setCuotaOrdinariaPagos] = useState<number | "">("");
  const [cuotaOrdinariaFecha, setCuotaOrdinariaFecha] = useState<string>("");
  const [diaPagoMensual, setDiaPagoMensual] = useState<number | "">(21);

  const [tieneExtraordinarias, setTieneExtraordinarias] = useState(false);
  const [frecuenciaExtraordinaria, setFrecuenciaExtraordinaria] = useState<string>("Semestral");
  const [montoCuotaExtraordinaria, setMontoCuotaExtraordinaria] = useState<number | "">("");
  const [numeroCuotasExtraordinarias, setNumeroCuotasExtraordinarias] = useState<number | "">("");
  const [fechaInicioExtraordinarias, setFechaInicioExtraordinarias] = useState<string>("");
  
  const [cuotasExtraordinarias, setCuotasExtraordinarias] = useState<Array<{ id: string, monto: number | "", fecha: string, concepto: string }>>([]);
  
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loadingInmuebles, setLoadingInmuebles] = useState(true);
  const [selectedInmuebleId, setSelectedInmuebleId] = useState<string>("");
  
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", tipoPersona: "Persona Natural", nombreCompleto: "", documento: "", razonSocial: "", nit: "", representanteLegal: "", documentoRepresentante: "", rolContractual: "Comprador Principal", correo: "", telefono: "" }
  ]);
  
  const [contractId, setContractId] = useState<string | null>(null);

  const [clientsList, setClientsList] = useState<ClientData[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      const supabase = createClient();
      const { data } = await supabase.from('clientes').select('*');
      if (data) setClientsList(data);
    }
    fetchClients();
  }, []);

  useEffect(() => {
    async function fetchInmuebles() {
      if (!activeCompany?.id) return;
      setLoadingInmuebles(true);
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase
          .from('inmuebles')
          .select('id, identificador, precio_venta, estado, proyectos!inner(empresa_id)')
          .eq('proyectos.empresa_id', activeCompany.id)
          .in('estado', ['Disponible', 'Reservado'])
          .order('identificador', { ascending: true });

        if (error) throw error;
        setInmuebles(data || []);
      } catch (err) {
        console.error("Error fetching inmuebles:", err);
      } finally {
        setLoadingInmuebles(false);
      }
    }
    
    fetchInmuebles();
  }, [activeCompany]);

  // Handle auto-fill amount when selecting inmueble
  const handleSelectInmueble = (id: string) => {
    setSelectedInmuebleId(id);
    if (!id) {
      setAmount("");
      return;
    }
    const selected = inmuebles.find(i => i.id === id);
    if (selected && selected.precio_venta) {
      setAmount(selected.precio_venta);
    }
  };

  const addParticipant = () => {
    if (participants.length >= 4) return;
    setParticipants([
      ...participants,
      { id: Date.now().toString(), tipoPersona: "Persona Natural", nombreCompleto: "", documento: "", razonSocial: "", nit: "", representanteLegal: "", documentoRepresentante: "", rolContractual: "Co-propietario", correo: "", telefono: "" }
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length === 1) return;
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipant = (id: string, field: keyof Omit<Participant, 'id'>, value: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSelectClient = (participantId: string, clientId: string) => {
    if (!clientId) return;
    const client = clientsList.find(c => c.id === clientId);
    if (!client) return;

    const isNatural = client.tipo_persona === 'Natural';
    setParticipants(participants.map(p => p.id === participantId ? {
      ...p,
      tipoPersona: isNatural ? "Persona Natural" : "Persona Jurídica",
      nombreCompleto: isNatural ? client.nombre_razon_social : "",
      documento: isNatural ? client.documento : "",
      razonSocial: isNatural ? "" : client.nombre_razon_social,
      nit: isNatural ? "" : client.documento,
      representanteLegal: client.rep_legal_nombre || "",
      documentoRepresentante: client.rep_legal_documento || "",
      correo: client.correo,
      telefono: client.telefono,
    } : p));
  };

  const addExtraordinaria = () => {
    setCuotasExtraordinarias([
      ...cuotasExtraordinarias,
      { id: Date.now().toString(), monto: "", fecha: "", concepto: "" }
    ]);
  };

  const removeExtraordinaria = (id: string) => {
    setCuotasExtraordinarias(cuotasExtraordinarias.filter(c => c.id !== id));
  };

  const updateExtraordinaria = (id: string, field: string, value: string | number) => {
    setCuotasExtraordinarias(cuotasExtraordinarias.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Math Derivations
  const targetTotal = Number(amount) || 0;
  const cIniMontoTotal = Number(cuotaInicialMonto) || 0;
  
  let cExtraMontoTotal = 0;
  if (tieneExtraordinarias) {
    if (frecuenciaExtraordinaria === 'Personalizada') {
      cExtraMontoTotal = cuotasExtraordinarias.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
    } else {
      cExtraMontoTotal = (Number(montoCuotaExtraordinaria) || 0) * (Number(numeroCuotasExtraordinarias) || 0);
    }
  }

  const saldoRestante = Math.max(0, targetTotal - cIniMontoTotal - cExtraMontoTotal);
  const cOrdPagos = Number(cuotaOrdinariaPagos) || 0;
  const cuotaOrdinariaMonto = cOrdPagos > 0 ? (saldoRestante / cOrdPagos) : 0;

  const calculateAmortization = () => {
    const cuotas = [];
    let counter = 1;

    // 1. Cuota Inicial
    const cIniPagos = Number(cuotaInicialPagos) || 1;
    if (cIniMontoTotal > 0 && cIniPagos > 0) {
      const montoPorPago = cIniMontoTotal / cIniPagos;
      const baseDate = cuotaInicialFecha ? new Date(cuotaInicialFecha + "T12:00:00") : new Date();
      
      for (let i = 0; i < cIniPagos; i++) {
        const paymentDate = new Date(baseDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        cuotas.push({
          id: `ini-${i}`,
          numero: counter++,
          tipo_cuota: 'CUOTA_INICIAL',
          concepto: `Cuota Inicial ${i + 1}/${cIniPagos}`,
          fecha: paymentDate.toISOString().split('T')[0],
          principal: montoPorPago,
          interest: 0,
          payment: montoPorPago
        });
      }
    }

    // 2. Ordinarias
    const rate = withInterest ? interestRate / 100 : 0;

    if (saldoRestante > 0 && cOrdPagos > 0) {
      const baseDate = cuotaOrdinariaFecha ? new Date(cuotaOrdinariaFecha + "T12:00:00") : new Date();
      
      // Sistema Francés / Cuota Fija
      const P = saldoRestante;
      const i = rate;
      const n = cOrdPagos;
      let C = i > 0 
        ? P * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1))
        : P / n;
        
      let currentBalance = P;

      for (let j = 0; j < n; j++) {
        const paymentDate = new Date(baseDate);
        paymentDate.setMonth(paymentDate.getMonth() + j);
        
        if (diaPagoMensual) {
          const targetDay = Number(diaPagoMensual);
          const daysInMonth = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0).getDate();
          paymentDate.setDate(Math.min(targetDay, daysInMonth));
        }
        
        const interestPart = currentBalance * i;
        let principalPart = C - interestPart;
        
        // Ajuste última cuota por redondeos
        if (j === n - 1) {
          principalPart = currentBalance;
          C = principalPart + interestPart;
        }
        
        currentBalance -= principalPart;
        
        cuotas.push({
          id: `ord-${j}`,
          numero: counter++,
          tipo_cuota: 'ORDINARIA',
          concepto: `Ordinaria #${j + 1}`,
          fecha: paymentDate.toISOString().split('T')[0],
          principal: principalPart,
          interest: interestPart,
          payment: C
        });
      }
    }

    // 3. Extraordinarias
    if (tieneExtraordinarias) {
      if (frecuenciaExtraordinaria === 'Personalizada') {
        cuotasExtraordinarias.forEach((extra, i) => {
          const monto = Number(extra.monto) || 0;
          if (monto > 0) {
            cuotas.push({
              id: `ext-pers-${extra.id}`,
              numero: counter++,
              tipo_cuota: 'EXTRAORDINARIA',
              concepto: extra.concepto || `Refuerzo #${i + 1}`,
              fecha: extra.fecha || new Date().toISOString().split('T')[0],
              principal: monto,
              interest: 0,
              payment: monto
            });
          }
        });
      } else {
        const monto = Number(montoCuotaExtraordinaria) || 0;
        const count = Number(numeroCuotasExtraordinarias) || 0;
        const baseDate = fechaInicioExtraordinarias ? new Date(fechaInicioExtraordinarias + "T12:00:00") : new Date();
        
        let monthStep = 1;
        switch (frecuenciaExtraordinaria) {
          case 'Bimensual': monthStep = 2; break;
          case 'Trimestral': monthStep = 3; break;
          case 'Semestral': monthStep = 6; break;
          case 'Anual': monthStep = 12; break;
        }

        for (let i = 0; i < count; i++) {
          const paymentDate = new Date(baseDate);
          paymentDate.setMonth(paymentDate.getMonth() + (i * monthStep));
          
          if (diaPagoMensual) {
            const targetDay = Number(diaPagoMensual);
            const daysInMonth = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0).getDate();
            paymentDate.setDate(Math.min(targetDay, daysInMonth));
          }

          cuotas.push({
            id: `ext-auto-${i}`,
            numero: counter++,
            tipo_cuota: 'EXTRAORDINARIA',
            concepto: `Refuerzo ${frecuenciaExtraordinaria} #${i + 1}`,
            fecha: paymentDate.toISOString().split('T')[0],
            principal: monto,
            interest: 0,
            payment: monto
          });
        }
      }
    }

    // Sort chronologically by date
    cuotas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Re-assign numbers after sorting
    cuotas.forEach((c, index) => {
      c.numero = index + 1;
    });

    return cuotas;
  };

  const schedule = calculateAmortization();
  
  // Validation Math
  const plannedTotal = schedule.reduce((sum, row) => sum + row.principal, 0);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const financedTotal = targetTotal + totalInterest;
  
  const difference = targetTotal - plannedTotal;
  const isValidPlan = Math.abs(difference) < 1; // Tolerance for floating point

  const handleGenerate = async () => {
    if (!activeCompany?.id || !selectedInmuebleId) {
      alert("Seleccione una empresa y un inmueble.");
      return;
    }
    
    if (!isValidPlan || targetTotal === 0) {
      alert("El plan de pagos debe cuadrar con el valor del contrato.");
      return;
    }

    for (const p of participants) {
      const nombreParaValidar = p.tipoPersona === "Persona Natural" ? p.nombreCompleto : p.razonSocial;
      const documentoParaValidar = p.tipoPersona === "Persona Natural" ? p.documento : p.nit;
      if (!nombreParaValidar.trim() || !documentoParaValidar.trim() || !p.correo.trim() || !p.telefono.trim()) {
        alert("Complete nombre/razón social, documento/NIT, correo y teléfono de todos los participantes.");
        return;
      }
    }

    const supabase = createClient();
    setIsSubmitting(true);

    try {
      // 1. Insert Contract
      const { data: ctData, error: ctError } = await (supabase.from('contratos') as any)
        .insert([{
          id: crypto.randomUUID(),
          empresa_id: activeCompany.id,
          inmueble_id: selectedInmuebleId,
          tipo_contrato: tipoContrato,
          fecha_inicio: new Date().toISOString(),
          valor_total: financedTotal,
          tiene_intereses: withInterest,
          tasa_interes_corriente: withInterest ? interestRate : null,
          tasa_interes_mora: moraRate,
          estado_firma: 'Pendiente',
          // New Metadata fields mapped as requested
          frecuencia_extraordinaria: tieneExtraordinarias ? frecuenciaExtraordinaria : null,
          monto_cuota_extraordinaria: tieneExtraordinarias && frecuenciaExtraordinaria !== 'Personalizada' ? Number(montoCuotaExtraordinaria) || 0 : null,
          numero_cuotas_extraordinarias: tieneExtraordinarias && frecuenciaExtraordinaria !== 'Personalizada' ? Number(numeroCuotasExtraordinarias) || 0 : null,
          dia_pago_mensual: Number(diaPagoMensual) || null
        }])
        .select()
        .single();
        
      if (ctError) throw ctError;
      const dbContractId = ctData.id;

      // 2. Upsert Clients and link them to the contract
      for (const p of participants) {
        const isNatural = p.tipoPersona === "Persona Natural";
        const clienteRow = {
          tipo_persona: isNatural ? "Natural" : "Juridica",
          documento: isNatural ? p.documento : p.nit,
          nombre_razon_social: isNatural ? p.nombreCompleto : p.razonSocial,
          rep_legal_nombre: isNatural ? null : (p.representanteLegal || null),
          rep_legal_documento: isNatural ? null : (p.documentoRepresentante || null),
          correo: p.correo,
          telefono: p.telefono,
        };

        const { data: clienteData, error: clienteError } = await (supabase.from('clientes') as any)
          .upsert(clienteRow, { onConflict: 'documento' })
          .select()
          .single();

        if (clienteError) throw clienteError;

        const { error: contratanteError } = await (supabase.from('contratantes_contrato') as any)
          .insert({
            contrato_id: dbContractId,
            cliente_id: clienteData.id,
            rol_contratante: p.rolContractual,
          });

        if (contratanteError) throw contratanteError;
      }

      // 3. Insert Payment Plan
      const mappedSchedule = schedule.map(row => ({
        contrato_id: dbContractId,
        numero_cuota: row.numero,
        fecha_vencimiento: row.fecha,
        monto_cuota: row.payment,
        monto_pagado: 0,
        monto_interes_mora: 0,
        estado: 'Pendiente',
        tipo_cuota: row.tipo_cuota
      }));

      const { error: planError } = await (supabase.from('plan_pagos') as any)
        .insert(mappedSchedule);

      if (planError) throw planError;

      setContractId(dbContractId);
      alert(`Contrato generado y guardado exitosamente.`);
      router.push('/contracts');
      router.refresh();
    } catch (error: any) {
      console.error("Error generating contract:", error);
      alert("Hubo un error al generar el contrato: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!contractId) return;
    const link = `${window.location.origin}/firmar/${contractId}`;
    navigator.clipboard.writeText(link);
    alert("Enlace copiado al portapapeles: " + link);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
              <FilePlus2 className="w-5 h-5 text-primary" />
              Generador de Contratos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete los datos para generar el documento.
            </p>
          </div>
          {contractId && (
            <button onClick={handleCopyLink} className="flex items-center gap-2 bg-secondary/10 text-secondary hover:bg-secondary/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
              <LinkIcon className="w-4 h-4" />
              Enlace de Firma
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Inmueble</label>
            <div className="relative">
              <select 
                value={selectedInmuebleId}
                onChange={(e) => handleSelectInmueble(e.target.value)}
                className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm appearance-none pr-8"
                disabled={loadingInmuebles || inmuebles.length === 0}
              >
                <option value="">Seleccione un inmueble...</option>
                {inmuebles.length === 0 && !loadingInmuebles && (
                  <option value="" disabled>No hay lotes disponibles para esta empresa</option>
                )}
                {inmuebles.map((inm) => (
                  <option key={inm.id} value={inm.id}>
                    {inm.identificador} - ${(inm.precio_venta || 0).toLocaleString('es-CO')}
                  </option>
                ))}
              </select>
              {loadingInmuebles && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tipo de Contrato</label>
            <select 
              value={tipoContrato}
              onChange={(e) => setTipoContrato(e.target.value)}
              className="border border-border bg-background rounded-md px-3 py-2 text-sm"
            >
              <option value="Compraventa">Compraventa</option>
              <option value="Arrendamiento">Arrendamiento</option>
              <option value="Servicios">Servicios</option>
              <option value="Corretaje">Corretaje</option>
            </select>
          </div>
        </div>

        {/* Participants Section */}
        <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-medium">Participantes (Max 4)</h3>
            <button 
              onClick={addParticipant} 
              disabled={participants.length >= 4}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Agregar Comprador/Garante
            </button>
          </div>
          
          <div className="space-y-4">
            {participants.map((p, index) => (
              <div key={p.id} className="p-4 bg-background border border-border rounded-md relative group">
                {participants.length > 1 && (
                  <button 
                    onClick={() => removeParticipant(p.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Participante #{index + 1}</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Rol Contractual</label>
                    <select 
                      value={p.rolContractual}
                      onChange={(e) => updateParticipant(p.id, "rolContractual", e.target.value)}
                      className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                    >
                      <option>Comprador Principal</option>
                      <option>Co-propietario</option>
                      <option>Arrendatario</option>
                      <option>Deudor Solidario</option>
                      <option>Contratista</option>
                      <option>Consultor</option>
                    </select>
                  </div>
                  {/* Client Selector & Creation */}
                  <div className="col-span-2 flex flex-col sm:flex-row items-end gap-2 p-3 bg-muted/30 border border-border rounded-md mb-2">
                    <div className="flex-1 w-full flex flex-col gap-1.5">
                      <label className="text-xs font-medium flex items-center gap-1 text-primary">
                        <Search className="w-3.5 h-3.5" /> Autocompletar con Cliente Existente
                      </label>
                      <select
                        onChange={(e) => handleSelectClient(p.id, e.target.value)}
                        className="border border-border bg-background rounded-md px-2 py-1.5 text-sm w-full"
                        defaultValue=""
                      >
                        <option value="" disabled>Seleccionar cliente...</option>
                        {clientsList.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.nombre_razon_social} ({client.documento})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveParticipantId(p.id);
                        setIsClientModalOpen(true);
                      }}
                      className="whitespace-nowrap px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 h-[34px]"
                    >
                      <Plus className="w-4 h-4" /> Crear Cliente
                    </button>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Tipo de Persona</label>
                    <select 
                      value={p.tipoPersona}
                      onChange={(e) => updateParticipant(p.id, "tipoPersona", e.target.value as "Persona Natural" | "Persona Jurídica")}
                      className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                    >
                      <option>Persona Natural</option>
                      <option>Persona Jurídica</option>
                    </select>
                  </div>

                  {p.tipoPersona === "Persona Natural" ? (
                    <>
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Nombre Completo</label>
                        <input
                          type="text"
                          value={p.nombreCompleto}
                          onChange={(e) => updateParticipant(p.id, "nombreCompleto", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                          placeholder="Juan Pérez"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Documento de Identidad</label>
                        <input
                          type="text"
                          value={p.documento}
                          onChange={(e) => updateParticipant(p.id, "documento", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                          placeholder="CC..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Razón Social</label>
                        <input
                          type="text"
                          value={p.razonSocial}
                          onChange={(e) => updateParticipant(p.id, "razonSocial", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                          placeholder="Empresa S.A.S"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">NIT</label>
                        <input
                          type="text"
                          value={p.nit}
                          onChange={(e) => updateParticipant(p.id, "nit", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                          placeholder="900..."
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Representante Legal</label>
                        <input
                          type="text"
                          value={p.representanteLegal}
                          onChange={(e) => updateParticipant(p.id, "representanteLegal", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Doc. Representante</label>
                        <input
                          type="text"
                          value={p.documentoRepresentante}
                          onChange={(e) => updateParticipant(p.id, "documentoRepresentante", e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                        />
                      </div>
                    </>
                  )}
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Correo</label>
                    <input
                      type="email"
                      value={p.correo}
                      onChange={(e) => updateParticipant(p.id, "correo", e.target.value)}
                      className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Teléfono</label>
                    <input
                      type="text"
                      value={p.telefono}
                      onChange={(e) => updateParticipant(p.id, "telefono", e.target.value)}
                      className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                      placeholder="300..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-medium text-sm text-primary flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Estructura de Pagos
            </h3>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Valor del Contrato</span>
              <span className="font-bold text-lg">${targetTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>
          
          {/* 1. Cuota Inicial */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">1. Cuota Inicial</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Monto Total Inicial</label>
                <input 
                  type="number" 
                  value={cuotaInicialMonto === "" ? "" : cuotaInicialMonto}
                  onChange={(e) => setCuotaInicialMonto(e.target.value === "" ? "" : Number(e.target.value))}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Diferido en (Meses)</label>
                <input 
                  type="number" 
                  min="1"
                  value={cuotaInicialPagos === "" ? "" : cuotaInicialPagos}
                  onChange={(e) => setCuotaInicialPagos(e.target.value === "" ? "" : Number(e.target.value))}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Fecha 1ra Cuota</label>
                <input 
                  type="date" 
                  value={cuotaInicialFecha}
                  onChange={(e) => setCuotaInicialFecha(e.target.value)}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                />
              </div>
            </div>
          </div>

          {/* 2. Cuotas Ordinarias */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">2. Financiación Ordinaria (Mensualidades)</h4>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded">
                Saldo: ${saldoRestante.toLocaleString('es-CO')}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">N° de Cuotas (Meses)</label>
                <input 
                  type="number" 
                  min="0"
                  value={cuotaOrdinariaPagos === "" ? "" : cuotaOrdinariaPagos}
                  onChange={(e) => setCuotaOrdinariaPagos(e.target.value === "" ? "" : Number(e.target.value))}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Día de Pago (Cada Mes)</label>
                <select 
                  value={diaPagoMensual === "" ? "" : diaPagoMensual}
                  onChange={(e) => setDiaPagoMensual(e.target.value === "" ? "" : Number(e.target.value))}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Fecha Inicio</label>
                <input 
                  type="date" 
                  value={cuotaOrdinariaFecha}
                  onChange={(e) => setCuotaOrdinariaFecha(e.target.value)}
                  className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Valor Cuota Mensual</label>
                <div className="border border-border bg-muted/50 rounded-md px-2 py-1.5 text-sm font-semibold flex items-center h-full">
                  ${cuotaOrdinariaMonto.toLocaleString('es-CO', {maximumFractionDigits: 0})}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Extraordinarias */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">3. Cuotas Extraordinarias / Refuerzos</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={tieneExtraordinarias} onChange={(e) => setTieneExtraordinarias(e.target.checked)} />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            {tieneExtraordinarias && (
              <div className="bg-background border border-border p-3 rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-xs font-medium">Frecuencia</label>
                    <select 
                      value={frecuenciaExtraordinaria}
                      onChange={(e) => setFrecuenciaExtraordinaria(e.target.value)}
                      className="border border-border bg-background rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="Bimensual">Bimensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Personalizada">Personalizada</option>
                    </select>
                  </div>
                  
                  {frecuenciaExtraordinaria !== 'Personalizada' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Monto por Refuerzo</label>
                        <input 
                          type="number" 
                          value={montoCuotaExtraordinaria === "" ? "" : montoCuotaExtraordinaria}
                          onChange={(e) => setMontoCuotaExtraordinaria(e.target.value === "" ? "" : Number(e.target.value))}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Cantidad de Refuerzos</label>
                        <input 
                          type="number" 
                          value={numeroCuotasExtraordinarias === "" ? "" : numeroCuotasExtraordinarias}
                          onChange={(e) => setNumeroCuotasExtraordinarias(e.target.value === "" ? "" : Number(e.target.value))}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium">Fecha de Inicio</label>
                        <input 
                          type="date" 
                          value={fechaInicioExtraordinarias}
                          onChange={(e) => setFechaInicioExtraordinarias(e.target.value)}
                          className="border border-border bg-background rounded-md px-2 py-1.5 text-sm" 
                        />
                      </div>
                    </>
                  )}
                </div>

                {frecuenciaExtraordinaria === 'Personalizada' && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Lista de Refuerzos Manuales</span>
                      <button 
                        onClick={addExtraordinaria}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded"
                      >
                        + Agregar Fila
                      </button>
                    </div>
                    
                    {cuotasExtraordinarias.map((extra, idx) => (
                      <div key={extra.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-4 flex flex-col gap-1">
                          <input 
                            type="text" 
                            value={extra.concepto}
                            onChange={(e) => updateExtraordinaria(extra.id, "concepto", e.target.value)}
                            placeholder="Concepto (Ej. Refuerzo Diciembre)"
                            className="border border-border rounded px-2 py-1.5 text-xs w-full bg-background"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3 flex flex-col gap-1">
                          <input 
                            type="number" 
                            value={extra.monto === "" ? "" : extra.monto}
                            onChange={(e) => updateExtraordinaria(extra.id, "monto", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Monto"
                            className="border border-border rounded px-2 py-1.5 text-xs w-full bg-background"
                          />
                        </div>
                        <div className="col-span-5 md:col-span-4 flex flex-col gap-1">
                          <input 
                            type="date" 
                            value={extra.fecha}
                            onChange={(e) => updateExtraordinaria(extra.id, "fecha", e.target.value)}
                            className="border border-border rounded px-2 py-1.5 text-xs w-full bg-background"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end pb-1.5">
                          <button onClick={() => removeExtraordinaria(extra.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cuotasExtraordinarias.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-2">No hay pagos extraordinarios configurados.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Financial Totals UI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/50 pt-4 mt-2">
            <div className="p-3 bg-muted/20 border border-border rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase block">Precio Contado</span>
              <span className="text-lg font-bold">${targetTotal.toLocaleString('es-CO')}</span>
            </div>
            <div className="p-3 bg-muted/20 border border-border rounded-md">
              <span className="text-xs font-semibold text-muted-foreground uppercase block">Total Intereses</span>
              <span className="text-lg font-bold">${totalInterest.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <span className="text-xs font-semibold text-primary uppercase block">Valor Final Financiado</span>
              <span className="text-lg font-bold text-primary">${financedTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          
          {/* Validation Banner */}
          <div className={`p-3 rounded-md border flex items-center justify-between ${
            isValidPlan ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase">Validación del Plan (Capital)</span>
              <span className="text-sm">
                Capital Proyectado: ${plannedTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })} / Precio Contado: ${targetTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {!isValidPlan && (
              <div className="text-right">
                <span className="text-xs font-semibold block">Diferencia Capital</span>
                <span className="font-bold text-sm">${Math.abs(difference).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            {isValidPlan && (
              <div className="text-xs font-bold bg-emerald-500 text-white px-2 py-1 rounded">
                CAPITAL CUADRADO
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Con Intereses Corrientes</h4>
              <p className="text-xs text-muted-foreground">Aplicar tasa de financiación</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={withInterest} onChange={(e) => setWithInterest(e.target.checked)} />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {withInterest && (
            <div className="flex flex-col gap-2 animate-accordion-down">
              <label className="text-sm font-medium">Tasa de Interés Mensual (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm" 
              />
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tasa de Mora (% por debajo de Usura)</label>
              <span className="text-xs font-semibold px-2 py-1 bg-secondary/20 text-secondary rounded-md">
                -{moraRate.toFixed(1)} Pts
              </span>
            </div>
            <input 
              type="range" 
              min="2" max="5" step="0.5" 
              value={moraRate}
              onChange={(e) => setMoraRate(Number(e.target.value))}
              className="w-full accent-primary" 
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Se cobrará a la tasa de usura menos {moraRate} puntos porcentuales.
            </p>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!isValidPlan || targetTotal === 0 || isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-medium transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando contrato...
            </>
          ) : (
            "Generar Borrador de Contrato"
          )}
        </button>
      </div>

      {/* Preview Section */}
      <div className="flex flex-col gap-6 bg-muted/30 p-6 rounded-xl border border-border">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-primary" />
            Proyección de Pagos
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-3 py-2 rounded-tl-md">#</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo / Concepto</th>
                  <th className="px-3 py-2 text-right rounded-tr-md">Total a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs italic">
                      Complete la estructura de pagos para generar la proyección
                    </td>
                  </tr>
                ) : (
                  schedule.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-3 font-medium text-xs">#{row.numero}</td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">{row.fecha}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            row.tipo_cuota === 'CUOTA_INICIAL' ? 'bg-blue-500/10 text-blue-600' :
                            row.tipo_cuota === 'EXTRAORDINARIA' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {row.tipo_cuota.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={row.concepto}>
                            {row.concepto}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-bold text-right">${row.payment.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={(newClient) => {
          setClientsList(prev => {
            const exists = prev.find(c => c.id === newClient.id);
            if (exists) return prev.map(c => c.id === newClient.id ? newClient : c);
            return [...prev, newClient];
          });
          if (activeParticipantId && newClient.id) {
            handleSelectClient(activeParticipantId, newClient.id);
          }
        }}
      />
    </div>
  );
}
