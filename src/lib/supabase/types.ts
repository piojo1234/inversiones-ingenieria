export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string
          nombre: string
          rol: 'Super Admin' | 'Cartera'
          created_at: string
        }
        Insert: {
          id: string
          nombre: string
          rol: 'Super Admin' | 'Cartera'
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          rol?: 'Super Admin' | 'Cartera'
          created_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          id: string
          nit: string
          nombre: string
          logo_url: string | null
          telefono: string | null
          direccion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nit: string
          nombre: string
          logo_url?: string | null
          telefono?: string | null
          direccion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nit?: string
          nombre?: string
          logo_url?: string | null
          telefono?: string | null
          direccion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      perfiles_empresas: {
        Row: {
          perfil_id: string
          empresa_id: string
          created_at: string
        }
        Insert: {
          perfil_id: string
          empresa_id: string
          created_at?: string
        }
        Update: {
          perfil_id?: string
          empresa_id?: string
          created_at?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          id: string
          empresa_id: string | null
          nombre: string
          tipo: string
          ubicacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          nombre: string
          tipo: string
          ubicacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          nombre?: string
          tipo?: string
          ubicacion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      inmuebles: {
        Row: {
          id: string
          proyecto_id: string | null
          identificador: string
          precio_venta: number | null
          canon_arriendo: number | null
          estado: 'Disponible' | 'Reservado' | 'Vendido' | 'Arrendado' | null
          created_at: string
          area_m2: number | null
          matricula_inmobiliaria: string | null
          cedula_catastral: string | null
          linderos: string | null
          tradicion: string | null
        }
        Insert: {
          id?: string
          proyecto_id?: string | null
          identificador: string
          precio_venta?: number | null
          canon_arriendo?: number | null
          estado?: 'Disponible' | 'Reservado' | 'Vendido' | 'Arrendado' | null
          created_at?: string
          area_m2?: number | null
          matricula_inmobiliaria?: string | null
          cedula_catastral?: string | null
          linderos?: string | null
          tradicion?: string | null
        }
        Update: {
          id?: string
          proyecto_id?: string | null
          identificador?: string
          precio_venta?: number | null
          canon_arriendo?: number | null
          estado?: 'Disponible' | 'Reservado' | 'Vendido' | 'Arrendado' | null
          created_at?: string
          area_m2?: number | null
          matricula_inmobiliaria?: string | null
          cedula_catastral?: string | null
          linderos?: string | null
          tradicion?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: string
          tipo_persona: 'Natural' | 'Juridica'
          documento: string
          nombre_razon_social: string
          rep_legal_nombre: string | null
          rep_legal_documento: string | null
          correo: string
          telefono: string
          direccion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo_persona: 'Natural' | 'Juridica'
          documento: string
          nombre_razon_social: string
          rep_legal_nombre?: string | null
          rep_legal_documento?: string | null
          correo: string
          telefono: string
          direccion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo_persona?: 'Natural' | 'Juridica'
          documento?: string
          nombre_razon_social?: string
          rep_legal_nombre?: string | null
          rep_legal_documento?: string | null
          correo?: string
          telefono?: string
          direccion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      plantillas_contratos: {
        Row: {
          id: string
          empresa_id: string | null
          tipo_contrato: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          titulo_documento: string
          clausulas: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          tipo_contrato: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          titulo_documento: string
          clausulas: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          tipo_contrato?: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          titulo_documento?: string
          clausulas?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          id: string
          empresa_id: string | null
          inmueble_id: string | null
          tipo_contrato: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          fecha_inicio: string
          fecha_fin: string | null
          valor_total: number
          tiene_intereses: boolean | null
          tasa_interes_corriente: number | null
          tasa_interes_mora: number | null
          estado_firma: 'Pendiente' | 'PENDIENTE' | 'Borrador' | 'Firmado' | 'FIRMADO' | 'Cancelado' | null
          pdf_url: string | null
          created_at: string
          monto_cuota_inicial: number | null
          numero_cuotas_iniciales: number | null
          monto_cuota_ordinaria: number | null
          numero_cuotas_ordinarias: number | null
          tiene_cuotas_extraordinarias: boolean | null
          frecuencia_extraordinaria: string | null
          monto_cuota_extraordinaria: number | null
          numero_cuotas_extraordinarias: number | null
          dia_pago_mensual: number | null
          numero_factura: string | null
          fecha_factura: string | null
          numero_escritura: string | null
          fecha_escritura: string | null
          notaria_escritura: string | null
          estado_escrituracion: string | null
          observaciones_escrituracion: string | null
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          inmueble_id?: string | null
          tipo_contrato: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          fecha_inicio: string
          fecha_fin?: string | null
          valor_total: number
          tiene_intereses?: boolean | null
          tasa_interes_corriente?: number | null
          tasa_interes_mora?: number | null
          estado_firma?: 'Pendiente' | 'PENDIENTE' | 'Borrador' | 'Firmado' | 'FIRMADO' | 'Cancelado' | null
          pdf_url?: string | null
          created_at?: string
          monto_cuota_inicial?: number | null
          numero_cuotas_iniciales?: number | null
          monto_cuota_ordinaria?: number | null
          numero_cuotas_ordinarias?: number | null
          tiene_cuotas_extraordinarias?: boolean | null
          frecuencia_extraordinaria?: string | null
          monto_cuota_extraordinaria?: number | null
          numero_cuotas_extraordinarias?: number | null
          dia_pago_mensual?: number | null
          numero_factura?: string | null
          fecha_factura?: string | null
          numero_escritura?: string | null
          fecha_escritura?: string | null
          notaria_escritura?: string | null
          estado_escrituracion?: string | null
          observaciones_escrituracion?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string | null
          inmueble_id?: string | null
          tipo_contrato?: 'Compraventa' | 'Arrendamiento' | 'Servicios' | 'Corretaje'
          fecha_inicio?: string
          fecha_fin?: string | null
          valor_total?: number
          tiene_intereses?: boolean | null
          tasa_interes_corriente?: number | null
          tasa_interes_mora?: number | null
          estado_firma?: 'Pendiente' | 'PENDIENTE' | 'Borrador' | 'Firmado' | 'FIRMADO' | 'Cancelado' | null
          pdf_url?: string | null
          created_at?: string
          monto_cuota_inicial?: number | null
          numero_cuotas_iniciales?: number | null
          monto_cuota_ordinaria?: number | null
          numero_cuotas_ordinarias?: number | null
          tiene_cuotas_extraordinarias?: boolean | null
          frecuencia_extraordinaria?: string | null
          monto_cuota_extraordinaria?: number | null
          numero_cuotas_extraordinarias?: number | null
          dia_pago_mensual?: number | null
          numero_factura?: string | null
          fecha_factura?: string | null
          numero_escritura?: string | null
          fecha_escritura?: string | null
          notaria_escritura?: string | null
          estado_escrituracion?: string | null
          observaciones_escrituracion?: string | null
        }
        Relationships: []
      }
      contratantes_contrato: {
        Row: {
          id: string
          contrato_id: string | null
          cliente_id: string | null
          rol_contratante: 'Comprador Principal' | 'Co-propietario' | 'Arrendatario' | 'Deudor Solidario' | 'Contratista' | 'Consultor'
          firma_dibujo: string | null
          firma_timestamp: string | null
          firma_ip: string | null
          firma_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contrato_id?: string | null
          cliente_id?: string | null
          rol_contratante: 'Comprador Principal' | 'Co-propietario' | 'Arrendatario' | 'Deudor Solidario' | 'Contratista' | 'Consultor'
          firma_dibujo?: string | null
          firma_timestamp?: string | null
          firma_ip?: string | null
          firma_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contrato_id?: string | null
          cliente_id?: string | null
          rol_contratante?: 'Comprador Principal' | 'Co-propietario' | 'Arrendatario' | 'Deudor Solidario' | 'Contratista' | 'Consultor'
          firma_dibujo?: string | null
          firma_timestamp?: string | null
          firma_ip?: string | null
          firma_hash?: string | null
          created_at?: string
        }
        Relationships: []
      }
      plan_pagos: {
        Row: {
          id: string
          contrato_id: string | null
          numero_cuota: number
          fecha_vencimiento: string
          monto_cuota: number
          monto_pagado: number | null
          monto_interes_mora: number | null
          estado: 'Pendiente' | 'Pagado' | 'Vencido' | null
          created_at: string
          tipo_cuota: string | null
        }
        Insert: {
          id?: string
          contrato_id?: string | null
          numero_cuota: number
          fecha_vencimiento: string
          monto_cuota: number
          monto_pagado?: number | null
          monto_interes_mora?: number | null
          estado?: 'Pendiente' | 'Pagado' | 'Vencido' | null
          created_at?: string
          tipo_cuota?: string | null
        }
        Update: {
          id?: string
          contrato_id?: string | null
          numero_cuota?: number
          fecha_vencimiento?: string
          monto_cuota?: number
          monto_pagado?: number | null
          monto_interes_mora?: number | null
          estado?: 'Pendiente' | 'Pagado' | 'Vencido' | null
          created_at?: string
          tipo_cuota?: string | null
        }
        Relationships: []
      }
      proyecciones_recaudo: {
        Row: {
          id: string
          empresa_id: string | null
          anio: number
          mes: number
          valor_proyectado: number
          valor_historico_calculado: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          anio: number
          mes: number
          valor_proyectado: number
          valor_historico_calculado?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          anio?: number
          mes?: number
          valor_proyectado?: number
          valor_historico_calculado?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pagos_bitacora: {
        Row: {
          id: string
          plan_pagos_id: string | null
          fecha_pago: string
          monto_pagado: number
          metodo_pago: 'Efectivo' | 'Transferencia' | 'Consignacion'
          soporte_url: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_pagos_id?: string | null
          fecha_pago?: string
          monto_pagado: number
          metodo_pago: 'Efectivo' | 'Transferencia' | 'Consignacion'
          soporte_url?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_pagos_id?: string | null
          fecha_pago?: string
          monto_pagado?: number
          metodo_pago?: 'Efectivo' | 'Transferencia' | 'Consignacion'
          soporte_url?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gestion_cartera: {
        Row: {
          id: string
          cliente_id: string | null
          contrato_id: string | null
          fecha_contacto: string
          bitacora_notas: string
          proxima_accion: string | null
          registrado_por: string | null
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          contrato_id?: string | null
          fecha_contacto?: string
          bitacora_notas: string
          proxima_accion?: string | null
          registrado_por?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string | null
          contrato_id?: string | null
          fecha_contacto?: string
          bitacora_notas?: string
          proxima_accion?: string | null
          registrado_por?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      empresas_del_usuario: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
