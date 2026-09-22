/**
 * Utilidades financieras para el módulo de Cartera y Portafolio
 */

export interface CuotaCartera {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_cuota: number;
  monto_pagado: number | null;
  monto_interes_mora: number | null;
  estado: string | null;
  tipo_cuota?: string | null;
}

/**
 * Calcula los días de mora transcurridos desde la fecha de vencimiento hasta hoy.
 * Si la cuota no ha vencido, retorna 0.
 */
export function calcularDiasMora(fechaVencimiento: string): number {
  if (!fechaVencimiento) return 0;
  
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffTime = hoy.getTime() - vencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Calcula el interés de mora para una cuota vencida.
 * Fórmula financiera estándar:
 * Saldo Pendiente * (Tasa Mensual % / 30 días) * Días de Mora
 */
export function calcularInteresMoraCuota(
  montoCuota: number,
  montoPagado: number = 0,
  tasaMensualPct: number = 2.5,
  fechaVencimiento: string
): number {
  const saldoCapital = Math.max(0, montoCuota - (montoPagado || 0));
  if (saldoCapital <= 0) return 0;

  const dias = calcularDiasMora(fechaVencimiento);
  if (dias <= 0) return 0;

  // Tasa diaria simple
  const tasaDiaria = (tasaMensualPct / 100) / 30;
  const interes = saldoCapital * tasaDiaria * dias;

  return Math.round(interes);
}

/**
 * Calcula los totales consolidados de un plan de pagos y el progreso respecto al valor total.
 */
export function calcularProgresoContrato(cuotas: CuotaCartera[], valorTotalContrato: number) {
  const totalCuotas = cuotas.length;
  let cuotasPagadas = 0;
  let cuotasVencidas = 0;
  let cuotasPendientes = 0;

  let totalCapitalPagado = 0;
  let totalMoraAcumulada = 0;
  let totalSaldoVencido = 0;
  let totalSaldoPorVencer = 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  cuotas.forEach((c) => {
    const cuotaMonto = Number(c.monto_cuota) || 0;
    const pagado = Number(c.monto_pagado) || 0;
    const mora = Number(c.monto_interes_mora) || 0;
    const saldo = Math.max(0, cuotaMonto - pagado);
    const vencimiento = new Date(c.fecha_vencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    totalCapitalPagado += pagado;
    totalMoraAcumulada += mora;

    if (saldo <= 0 || c.estado === 'Pagado') {
      cuotasPagadas++;
    } else {
      if (vencimiento < hoy || c.estado === 'Vencido') {
        cuotasVencidas++;
        totalSaldoVencido += saldo;
      } else {
        cuotasPendientes++;
        totalSaldoPorVencer += saldo;
      }
    }
  });

  const baseTotal = valorTotalContrato > 0 ? valorTotalContrato : (totalCapitalPagado + totalSaldoVencido + totalSaldoPorVencer);
  const saldoCapitalTotal = Math.max(0, baseTotal - totalCapitalPagado);

  const porcentajePagado = baseTotal > 0 ? Math.min(100, Math.round((totalCapitalPagado / baseTotal) * 100)) : 0;
  const porcentajeVencido = baseTotal > 0 ? Math.min(100, Math.round((totalSaldoVencido / baseTotal) * 100)) : 0;
  const porcentajePorVencer = Math.max(0, 100 - porcentajePagado - porcentajeVencido);

  const totalExigibleHoy = totalSaldoVencido + totalMoraAcumulada;

  return {
    totalCuotas,
    cuotasPagadas,
    cuotasVencidas,
    cuotasPendientes,
    totalCapitalPagado,
    saldoCapitalTotal,
    totalSaldoVencido,
    totalSaldoPorVencer,
    totalMoraAcumulada,
    totalExigibleHoy,
    baseTotal,
    porcentajePagado,
    porcentajeVencido,
    porcentajePorVencer,
  };
}

/**
 * Formatea un número a pesos colombianos sin decimales
 */
export function formatCOP(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}
