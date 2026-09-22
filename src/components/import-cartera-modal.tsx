import React, { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface ImportCarteraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contracts: Array<{
    id: string;
    clienteNombre: string;
    clienteId: string | null;
    inmuebleLabel: string;
  }>;
  currentUserId: string | null;
}

export function ImportCarteraModal({ isOpen, onClose, onSuccess, contracts, currentUserId }: ImportCarteraModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const processExcel = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResults(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

      let successCount = 0;
      const errors: string[] = [];
      const supabase = createClient();

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        try {
          // Buscamos columnas clave comunes en español
          const cedula = row['Cédula'] || row['Cedula'] || row['Documento'] || row['NIT'] || row['Identificacion'];
          const monto = Number(row['Valor'] || row['Monto'] || row['Pago'] || row['Abono']);
          const cuotaStr = row['Cuota'] || row['Numero Cuota'] || row['# Cuota'];
          const notas = row['Notas'] || row['Observacion'] || row['Concepto'] || '';
          
          if (!cedula || !monto) {
            errors.push(`Fila ${index + 2}: Faltan campos requeridos (Cédula o Monto)`);
            continue;
          }

          // 1. Encontrar al cliente por documento
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('id')
            .eq('documento', String(cedula).trim())
            .single();

          if (clienteError || !clienteData) {
            errors.push(`Fila ${index + 2}: Cliente con documento ${cedula} no encontrado en base de datos`);
            continue;
          }

          // 2. Encontrar el contrato de este cliente
          const targetContract = contracts.find(c => c.clienteId === clienteData.id);
          
          if (!targetContract) {
            errors.push(`Fila ${index + 2}: No se encontró un contrato activo para el cliente ${cedula}`);
            continue;
          }

          // 3. Encontrar la cuota pendiente (si envían # de cuota buscamos esa, si no, la más antigua pendiente)
          let query = supabase
            .from('plan_pagos')
            .select('*')
            .eq('contrato_id', targetContract.id)
            .neq('estado', 'Pagado')
            .order('numero_cuota', { ascending: true });

          if (cuotaStr) {
             query = query.eq('numero_cuota', Number(cuotaStr));
          }

          const { data: cuotas, error: cuotasError } = await query.limit(1);

          if (cuotasError || !cuotas || cuotas.length === 0) {
            errors.push(`Fila ${index + 2}: No hay cuotas pendientes o la cuota #${cuotaStr} ya está pagada para el contrato de ${cedula}`);
            continue;
          }

          const cuota = cuotas[0];
          const nuevoMontoPagado = Number(cuota.monto_pagado || 0) + monto;
          const updateData: any = { monto_pagado: nuevoMontoPagado };
          
          if (nuevoMontoPagado >= cuota.monto_cuota) {
            updateData.estado = 'Pagado';
          }

          // Actualizar plan de pagos
          await supabase.from('plan_pagos').update(updateData).eq('id', cuota.id);

          // Registrar en bitácora de pagos
          await supabase.from('pagos_bitacora').insert({
            plan_pagos_id: cuota.id,
            monto_pagado: monto,
            metodo_pago: 'Transferencia', // Por defecto si viene de Excel externo
            registrado_por: currentUserId,
          });

          // Agregar nota en cartera
          await supabase.from('gestion_cartera').insert({
            contrato_id: targetContract.id,
            cliente_id: clienteData.id,
            bitacora_notas: `Pago importado desde Excel: $${monto.toLocaleString('es-CO')} a la cuota #${cuota.numero_cuota}. ${notas}`,
            registrado_por: currentUserId,
          });

          successCount++;
        } catch (err: any) {
          errors.push(`Fila ${index + 2}: Error de procesamiento - ${err.message}`);
        }
      }

      setResults({ success: successCount, errors });
      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      setResults({ success: 0, errors: ["Error al leer el archivo Excel: " + error.message] });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            Importar Cartera desde Excel
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!results ? (
            <div className="flex flex-col gap-6">
              <div className="bg-muted/30 p-4 rounded-md border border-border/50 text-sm">
                <p className="font-semibold mb-2">Formato esperado del archivo (.xlsx o .csv):</p>
                <p className="text-muted-foreground mb-2">
                  El sistema buscará automáticamente las siguientes columnas (no importa el orden):
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li><strong>Documento/Cédula/NIT:</strong> Requerido. Para identificar al cliente.</li>
                  <li><strong>Monto/Valor/Pago:</strong> Requerido. El valor en números del pago.</li>
                  <li><strong>Cuota (Opcional):</strong> Número de cuota a afectar. Si se omite, se aplica a la primera vencida.</li>
                  <li><strong>Notas/Concepto (Opcional):</strong> Observaciones del pago.</li>
                </ul>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  file ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:bg-muted/50 hover:border-primary/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                
                {file ? (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button className="text-xs text-primary underline mt-2" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      Cambiar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">Haz clic para seleccionar el archivo</p>
                      <p className="text-xs text-muted-foreground mt-1">Soporta .XLSX, .XLS o .CSV</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 text-emerald-700 border border-emerald-200 rounded-md">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Proceso finalizado</h3>
                  <p className="text-sm">{results.success} pagos importados y registrados correctamente.</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-destructive">
                    <AlertCircle className="w-4 h-4" /> 
                    Errores durante la importación ({results.errors.length})
                  </h4>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 max-h-48 overflow-y-auto">
                    <ul className="text-xs space-y-2 font-mono text-destructive/80">
                      {results.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-border hover:bg-muted rounded-md text-sm font-medium transition-colors"
          >
            {results ? 'Cerrar' : 'Cancelar'}
          </button>
          
          {!results && (
            <button 
              onClick={processExcel}
              disabled={!file || isProcessing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                'Importar Pagos'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
