"use client";

import React, { useState } from "react";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { createClient } from "@/lib/supabase/client";

interface Clause {
  id: string;
  title: string;
  content: string;
}

export function TemplateEditor() {
  const { activeCompany } = useCompany();
  const [templateName, setTemplateName] = useState("Plantilla Estándar Compraventa");
  const [clauses, setClauses] = useState<Clause[]>([
    { id: "1", title: "PARTES Y DECLARACIÓN INICIAL", content: "Entre los suscritos a saber: INVERSIONES INGENIERIA GC S.A.S, con NIT 900.769.975-1, con domicilio principal en esta ciudad, representada en este acto por LUZ MILA CIFUENTES RUIZ, mayor de edad, de esta vecindad, identificada con la cedula de ciudadanía No. 40.218.044 de Villavicencio, quien en el curso del presente documento se llamará el PROMITENTE VENDEDOR, de una parte; y de la otra {{cliente_nombre}}, mayores de edad, identificados con cedula de ciudadanía número {{cliente_cedula}}, quienes en el curso del presente contrato se llamaran los PROMITENTES COMPRADORES, se ha celebrado un contrato de promesa de compraventa, que se condensa dentro de las siguientes cláusulas; y, en lo no previsto en ellas por la Ley." },
    { id: "2", title: "PRIMERA: OBJETO", content: "EL PROMITENTE VENDEDOR, se obliga a transferir a favor de los PROMITENTES COMPRADORES, a título de compraventa y estos se obligan a adquirir del primero, al mismo título, el derecho de dominio, propiedad y posesión que tiene y ejerce, vinculados con el lote de terrero rural, que se conoce como {{inmueble_identificador}}, el cual tiene un área superficiaria de aproximadamente {{area_m2}} M2, que se halla ubicado en el paraje de Rio Negro, Vereda Paraderito, del Municipio de Villavicencio, con matrícula inmobiliaria {{matricula}} de la Oficina de Registro de Instrumentos Públicos de esta ciudad, cédula catastral {{cedula_catastral}} y comprendido dentro de los siguientes linderos: {{lote_linderos}}." },
    { id: "3", title: "SEGUNDA: TRADICION", content: "El lote de terreno rural prometido en venta por el presente documento, fue adquirido por EL PROMITENTE VENDEDOR, por compra conforme consta en la escritura pública y tradición correspondiente: {{tradicion}} inscrita en el folio de matrícula inmobiliaria {{matricula}} de la Oficina de Registro de Instrumentos Públicos de Villavicencio." },
    { id: "4", title: "TERCERA: SANEAMIENTO", content: "EL PROMITENTE VENDEDOR, se obliga a transferir el dominio y la posesión del lote de terreno rural objeto del presente contrato, libre de hipotecas, embargos, demandas civiles, condiciones resolutorias de dominio, censo, anticrisis, servidumbre, pleitos pendientes y en general, de todo factor que pudiera afectar el derecho de los PROMITENTES compradores y saldrá al saneamiento en todos los casos previstos por la Ley." },
    { id: "5", title: "CUARTA: PRECIO Y FORMA DE PAGO", content: "El precio acordado por los contratantes, como valor del lote de terreno rural objeto de la presente promesa de compraventa, es la suma de: {{valor_total_letras}} ({{valor_total_numero}}), suma que los PROMITENTES COMPRADORES, pagarán al PROMITENTE VENDEDOR en la ciudad de Villavicencio, de la siguiente manera:\n\n{{PLAN_PAGOS_TABLA}}\n\nPARAGRAFO PRIMERO: El pago de los compromisos se efectuará en las dependencias de INVERSIONES INGENIERIA GC S.A.S., ubicada en la calle 38 No. 32 – 41 Oficina 804 de la ciudad de Villavicencio ó en su cuenta de ahorros convenio empresarial, siempre que se realice la consignación deberá ser reportada y anexar el comprobante de consignación.\nPARAGRAFO SEGUNDO: INTERESES MORATORIOS.- En caso de mora en el pago de las sumas estipuladas en la presente cláusula por más de 15 días, EL PROMITENTE COMPRADOR pierde el beneficio del no cobro de los intereses y en consecuencia, se obliga a reconocer y pagar intereses de mora a la tasa máxima permitida por las autoridades competentes en el momento del pago de la obligación ({{tasa_interes_mora}}%).\nPARAGRAFO TERCERO.- CLAUSULA ACELERATORIA: EL PROMITENTE VENDEDOR podrá declarar vencido el plazo de esta obligación o de las cuotas que constituyen el saldo de lo debido y exigir de inmediato su pago total, o el de los saldos insolutos tanto del capital como de los intereses, así como el de las obligaciones accesorias a que haya lugar.\nPARAGRAFO CUARTO: RESOLUCION DEL CONTRATO DE PROMESA DE COMPRAVENTA POR INCUMPLIMIENTO EN EL PAGO.- Desde ya, EL PROMITENTE COMPRADOR, de manera libre, voluntaria establece que si incurre en mora de 90 días en el pago de las obligaciones aquí pactadas, se resolverá el contrato de promesa de compraventa, a partir del día 91 en mora." },
    { id: "6", title: "QUINTA: CLAUSULA PENAL", content: "Las partes contratantes acuerdan, que el que, incumpliere alguna o varias de las cláusulas aquí consignadas, pagará al contratante cumplido, a título de multa, la suma equivalente al 20% del valor total de la venta, suma que se descontará de la cuota inicial pagada, a menos que de común acuerdo hayan acordado otra forma de pago; la cual podrá hacerse efectiva, desde el día siguiente a su incumplimiento o infracción, por la vía ejecutiva, sin que haya lugar a requerimiento ni constitución en mora." },
    { id: "7", title: "SEXTA: ESCRITURA PÚBLICA", content: "La escritura pública que perfecciona la venta prometida se otorgará a las 10 AM, en la Notaría Primera del Círculo de Villavicencio, siempre que EL PROMITENTE COMPRADOR haya cumplido a cabalidad con el pago total del precio pactado para este contrato. PARÁGRAFO: En el evento que los contratantes dispongan suscribir la escritura pública de que se trata, ya sea, adelantando o postergando la fecha y día y notaria anteriormente establecidos, deberán firmar un otro sí." },
    { id: "8", title: "SEPTIMA: ENTREGA", content: "EL PROMITENTE VENDEDOR hace entrega real y material del inmueble objeto de este contrato, al PROMITENTE COMPRADOR, a la firma del presente contrato y a partir de este momento podrá hacer arreglos menores, sembrar árboles y desde ahora será el responsable y deberá asumir los costos de cortar y/o podar el pasto, mantener y cuidar la cerca viva, la vegetación nativa y frutales a los que haya lugar; pero no podrá hacer construcciones hasta tanto no haya cancelado el valor total pactado por el inmueble y se haya perfeccionado la venta prometida." },
    { id: "9", title: "OCTAVA: AISLAMIENTOS", content: "EL PROMITENTE COMPRADOR, se obliga a dejar los aislamientos, es decir espacios para andenes y ante jardín, respetando las normas ambientales." },
    { id: "10", title: "NOVENA: MECANISMOS DE SOLUCION DE CONFLICTOS", content: "Las partes acuerdan que toda diferencia que surgiere entre sí, en virtud del desarrollo y ejecución del presente contrato será resuelta por estas, mediante métodos alternativos de solución de conflictos; esto es, la conciliación, amigable composición, etc.; de no llegarse a ningún acuerdo, estas, queda facultadas para acudir ante la justicia civil ordinaria." },
    { id: "11", title: "DECIMA: GASTOS", content: "Los gastos que ocasione la firma del presente documento de promesa de compraventa; así como los que demanda el otorgamiento de la escritura pública y su registro; y, los demás que se generen con ocasión de este negocio, serán asumidos en su totalidad por EL PROMITENTE COMPRADOR." },
    { id: "12", title: "DECIMA PRIMERA: AREAS SOCIALES", content: "Los contratantes hacen constar que, en el presente negocio de promesa de compraventa, se incluye, como parte de este, el uso y goce o disfrute de las zonas sociales del proyecto, con las exigencias y limitaciones definidas en los reglamentos y demás normas de control y convivencia, acorde con las normas legales que rigen la materia." },
    { id: "13", title: "DECIMA SEGUNDA: MANTENIMIENTO", content: "EL PROMITENTE COMPRADOR, desde ahora se compromete a realizar el corte de pasto y/o poda y mantenimiento de la cerca viva de su lote ya sea directamente o por intermedio de un tercero; el costo de dicho mantenimiento será asumido por el PROMITENTE COMPRADOR en su totalidad; en todo caso, deberá mantener limpio y despejado de maleza su lote en todo momento." },
    { id: "14", title: "DECIMA TERCERA: MERITO EJECUTIVO", content: "El presente contrato presta merito ejecutivo con la finalidad de hacer efectivas las obligaciones aquí contraídas, con la sola presentación ante la autoridad competente, sin necesidad de requerimiento para constituir en mora, derecho al cual renuncian desde ahora." },
    { id: "15", title: "DECIMA CUARTA: CESION", content: "El Prometiente Comprador no podrá ceder ni parcial ni totalmente las obligaciones y derechos adquiridos mediante el presente contrato de promesa de compraventa, sin autorización previa y por escrito del Prometiente Vendedor; de contravenir esta prohibición, la cesión no producirá efectos jurídicos contra la otra parte, y no exime de responsabilidad sin la debida autorización." },
    { id: "16", title: "DECIMA QUINTA: ACEPTACION", content: "EL PROMITENTE COMPRADOR de manera expresa manifiesta que ha realizado una visita ocular al lote de terreno objeto del presente contrato, verificando su ubicación exacta, superficie, área y status legal, así como sus limitantes... De otra parte, EL PROMETIENTE VENDEDOR hace constar, que en el desarrollo de la investigación por parte de la Administración Municipal, Cormacarena, policía judicial... se atendió en su totalidad los requerimientos correspondientes con la finalidad de aclarar las inquietudes de la autoridad, obteniendo como resultado el archivo de la investigación por conducta atípica. Estos hechos son de conocimiento del prometiente comprador, quien los acepta para efectos del presente contrato." },
    { id: "17", title: "DECIMA SEXTA: NOTIFICACIONES", content: "Los contratantes recibirán notificaciones así: EL PROMITENTE VENDEDOR en la calle 38 No. 32-41 oficina 802 Edificio Parque Santander de Villavicencio y EL PROMITENTE COMPRADOR en la dirección y correo electrónico registrados en la plataforma." },
    { id: "18", title: "ANEXO: PAGARÉ A LA ORDEN", content: "LUGAR DONDE SE EFECTUA EL PAGO: VILLAVICENCIO-META\nDEUDOR (S): {{cliente_nombre}}, identificados con cedulas de ciudadanía números {{cliente_cedula}}.\n\nPor medio del presente documento, declaramos y aceptamos este pagare...\nVALOR: {{valor_total_letras}} ({{valor_total_numero}})\nINTERESES DURANTE LA MORA: La Tasa Máxima Legal prevista artículo 884 Código de Comercio.\n\nEl pago incondicional de las cuotas se hará conforme al plan de amortización estipulado:\n{{PLAN_PAGOS_TABLA}}\n\nMORA: que en caso de mora en el pago de cualquiera de las obligaciones aquí contraídas pagare a INVERSIONES INGENIERIA GC S.A.S., los gastos y costas de cobranza...\nCLAUSULA ACELERATORIA: El tenedor del presente pagaré podrá declarar vencido el plazo de esta obligación o de las cuotas que constituyen el saldo de lo debido y exigir de inmediato su pago total." },
    { id: "19", title: "ANEXO: CARTA DE INSTRUCCIONES ANEXA AL PAGARE", content: "Señores:\nINVERSIONES INGENIERIA GC S.A.S.\n\nNosotros {{cliente_nombre}}, identificados como aparece al pie de nuestra firma, actuando en nombre propio, por medio del presente escrito manifestamos que le facultamos a usted, de manera permanente e irrevocable para que, en caso de incumplimiento en el pago oportuno de alguna de las obligaciones que hemos adquirido con usted, derivadas de los negocios comerciales y contractuales bien sean verbales o escritos; sin previo aviso, proceda a llenar los espacios en blanco del pagaré que he suscrito en la fecha a su favor." },
    { id: "20", title: "ANEXO: AUTORIZACION DATOS FINANCIEROS Y PERSONALES", content: "Nosotros {{cliente_nombre}}, identificados con documento {{cliente_cedula}}, manifestamos que AUTORIZAMOS de manera expresa e irrevocable a INVERSIONES INGENIERIA GC S.A.S., para capturar, tratar, procesar, operar, verificar, transmitir, trasferir, usar, poner en circulación, consultar, divulgar, reportar y solicitar toda la información que se refiere a nuestro comportamiento crediticio...\n\nCon la firma de este documento manifiesto que he sido informado por INVERSIONES INGENIERIA GC S.A.S., de que actuará como Responsable del Tratamiento de datos personales de los cuales soy titular y que, conjunta o separadamente podrán recolectar, usar y tratar mis datos personales conforme la Política de Tratamiento de Datos Personales de la compañía." }
  ]);

  const addClause = () => {
    setClauses([...clauses, { id: Date.now().toString(), title: "Nueva Cláusula", content: "" }]);
  };

  const removeClause = (id: string) => {
    setClauses(clauses.filter((c) => c.id !== id));
  };

  const updateClause = (id: string, field: keyof Clause, value: string) => {
    setClauses(clauses.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const [contractType, setContractType] = useState<"Compraventa" | "Arrendamiento" | "Servicios" | "Corretaje">("Compraventa");

  // Ajustar contractType por defecto si se selecciona C&R Group (es de Arriendo)
  React.useEffect(() => {
    if (activeCompany?.id === '00000000-0000-0000-0000-000000000003') {
      setContractType("Arrendamiento");
    } else {
      setContractType("Compraventa");
    }
  }, [activeCompany?.id]);

  const [loadingTemplate, setLoadingTemplate] = useState(false);

  React.useEffect(() => {
    async function loadCompanyTemplate() {
      if (!activeCompany?.id) return;
      setLoadingTemplate(true);
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('plantillas_contratos')
          .select('*')
          .eq('empresa_id', activeCompany.id)
          .eq('tipo_contrato', contractType)
          .maybeSingle();

        if (data) {
          setTemplateName(data.titulo_documento || `Plantilla ${contractType} - ${activeCompany.name}`);
          if (Array.isArray(data.clausulas) && data.clausulas.length > 0) {
            setClauses(data.clausulas as unknown as Clause[]);
          }
        } else {
          // Si esta empresa no tiene plantilla guardada aún para este tipo
          setTemplateName(`Plantilla ${contractType} - ${activeCompany.name}`);
          setClauses((prev) =>
            prev.map((c) => ({
              ...c,
              content: c.content
                .replace(/INVERSIONES INGENIERIA GC S\.A\.S/g, activeCompany.name)
                .replace(/900\.769\.975-1/g, activeCompany.nit || "")
            }))
          );
        }
      } catch (err) {
        console.error("Error loading template for company:", err);
      } finally {
        setLoadingTemplate(false);
      }
    }

    loadCompanyTemplate();
  }, [activeCompany?.id, contractType]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    
    setIsSaving(true);
    try {
      const supabase = createClient();
      
      // Check if template exists for this company and contract type
      const { data: existingTemplate, error: searchError } = await supabase
        .from('plantillas_contratos')
        .select('id')
        .eq('empresa_id', activeCompany.id)
        .eq('tipo_contrato', contractType)
        .maybeSingle();
        
      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }
      
      let saveError;
      
      if (existingTemplate) {
        // Update
        const { error } = await (supabase.from('plantillas_contratos') as any)
          .update({
            titulo_documento: templateName,
            clausulas: clauses as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTemplate.id);
        saveError = error;
      } else {
        // Insert
        const { error } = await (supabase.from('plantillas_contratos') as any)
          .insert({
            titulo_documento: templateName,
            tipo_contrato: contractType,
            clausulas: clauses as any,
            empresa_id: activeCompany.id
          });
        saveError = error;
      }
      
      if (saveError) throw saveError;
      alert(`Plantilla "${templateName}" guardada exitosamente en la base de datos.`);
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Error al guardar la plantilla: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl font-heading font-semibold">Editor de Plantillas de Contratos</h2>
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium">
            {activeCompany?.name}
          </span>
          {loadingTemplate && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md border border-border">
            <label className="text-xs font-semibold text-muted-foreground">Tipo:</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as any)}
              className="text-xs bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="Compraventa">Compraventa</option>
              <option value="Arrendamiento">Arrendamiento</option>
              <option value="Servicios">Servicios</option>
              <option value="Corretaje">Corretaje</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Plantilla
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Nombre de la Plantilla</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Cláusulas del Contrato</h3>
          <button
            onClick={addClause}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir Cláusula
          </button>
        </div>

        {clauses.map((clause, index) => (
          <div key={clause.id} className="border border-border rounded-md p-4 flex flex-col gap-3 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-muted-foreground w-8">#{index + 1}</span>
              <input
                type="text"
                value={clause.title}
                onChange={(e) => updateClause(clause.id, "title", e.target.value)}
                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Título de la cláusula"
              />
              <button
                onClick={() => removeClause(clause.id)}
                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                title="Eliminar cláusula"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="pl-12">
              <textarea
                value={clause.content}
                onChange={(e) => updateClause(clause.id, "content", e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Contenido de la cláusula..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
