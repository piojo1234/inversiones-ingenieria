"use client";

import React, { useEffect, useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";
import { Users, Search, Plus, Edit2, Loader2, Building, User } from "lucide-react";
import { ClientModal, ClientData } from "@/components/client-modal";

export default function ClientesPage() {
  const { activeCompany } = useCompany();
  const [clientes, setClientes] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null);

  const fetchClientes = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [activeCompany]);

  const filteredClientes = clientes.filter(c => 
    c.nombre_razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.documento.includes(searchTerm)
  );

  const handleCreate = () => {
    setClientToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: ClientData) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleSave = (savedClient: ClientData) => {
    // If it exists, update it, otherwise add it to the top
    setClientes(prev => {
      const exists = prev.find(c => c.id === savedClient.id);
      if (exists) {
        return prev.map(c => c.id === savedClient.id ? savedClient : c);
      }
      return [savedClient, ...prev];
    });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Gestión de Clientes</h1>
          <p className="text-muted-foreground mt-1">Administra la base de datos de personas naturales y jurídicas.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Crear Cliente
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col flex-1 min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredClientes.length} registros encontrados
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center min-h-[400px] text-center p-6">
              <Users className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium text-foreground">No se encontraron clientes</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {searchTerm ? "Intenta con otros términos de búsqueda." : "Comienza agregando un cliente nuevo."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Documento / NIT</th>
                  <th className="px-6 py-4 font-medium">Contacto</th>
                  <th className="px-6 py-4 font-medium">Representante</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${cliente.tipo_persona === 'Juridica' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {cliente.tipo_persona === 'Juridica' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{cliente.nombre_razon_social}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{cliente.tipo_persona}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {cliente.documento}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{cliente.telefono}</div>
                      <div className="text-[11px] text-muted-foreground">{cliente.correo}</div>
                    </td>
                    <td className="px-6 py-4">
                      {cliente.tipo_persona === 'Juridica' ? (
                        <div>
                          <div className="text-foreground">{cliente.rep_legal_nombre || "N/A"}</div>
                          <div className="text-[11px] text-muted-foreground">{cliente.rep_legal_documento}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(cliente)}
                        className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />
    </div>
  );
}
