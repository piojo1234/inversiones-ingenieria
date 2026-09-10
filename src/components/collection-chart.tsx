"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function CollectionChart() {
  const { activeCompany } = useCompany();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      const supabase = createClient();

      try {
        const { data: proyecciones, error } = await supabase
          .from('proyecciones_recaudo')
          .select('*')
          .eq('empresa_id', activeCompany.id)
          .order('anio', { ascending: true })
          .order('mes', { ascending: true });

        if (error) throw error;

        if (proyecciones && proyecciones.length > 0) {
          setData((proyecciones as any[]).map(p => ({
            name: MONTH_LABELS[(p.mes || 1) - 1],
            expectativa: p.valor_proyectado,
            recaudado: p.valor_historico_calculado || 0,
          })));
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, [activeCompany.id]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col h-[400px]">
      <div className="mb-4">
        <h3 className="text-lg font-heading font-semibold">Proyección vs Recaudo Real</h3>
        <p className="text-sm text-muted-foreground">Histórico de {activeCompany.name}</p>
      </div>
      <div className="flex-1 w-full h-full min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No hay proyecciones registradas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="recaudado" name="Recaudo Real" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="expectativa" name="Expectativa" stroke="hsl(var(--tertiary))" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
