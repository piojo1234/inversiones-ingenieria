"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { Box, Home, MapPin, Search, Loader2, Plus, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'Disponible' | 'Vendido'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const fetchInmuebles = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // 1. Fetch proyectos for this company
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('proyectos')
        .select('id')
        .eq('empresa_id', activeCompany.id);
        
      if (proyectosError) throw proyectosError;
      
      const proyectoIds = (proyectosData || []).map(p => p.id);
      
      if (proyectoIds.length === 0) {
        setInmuebles([]);
        return;
      }
      
      // 2. Fetch inmuebles for these proyectos
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .in('proyecto_id', proyectoIds);

      if (error) throw error;
      
      if (data) {
        // Natural sort by identificador
        const sorted = (data as unknown as Inmueble[]).sort((a, b) => 
          a.identificador.localeCompare(b.identificador, undefined, { numeric: true, sensitivity: 'base' })
        );
        setInmuebles(sorted);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.id) {
      setCurrentPage(1);
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

  // KPIs
  const totalCount = inmuebles.length;
  const vendidasCount = inmuebles.filter(i => i.estado === 'Vendido' || i.estado === 'Escriturado').length;
  const disponiblesCount = inmuebles.filter(i => i.estado === 'Disponible').length;
  const valorTotalInventario = inmuebles.reduce((acc, curr) => acc + (Number(curr.precio_venta) || 0), 0);

  const filteredInmuebles = inmuebles.filter(item => {
    const matchesSearch = item.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estado.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'Disponible') return item.estado === 'Disponible';
    if (statusFilter === 'Vendido') return item.estado === 'Vendido' || item.estado === 'Escriturado';
    return true;
  });

  const totalPages = Math.ceil(filteredInmuebles.length / itemsPerPage);
  const paginatedInmuebles = filteredInmuebles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Inventario Físico</h1>
          <p className="text-muted-foreground mt-1">
            Proyecto activo: <span className="font-semibold text-foreground">{activeCompany.project}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleOpenNew}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Inmueble
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Unidades</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-foreground">{totalCount}</span>
            <span className="text-xs font-medium text-muted-foreground">Lotes registrados</span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Disponibles</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{disponiblesCount}</span>
            <span className="text-xs font-medium text-emerald-600/80">
              {totalCount > 0 ? ((disponiblesCount / totalCount) * 100).toFixed(1) : 0}% del total
            </span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Vendidos / Escriturados</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-foreground">{vendidasCount}</span>
            <span className="text-xs font-medium text-primary">
              {totalCount > 0 ? ((vendidasCount / totalCount) * 100).toFixed(1) : 0}% vendido
            </span>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Total Portafolio</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-foreground">${(valorTotalInventario / 1e9).toFixed(2)}B</span>
            <span className="text-xs text-muted-foreground">COP</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-lg border border-border">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'all' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => { setStatusFilter('Disponible'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'Disponible' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Disponibles ({disponiblesCount})
          </button>
          <button
            onClick={() => { setStatusFilter('Vendido'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'Vendido' 
                ? 'bg-destructive text-destructive-foreground shadow-xs' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Vendidos ({vendidasCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por lote o estado..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9 pr-4 py-1.5 border border-border bg-background rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full"
          />
        </div>
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedInmuebles.map((item) => {
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredInmuebles.length)}
              </span>{" "}
              de <span className="font-semibold text-foreground">{filteredInmuebles.length}</span> inmuebles
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>
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
