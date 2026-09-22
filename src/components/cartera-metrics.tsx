"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { formatCOP } from "@/lib/cartera-utils";
import { Target, TrendingUp, AlertTriangle, Calendar, Loader2, ChevronDown, ChevronUp, ArrowRight, Receipt } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface MonthlyMetric {
  mes: number;
  anio: number;
  mesNombre: string;
  meta: number;
  recaudado: number;
  porcentaje: number;
}

interface CarteraMetricsProps {
  onViewSeptemberReceipts?: () => void;
}

export function CarteraMetrics({ onViewSeptemberReceipts }: CarteraMetricsProps = {}) {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [currentMonthMetric, setCurrentMonthMetric] = useState<{
    meta: number;
    recaudado: number;
    porcentaje: number;
    totalRecibos: number;
    proyeccionId: string | null;
  }>({
    meta: 0,
    recaudado: 0,
    porcentaje: 0,
    totalRecibos: 0,
    proyeccionId: null,
  });

  const [globalMora, setGlobalMora] = useState<{
    totalVencido: number;
    interesesMoraTotal: number;
    cuotasVencidasCount: number;
    contratosConMoraCount: number;
  }>({
    totalVencido: 0,
    interesesMoraTotal: 0,
    cuotasVencidasCount: 0,
    contratosConMoraCount: 0,
  });

  const [historicalData, setHistoricalData] = useState<MonthlyMetric[]>([]);
  const [editingMeta, setEditingMeta] = useState(false);
  const [newMetaValue, setNewMetaValue] = useState("");

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const fetchMetrics = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Obtener recaudos históricos y del mes actual usando RPC directo
      const { data: recaudoHistorico, error: rpcError } = await (supabase.rpc as any)(
        "get_recaudo_mensual_historico",
        { p_empresa_id: activeCompany.id }
      );
      if (rpcError) console.error("Error RPC recaudo:", rpcError);

      // 2. Obtener contratos con cuotas para calcular mora global
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          plan_pagos (
            id,
            numero_cuota,
            fecha_vencimiento,
            monto_cuota,
            monto_pagado,
            monto_interes_mora,
            estado
          )
        `)
        .eq("empresa_id", activeCompany.id);

      if (contratosError) throw contratosError;

      // 3. Obtener proyecciones registradas
      const { data: proyecciones, error: proyError } = await supabase
        .from("proyecciones_recaudo")
        .select("*")
        .eq("empresa_id", activeCompany.id)
        .order("anio", { ascending: true })
        .order("mes", { ascending: true });

      if (proyError) throw proyError;

      // 4. Calcular mora global
      let totalVencido = 0;
      let interesesMoraTotal = 0;
      let cuotasVencidasCount = 0;
      const contratosConMoraSet = new Set<string>();

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      (contratos || []).forEach((ct: any) => {
        let contratoTieneMora = false;
        (ct.plan_pagos || []).forEach((cp: any) => {
          const saldo = Math.max(0, Number(cp.monto_cuota || 0) - Number(cp.monto_pagado || 0));
          const mora = Number(cp.monto_interes_mora || 0);
          interesesMoraTotal += mora;

          const venc = new Date(cp.fecha_vencimiento);
          venc.setHours(0, 0, 0, 0);

          if (saldo > 0 && (venc < hoy || cp.estado === "Vencido")) {
            totalVencido += saldo;
            cuotasVencidasCount++;
            contratoTieneMora = true;
          }
        });

        if (contratoTieneMora) {
          contratosConMoraSet.add(ct.id);
        }
      });

      setGlobalMora({
        totalVencido,
        interesesMoraTotal,
        cuotasVencidasCount,
        contratosConMoraCount: contratosConMoraSet.size,
      });

      // 5. Determinar recaudo del mes actual según RPC exacto
      const mesActualRPC = (recaudoHistorico || []).find(
        (r: any) => Number(r.anio) === currentYear && Number(r.mes) === currentMonth
      );
      const recaudoMesActual = Number(mesActualRPC?.total_recaudado) || 0;
      const totalRecibos = Number(mesActualRPC?.total_recibos) || 0;

      // Determinar la meta del mes actual
      const proyActual = (proyecciones || []).find(
        (p: any) => Number(p.mes) === currentMonth && Number(p.anio) === currentYear
      );

      const metaMes = proyActual?.valor_proyectado || 0;
      const pctMes = metaMes > 0 ? Math.min(100, Math.round((recaudoMesActual / metaMes) * 100)) : (recaudoMesActual > 0 ? 100 : 0);

      setCurrentMonthMetric({
        meta: metaMes,
        recaudado: recaudoMesActual,
        porcentaje: pctMes,
        totalRecibos,
        proyeccionId: proyActual?.id || null,
      });
      setNewMetaValue(metaMes ? String(metaMes) : "");

      // 6. Histórico consolidado (últimos 12 meses)
      const last12 = (recaudoHistorico || []).slice(0, 12).map((r: any) => {
        const proy = (proyecciones || []).find(
          (p: any) => Number(p.mes) === Number(r.mes) && Number(p.anio) === Number(r.anio)
        );
        const meta = Number(proy?.valor_proyectado) || 0;
        const rec = Number(r.total_recaudado) || 0;
        const pct = meta > 0 ? Math.round((rec / meta) * 100) : (rec > 0 ? 100 : 0);

        return {
          mes: Number(r.mes),
          anio: Number(r.anio),
          mesNombre: MONTH_NAMES[(Number(r.mes) || 1) - 1],
          meta,
          recaudado: rec,
          porcentaje: pct,
        };
      });

      setHistoricalData(last12);
    } catch (error) {
      console.error("Error fetching cartera metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [activeCompany?.id]);

  const handleSaveMeta = async () => {
    const val = Number(newMetaValue);
    if (isNaN(val) || val < 0) return;

    const supabase = createClient();
    try {
      if (currentMonthMetric.proyeccionId) {
        await (supabase.from("proyecciones_recaudo") as any)
          .update({ valor_proyectado: val })
          .eq("id", currentMonthMetric.proyeccionId);
      } else {
        const { data } = await (supabase.from("proyecciones_recaudo") as any).insert({
          empresa_id: activeCompany.id,
          mes: currentMonth,
          anio: currentYear,
          valor_proyectado: val,
        }).select().single();

        if (data) {
          setCurrentMonthMetric((prev) => ({ ...prev, proyeccionId: data.id }));
        }
      }

      setEditingMeta(false);
      fetchMetrics();
    } catch (error) {
      console.error("Error saving meta:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Cargando métricas de recaudo mensual...</span>
      </div>
    );
  }

  const mesActualNombre = MONTH_NAMES[currentMonth - 1];

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Top Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-bold text-foreground">
              Metas de Recaudo Mensual ({mesActualNombre} {currentYear})
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seguimiento de cumplimiento financiero y control de cartera de {activeCompany.name}.
          </p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground self-start sm:self-auto border border-border px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
        >
          <span>{showHistory ? "Ocultar comparativa mensual" : "Ver histórico de meses"}</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Meta del Mes */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2 relative group">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Meta de Recaudo</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          {editingMeta ? (
            <div className="space-y-2">
              <input
                type="number"
                value={newMetaValue}
                onChange={(e) => setNewMetaValue(e.target.value)}
                className="w-full text-sm font-bold border border-primary rounded px-2 py-1 bg-background"
                placeholder="Valor meta en $"
                autoFocus
              />
              <div className="flex gap-2 text-xs">
                <button
                  onClick={handleSaveMeta}
                  className="bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingMeta(false)}
                  className="text-muted-foreground hover:text-foreground px-2 py-0.5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatCOP(currentMonthMetric.meta)}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Presupuesto {mesActualNombre}</span>
                <button
                  onClick={() => setEditingMeta(true)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  Editar meta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Recaudado Real */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Recaudo Real Mes</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCOP(currentMonthMetric.recaudado)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>{currentMonthMetric.totalRecibos} recibos en {mesActualNombre}</span>
            {onViewSeptemberReceipts && (
              <button
                type="button"
                onClick={onViewSeptemberReceipts}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors text-[10px]"
              >
                <span>Ver recibos</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: % Cumplimiento */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Cumplimiento de Meta</span>
            <span className={`text-xs font-bold ${
              currentMonthMetric.porcentaje >= 100
                ? "text-emerald-500"
                : currentMonthMetric.porcentaje >= 60
                ? "text-amber-500"
                : "text-primary"
            }`}>
              {currentMonthMetric.porcentaje}%
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                currentMonthMetric.porcentaje >= 100
                  ? "bg-emerald-500"
                  : currentMonthMetric.porcentaje >= 60
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, currentMonthMetric.porcentaje)}%` }}
            />
          </div>

          <div className="text-[11px] text-muted-foreground">
            {currentMonthMetric.meta > 0
              ? currentMonthMetric.recaudado >= currentMonthMetric.meta
                ? "¡Meta mensual alcanzada!"
                : `Faltan ${formatCOP(currentMonthMetric.meta - currentMonthMetric.recaudado)}`
              : "Defina una meta para medir avance"}
          </div>
        </div>

        {/* Card 4: Cartera en Mora Global */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-destructive font-medium">
            <span>Cartera Vencida Empresa</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-destructive">
            {formatCOP(globalMora.totalVencido)}
          </div>
          <div className="text-[11px] text-muted-foreground flex justify-between">
            <span>{globalMora.cuotasVencidasCount} cuota(s) vencida(s)</span>
            <span>{globalMora.contratosConMoraCount} cliente(s)</span>
          </div>
        </div>

      </div>

      {/* Historical Breakdown Accordion */}
      {showHistory && (
        <div className="border border-border rounded-lg overflow-hidden animate-in fade-in duration-300">
          <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Desglose Comparativo Mensual ({currentYear})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Valores calculados de proyecciones y bitácora
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Mes</th>
                  <th className="px-4 py-2.5 text-right">Meta Proyectada</th>
                  <th className="px-4 py-2.5 text-right">Recaudo Efectivo</th>
                  <th className="px-4 py-2.5 text-center">Cumplimiento</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historicalData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                      No hay meses registrados en proyecciones para esta empresa.
                    </td>
                  </tr>
                ) : (
                  historicalData.map((h, i) => (
                    <tr key={i} className={`hover:bg-muted/20 ${h.mes === currentMonth ? "bg-primary/5 font-medium" : ""}`}>
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        {h.mesNombre} {h.anio}
                        {h.mes === currentMonth && (
                          <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                            Actual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatCOP(h.meta)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCOP(h.recaudado)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="font-bold">{h.porcentaje}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            h.porcentaje >= 100
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : h.porcentaje >= 50
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {h.porcentaje >= 100 ? "Cumplida" : h.porcentaje >= 50 ? "En curso" : "Por debajo"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
