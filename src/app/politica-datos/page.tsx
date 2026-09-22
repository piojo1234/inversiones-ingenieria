"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  FileText, 
  ArrowLeft, 
  Printer, 
  Building2, 
  Mail, 
  MapPin, 
  Calendar,
  Lock,
  ExternalLink,
  Search
} from "lucide-react";
import { POLITICA_DATOS_INFO, POLITICA_DATOS_SECCIONES } from "@/lib/politica-datos-contenido";

export default function PoliticaDatosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<string>("identificacion");

  React.useEffect(() => {
    document.title = "Política de Tratamiento de Datos Personales | INVERSIONES INGENIERIA GC S.A.S";
  }, []);

  const filteredSections = POLITICA_DATOS_SECCIONES.filter(sec => 
    sec.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sec.contenido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Banner / Navigation */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Regresar a la página anterior"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm tracking-tight text-slate-900">Habeas Data & Privacidad</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ml-1">
                Consulta Pública
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-xs"
              title="Imprimir o Guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4 sm:px-6 border-b border-slate-700">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Marco Legal República de Colombia</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Política de Tratamiento y Protección de Datos Personales
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Régimen de protección de datos personales, Habeas Data y centrales de riesgo financiero 
            conforme a las Leyes 1581 de 2012, 1266 de 2008, Decreto 1377 de 2013 y Ley 2157 de 2021.
          </p>

          {/* Company Metadata Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-md">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{POLITICA_DATOS_INFO.empresa} (NIT: {POLITICA_DATOS_INFO.nit})</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-md">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{POLITICA_DATOS_INFO.domicilio}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Versión Vigente: {POLITICA_DATOS_INFO.fechaActualizacion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Quick Navigation */}
          <aside className="no-print lg:col-span-4 space-y-4">
            <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Índice del Documento</span>
                <span className="text-[11px] text-slate-500">{POLITICA_DATOS_SECCIONES.length} Secciones</span>
              </div>

              {/* Search in policy */}
              <div className="relative mt-3 mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en la política..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                />
              </div>

              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 text-xs">
                {POLITICA_DATOS_SECCIONES.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block py-1.5 px-2.5 rounded-md transition-colors leading-snug ${
                      activeSection === sec.id
                        ? "bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 pl-2"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {sec.titulo}
                  </a>
                ))}
              </nav>

              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Canal Habeas Data: <strong>{POLITICA_DATOS_INFO.correoHabeasData}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Supervisión: <strong>SIC de Colombia</strong></span>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs">
            {/* Header Callout */}
            <div className="mb-8 p-4 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950 mb-1">Aviso al Promitente Comprador y Titular de la Información</p>
                <p className="text-slate-700 leading-relaxed">
                  Al suscribir promesas de compraventa, títulos valores (pagarés) y autorizaciones de Habeas Data con <strong>{POLITICA_DATOS_INFO.empresa}</strong>, usted declara conocer y aceptar de manera previa, expresa e informada las disposiciones contenidas en este documento.
                </p>
              </div>
            </div>

            {/* Render Sections */}
            <div className="space-y-8 divide-y divide-slate-100">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No se encontraron secciones coincidentes con su búsqueda.</p>
                </div>
              ) : (
                filteredSections.map((sec, idx) => (
                  <section 
                    key={sec.id} 
                    id={sec.id}
                    className={`pt-6 ${idx === 0 ? 'pt-0' : ''} scroll-mt-20`}
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block" />
                      {sec.titulo}
                    </h2>
                    <div 
                      className="text-sm text-slate-700 leading-relaxed space-y-3"
                      dangerouslySetInnerHTML={{ __html: sec.contenido }}
                    />
                  </section>
                ))
              )}
            </div>

            {/* Footer Certificate / Legal Stamp */}
            <div className="mt-12 pt-6 border-t-2 border-slate-200/80 bg-slate-50/70 p-5 rounded-lg text-xs text-slate-600 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="font-bold text-slate-800">
                  {POLITICA_DATOS_INFO.empresa} · NIT {POLITICA_DATOS_INFO.nit}
                </span>
                <span className="text-[11px] text-slate-500">
                  Representante Legal: {POLITICA_DATOS_INFO.representanteLegal}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Documento adoptado en Villavicencio, Colombia. Registro oficial de políticas de información y consentimiento informado digital conforme a las Leyes 1581 de 2012, 1266 de 2008 y 527 de 1999.
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          header, aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
