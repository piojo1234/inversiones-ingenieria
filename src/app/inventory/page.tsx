"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { Box, Home, MapPin, Search, Loader2, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InmuebleModal, InmuebleData } from "@/components/inmueble-modal";

interface Inmueble {
  id: string;
  identificador: string;
  precio_venta: number;
  area_m2: number;
  estado: 'Disponible' | 'Reservado' | 'Vendido' | 'Arrendado' | string;
  proyecto_id: string;
  matricula_inmobiliaria: string;
  cedula_catastral: string;
  linderos: string;
  tradicion: string;
}

export default function InventoryPage() {
  const { activeCompany } = useCompany();
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inmuebleToEdit, setInmuebleToEdit] = useState<InmuebleData | null>(null);

  const fetchInmuebles = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*, proyectos!inner(empresa_id)')
        .eq('proyectos.empresa_id', activeCompany.id)
        .order('identificador', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setInmuebles(data as unknown as Inmueble[]);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.id) {
      fetchInmuebles();
    }
  }, [activeCompany]);

  const handleOpenNew = () => {
    setInmuebleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inmueble: Inmueble) => {
    setInmuebleToEdit(inmueble as unknown as InmuebleData);
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    fetchInmuebles(); // Refresh list after save
  };

  const filteredInmuebles = inmuebles.filter(item => 
    item.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.estado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Inventario Físico</h1>
          <p className="text-muted-foreground mt-1">
            Proyecto activo: <span className="font-semibold text-foreground">{activeCompany.project}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar unidad..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full"
          />
        </div>
        </div>
        <button
          onClick={handleOpenNew}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Inmueble
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredInmuebles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-lg p-12 text-center">
          <Box className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No se encontraron inmuebles</h3>
          <p className="text-muted-foreground">La base de datos no arrojó resultados para esta empresa o filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInmuebles.map((item) => {
            const isLote = item.identificador.toLowerCase().includes('lote');
            
            return (
              <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col hover:border-primary/50 transition-colors group">
                <div className="h-32 bg-muted/50 flex items-center justify-center border-b border-border relative">
                  {isLote ? (
                    <MapPin className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
                  ) : (
                    <Home className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
                  )}
                  
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                      className="bg-background/80 backdrop-blur-sm p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-background transition-colors shadow-sm"
                      title="Editar Inmueble"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm ${
                      item.estado === 'Disponible' ? 'bg-emerald-500/10 text-emerald-500' :
                      item.estado === 'Vendido' ? 'bg-destructive/10 text-destructive' :
                      item.estado === 'Reservado' ? 'bg-amber-500/10 text-amber-500' :
                      item.estado === 'Escriturado' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {item.estado}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg truncate pr-2" title={item.identificador}>
                      {item.identificador}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-sm shrink-0">
                      {isLote ? 'Lote' : 'Construcción'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Área</p>
                      <p className="font-medium text-sm">{item.area_m2} m²</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                      <p className="font-medium text-sm">${item.precio_venta.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InmuebleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        inmuebleToEdit={inmuebleToEdit}
      />
    </div>
  );
}
