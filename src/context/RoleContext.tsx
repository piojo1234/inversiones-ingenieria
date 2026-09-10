"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Role = "Super Admin" | "Cartera";

interface RoleContextType {
  /** Rol leído de la tabla `perfiles`. No se puede cambiar desde la interfaz. */
  activeRole: Role;
  /** Nombre del usuario según su perfil, para mostrarlo en la cabecera. */
  nombre: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

/**
 * Hasta que la base de datos confirme el rol se asume el más restringido.
 * Si la consulta falla, el usuario se queda en Cartera: nunca al revés.
 */
const ROL_POR_DEFECTO: Role = "Cartera";

const ROLES_VALIDOS: Role[] = ["Super Admin", "Cartera"];

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<Role>(ROL_POR_DEFECTO);
  const [nombre, setNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function cargarPerfil() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || cancelado) return;

        const { data, error } = await supabase
          .from("perfiles")
          .select("nombre, rol")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelado) return;

        if (error) {
          console.error("No se pudo leer el perfil del usuario:", error.message);
          return;
        }

        if (data?.rol && ROLES_VALIDOS.includes(data.rol as Role)) {
          setActiveRole(data.rol as Role);
        }
        setNombre(data?.nombre ?? null);
      } catch (err) {
        console.error("Fallo al cargar el perfil del usuario:", err);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarPerfil();

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        nombre,
        loading,
        isSuperAdmin: activeRole === "Super Admin",
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
