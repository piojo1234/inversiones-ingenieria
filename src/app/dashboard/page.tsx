"use client";

import React, { useEffect, useState } from "react";
import { CollectionChart } from "@/components/collection-chart";
import { MetricsGrid } from "@/components/metrics-grid";
import { TrendingUp, AlertTriangle, ArrowUpRight, DollarSign, Loader2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    expectativa: 0,
    recaudadoReal: 0,
    montoMora: 0,
    montoRecuperado: 0
  });

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const supabase = createClient();
      
      const today = new Date();
      // En JS los meses van de 0 a 11, entonces verificamos mes actual y año
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      try {
        // Query plan_pagos joined with contratos to filter by empresa_id
        const { data: pagos, error } = await supabase
          .from('plan_pagos')
          .select('*, contratos!inner(empresa_id)')
          .eq('contratos.empresa_id', activeCompany.id);

        if (error) throw error;

        let expectativa = 0;
        let recaudadoReal = 0;
        let montoMora = 0;
        let montoRecuperado = 0;

        if (pagos) {
          (pagos as any[]).forEach(pago => {
            const date = new Date(pago.fecha_vencimiento);
            // Date parsing workaround for UTC vs Local consistency
            const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            const isCurrentMonth = utcDate.getMonth() === currentMonth && utcDate.getFullYear() === currentYear;

            const montoCuota = Number(pago.monto_cuota || 0);
            const montoPagado = Number(pago.monto_pagado || 0);
            const montoInteresMora = Number(pago.monto_interes_mora || 0);

            // 1. Expectativa Mensual: Sum monto_cuota for current month
            if (isCurrentMonth) {
              expectativa += montoCuota;
            }

            // 2. Recaudado Real: Sum monto_pagado for current month
            if (isCurrentMonth) {
              recaudadoReal += montoPagado;
            }

            // 3. Monto en Mora: Sum (monto_cuota - monto_pagado) + monto_interes_mora for 'Vencido'
            if (pago.estado === 'Vencido') {
              montoMora += (montoCuota - montoPagado) + montoInteresMora;
            }

            // 4. Mora Recuperada: Sum monto_interes_mora where estado is 'Pagado'
            if (pago.estado === 'Pagado') {
              montoRecuperado += montoInteresMora;
            }
          });
        }

        setMetrics({
          expectativa,
          recaudadoReal,
          montoMora,
          montoRecuperado
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (activeCompany?.id) {
      fetchDashboardData();
    }
  }, [activeCompany]);

  const recaudoProgress = metrics.expectativa > 0 ? (metrics.recaudadoReal / metrics.expectativa) * 100 : 0;
  const moraProgress = metrics.montoMora > 0 ? (metrics.montoRecuperado / metrics.montoMora) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Financiero</h1>
        <p className="text-muted-foreground mt-1">Resumen de operaciones para {activeCompany.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Expectativa Mensual</span>
            <div className="p-2 bg-primary/10 rounded-md">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">${metrics.expectativa.toLocaleString('es-CO')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Cuotas programadas este mes</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Recaudado Real</span>
            <div className="p-2 bg-emerald-500/10 rounded-md">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">${metrics.recaudadoReal.toLocaleString('es-CO')}</h2>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> Abonos del mes actual
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monto en Mora</span>
            <div className="p-2 bg-destructive/10 rounded-md">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">${metrics.montoMora.toLocaleString('es-CO')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Capital vencido + Interés Mora</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Mora Recuperada</span>
            <div className="p-2 bg-tertiary/10 rounded-md">
              <ArrowUpRight className="w-4 h-4 text-tertiary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">${metrics.montoRecuperado.toLocaleString('es-CO')}</h2>
            <p className="text-xs text-muted-foreground mt-1">Interés cobrado pagado</p>
          </div>
        </div>
      </div>

      {/* Progress Bars Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4 flex justify-between">
            <span>Barra de Recaudo Mensual</span>
            <span className="text-primary font-bold">{recaudoProgress.toFixed(1)}%</span>
          </h3>
          <div className="w-full bg-muted rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-primary h-4 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(recaudoProgress, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${metrics.recaudadoReal.toLocaleString('es-CO')} (Real)</span>
            <span>${metrics.expectativa.toLocaleString('es-CO')} (Meta)</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4 flex justify-between">
            <span>Recuperación de Cartera en Mora</span>
            <span className="text-destructive font-bold">{moraProgress.toFixed(1)}%</span>
          </h3>
          <div className="w-full bg-muted rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-destructive h-4 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(moraProgress, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${metrics.montoRecuperado.toLocaleString('es-CO')} (Recuperado)</span>
            <span>${metrics.montoMora.toLocaleString('es-CO')} (Total en Mora)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CollectionChart />
        </div>
        <div className="lg:col-span-1">
          <MetricsGrid />
        </div>
      </div>
    </div>
  );
}
