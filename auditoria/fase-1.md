# Fase 1 · Contratos completos

Ficha de trabajo para el agente que implementa. La auditoría está en un
informe aparte; los códigos tipo **F-02** se refieren a sus hallazgos.

---

## Cómo se trabaja

- Rama: `auditoria/fase-1`, partiendo de `auditoria/fase-0`.
- Un commit por paso, con el número del paso en el asunto (`1.3: ...`).
- Todo cambio de esquema es un archivo nuevo en `supabase/migrations/`,
  nunca un cambio a mano en el panel de Supabase ni la edición de una
  migración ya aplicada. El flujo está en `supabase/LEEME.md`.
- Después de cada migración, regenerar los tipos:
  `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
- Al terminar cada paso: `npx tsc --noEmit` y `npx next build` deben pasar.

### Fuera de alcance en esta fase

No tocar, aunque se vean mal:

- La seguridad de la firma, el PDF firmado y el enlace público — Fase 4.
- Todo lo de cartera: mora, abonos, estados de cuenta — Fase 3.
- La carga masiva de lotes y el inventario — Fase 2.
- Los 84 avisos de ESLint. Se limpian donde el paso ya toca el archivo,
  no en un barrido aparte.

### Precondición

Las tres migraciones de la Fase 0 deben estar aplicadas. Comprobar antes
de escribir una sola línea:

```sql
-- Debe devolver 22 columnas, sin valor_cuota_inicial ni num_cuotas_iniciales
select count(*) from information_schema.columns
where table_schema='public' and table_name='contratos';

-- Todas deben salir en true
select relname, relrowsecurity from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';

-- Debe existir y tener 1 fila
select count(*) from plantillas_respaldo;
```

Si alguna falla, parar y avisar.

---

## Paso 1.1 · Normalizar `estado_firma`

**Hallazgo:** F-09. La columna es texto libre y el tipo admite `Pendiente`
y `PENDIENTE`, `Firmado` y `FIRMADO`. Hoy solo hay un contrato en
`Pendiente`, así que se puede normalizar sin riesgo. Cuando haya volumen,
cualquier filtro perdería registros.

**Cambio (migración):**

- Normalizar lo existente a capitalización inicial:
  `update contratos set estado_firma = initcap(lower(estado_firma));`
- `alter table contratos alter column estado_firma set default 'Pendiente';`
- `alter table contratos alter column estado_firma set not null;`
- Añadir restricción:
  `check (estado_firma in ('Borrador','Pendiente','Firmado','Cancelado'))`

**Cambio (código):** en `types.ts` el tipo de `estado_firma` queda en esos
cuatro valores, sin variantes en mayúsculas. Ajustar las comparaciones en
`src/components/existing-contracts.tsx` y en la página de firma.

**Aceptación:**

- `select distinct estado_firma from contratos;` devuelve solo valores de
  la lista.
- Intentar `update contratos set estado_firma='FIRMADO'` falla.
- No queda ninguna comparación contra `'FIRMADO'` o `'PENDIENTE'` en `src/`.

---

## Paso 1.2 · Separar precio de venta de total financiado

**Hallazgo:** F-04. Hoy `valor_total` guarda `financedTotal`, es decir
capital + intereses. El contrato declara como precio pactado una cifra que
no lo es, y el listado y el dashboard suman intereses como si fueran
capital.

**Cambio (migración):**

- `alter table contratos add column valor_financiado numeric;`
- `alter table contratos add column total_intereses numeric;`
- Comentar `valor_total`: «precio de venta pactado, sin intereses».
- Para el contrato que ya existe no se puede deshacer la suma con
  certeza: dejarlo como está y registrar una fila en
  `contratos_respaldo_20260910` ya cubre el histórico. Añadir al final de
  la migración un `raise notice` recordando revisar ese contrato a mano.

**Cambio (código):** en `handleGenerate` de
`src/components/dynamic-contract.tsx`:

- `valor_total` ← `targetTotal` (el precio de contado)
- `valor_financiado` ← `financedTotal`
- `total_intereses` ← `totalInterest`

**Aceptación:** generar un contrato de prueba de $100.000.000 con interés;
en la base, `valor_total` = 100.000.000 y `valor_financiado` > `valor_total`.

---

## Paso 1.3 · Guardar la estructura de pagos completa

**Hallazgo:** F-03. El generador calcula toda la estructura en pantalla y
al insertar solo guarda diez campos. Quedan en `NULL`: cuota inicial,
cuotas ordinarias y `fecha_fin`.

**Cambio:** en el mismo `insert` de `handleGenerate`, añadir:

| Columna | Valor |
|---|---|
| `monto_cuota_inicial` | `cIniMontoTotal` |
| `numero_cuotas_iniciales` | `Number(cuotaInicialPagos) \|\| 1` |
| `monto_cuota_ordinaria` | `cuotaOrdinariaMonto` redondeado al peso |
| `numero_cuotas_ordinarias` | `cOrdPagos` |
| `tiene_cuotas_extraordinarias` | `tieneExtraordinarias` |
| `fecha_fin` | fecha de la última cuota de `schedule` |

**Además:** `fecha_inicio` es de tipo `date` y hoy recibe
`new Date().toISOString()`, un instante completo. Postgres lo convierte en
UTC, así que un contrato creado después de las 7 p.m. hora de Colombia
queda fechado al día siguiente. Enviar solo `YYYY-MM-DD` calculado en hora
local.

**Aceptación:** tras generar un contrato, ninguna de esas seis columnas
queda en `NULL`, y `fecha_inicio` coincide con el día en Colombia.

---

## Paso 1.4 · Consecutivo de contrato

**Hallazgo:** F-11. El contrato se identifica por UUID. Para archivo,
notaría y conversación con el cliente hace falta un número legible.

**Cambio (migración):**

- `alter table contratos add column numero_contrato text;`
- Tabla `consecutivos_contrato (empresa_id uuid, anio int, ultimo int,
  primary key (empresa_id, anio))`.
- Función `siguiente_numero_contrato(p_empresa_id uuid)` que incrementa de
  forma atómica (`insert ... on conflict do update ... returning`) y
  devuelve el formato `NIT-AAAA-####`, usando las tres últimas cifras del
  NIT de la empresa. Ejemplo: `975-2026-0001`.
- Índice único sobre `(empresa_id, numero_contrato)`.
- Asignar número al contrato que ya existe.

**Cambio (código):** mostrar `numero_contrato` en
`existing-contracts.tsx` en lugar del UUID recortado, y en la cabecera del
documento en la página de firma.

**Aceptación:** dos contratos seguidos de la misma empresa reciben números
consecutivos; dos empresas distintas llevan series independientes.

---

## Paso 1.5 · Crear el contrato en una sola transacción

**Hallazgo:** F-31. Hoy son cuatro llamadas sueltas desde el navegador —
contrato, clientes, contratantes, plan de pagos—. Si una falla a medio
camino queda un contrato huérfano y el usuario solo ve un mensaje de error.

**Cambio:** una función de Postgres `crear_contrato(payload jsonb)` que
haga todo dentro de una transacción y devuelva el contrato creado:

1. Pide el consecutivo (paso 1.4).
2. Inserta en `contratos`.
3. Por cada participante: busca el cliente por `documento`; si no existe lo
   crea; **si existe, no pisa sus datos** (ver trampa abajo). Inserta el
   `contratantes_contrato`.
4. Inserta el `plan_pagos` completo.
5. Marca el inmueble como `Reservado`.
6. Devuelve el `id` y el `numero_contrato`.

Declararla `security invoker` para que las políticas RLS sigan aplicando.

`handleGenerate` pasa a ser una sola llamada `supabase.rpc('crear_contrato',
{ payload })`.

**Trampa conocida:** el código actual hace
`upsert(clienteRow, { onConflict: 'documento' })`. Eso es el hallazgo F-26:
crear un contrato en una empresa sobrescribe el correo y el teléfono que
ese mismo cliente tiene en otra. En la función nueva, si el documento ya
existe **no se actualiza nada**; se reutiliza el cliente tal como está. Si
los datos del formulario difieren, devolver esa diferencia en la respuesta
para que la interfaz lo avise, sin escribir.

**Segunda trampa:** al marcar el inmueble como `Reservado` hay que
comprobar antes que no tenga ya un contrato vivo, o se puede prometer en
venta dos veces (F-30). Si lo tiene, la función falla con un mensaje claro.

**Aceptación:**

- Generar un contrato con un plan de pagos inválido a propósito (por
  ejemplo, un `numero_cuota` duplicado) no deja nada escrito: cero
  contratos, cero contratantes, cero cuotas nuevas.
- Tras generar, el inmueble queda en `Reservado` y desaparece del selector.
- Intentar generar un segundo contrato sobre el mismo lote falla con un
  mensaje entendible.
- `select count(*) from contratos c where not exists (select 1 from
  plan_pagos p where p.contrato_id=c.id);` devuelve 0.

---

## Paso 1.6 · Valor en letras

**Hallazgo:** F-05. `{{valor_total_letras}}` lee `ctObj.valor_total_letras`,
una columna que no existe: siempre sale vacío. Un contrato de compraventa
sin el valor en letras es una debilidad probatoria evitable.

**Cambio:** helper propio en `src/lib/numero-a-letras.ts`. Sin dependencia
externa: las librerías de npm para esto suelen fallar en español
colombiano. Firma:

```ts
export function numeroALetras(valor: number): string
```

Reglas obligatorias:

- Hasta miles de millones.
- `1` → «UN PESO»; `21` → «VEINTIÚN PESOS»; `100` → «CIEN PESOS»;
  `101` → «CIENTO UN PESOS»; `1.000.000` → «UN MILLÓN DE PESOS»;
  `2.000.000` → «DOS MILLONES DE PESOS».
- Los centavos se redondean al peso; no se escriben.
- Salida en mayúsculas, terminada en «PESOS M/CTE».

**Pruebas obligatorias** en `src/lib/numero-a-letras.test.ts`, como mínimo
estos casos: 0, 1, 15, 21, 100, 101, 115, 200, 1.000, 1.001, 21.000,
100.000, 1.000.000, 2.000.000, 1.500.000, 21.000.000, 100.000.000,
1.000.000.000, 85.750.000.

**Aceptación:** todas las pruebas pasan. `numeroALetras(85750000)` devuelve
«OCHENTA Y CINCO MILLONES SETECIENTOS CINCUENTA MIL PESOS M/CTE».

---

## Paso 1.7 · Compilador de plantillas

**Hallazgos:** F-02, F-06, F-07. Es el paso más importante de la fase: es
la causa directa de que los contratos salgan incompletos.

Hoy la lógica está dentro de `src/app/firmar/[contract_id]/page.tsx`
(función `buildFinalHtml`). La plantilla real usa once variables y tres se
pierden, porque una limpieza final borra todo marcador `{{...}}` que no
esté en una lista de catorce.

### 1.7.a · Sacarlo a una librería compartida

Mover a `src/lib/contratos/compilar-plantilla.ts`:

```ts
export type ResultadoCompilacion = {
  html: string
  variablesDesconocidas: string[]
}

export function compilarPlantilla(
  clausulas: unknown,
  contrato: ContratoCompleto
): ResultadoCompilacion
```

La página de firma y la previsualización del paso 1.9 usan la misma
función. No duplicar lógica.

### 1.7.b · Nunca borrar en silencio

Quitar la línea `parsed.replace(/\{\{[^}]+\}\}/g, '')`.

Una variable no reconocida:

- se conserva visible en el HTML, envuelta en
  `<span class="variable-desconocida">{{nombre}}</span>`, con fondo rojo
  claro definido en `globals.css`;
- se acumula en `variablesDesconocidas`.

Si `variablesDesconocidas` no está vacío, **la página de firma no muestra
el contrato ni permite firmar**: enseña un mensaje pidiendo al firmante
que contacte a la empresa. Un contrato con huecos no se firma. La
previsualización del administrador sí lo muestra, resaltado y con la lista
de las que faltan.

### 1.7.c · Diccionario completo

Definir el diccionario en un solo lugar, como estructura de datos, con
`clave`, `descripción` y `ejemplo` — el editor de plantillas lo va a usar
para mostrarle la lista al abogado (paso 1.8).

**Mantener funcionando los nombres que ya usa la plantilla real.** En
particular `{{esquema_plan_pagos}}`, que hoy no se reconoce porque el
código busca `{{PLAN_PAGOS_TABLA}}`: ambos deben funcionar. **No renombrar
nada en la plantilla del abogado.**

Variables a soportar:

| Grupo | Claves |
|---|---|
| Contrato | `numero_contrato`, `tipo_contrato`, `fecha_dia`, `fecha_mes`, `fecha_anio`, `fecha_inicio`, `fecha_fin` |
| Empresa | `empresa_nombre`, `empresa_nit`, `empresa_direccion`, `empresa_telefono` |
| Cliente principal | `cliente_nombre`, `cliente_cedula`, `cliente_correo`, `cliente_telefono`, `cliente_direccion`, `cliente_rep_legal`, `cliente_rep_legal_documento` |
| Todos los contratantes | `tabla_contratantes` (bloque con nombre, documento y rol de cada uno), y `contratante_2_nombre` … `contratante_4_cedula` |
| Inmueble | `inmueble_identificador`, `proyecto_nombre`, `area_m2`, `matricula`, `cedula_catastral`, `linderos` (alias `lote_linderos`), `tradicion` |
| Valores | `valor_total_numero`, `valor_total_letras`, `valor_financiado_numero`, `valor_financiado_letras`, `total_intereses_numero` |
| Estructura de pago | `cuota_inicial_numero`, `cuota_inicial_letras`, `numero_cuotas_iniciales`, `cuota_ordinaria_numero`, `cuota_ordinaria_letras`, `numero_cuotas_ordinarias`, `dia_pago_mensual`, `frecuencia_extraordinaria`, `monto_cuota_extraordinaria`, `numero_cuotas_extraordinarias` |
| Tasas | `tasa_interes_corriente`, `tasa_interes_mora` |
| Plan | `esquema_plan_pagos` (alias `PLAN_PAGOS_TABLA`) |

Las de tipo `_letras` usan el helper del paso 1.6.

### 1.7.d · Arreglar la consulta

`{{proyecto_nombre}}` sale vacío porque la consulta del contrato no trae
la tabla `proyectos` (F-06). En el `select` de la página de firma, cambiar
`inmuebles ( ... )` por `inmuebles ( ..., proyectos ( nombre ) )`.

### 1.7.e · Todos los contratantes

Hoy el compilador toma `partes[0]` (F-07): con dos compradores o un deudor
solidario, el segundo firma un documento donde no está mencionado. Ordenar
los contratantes con `Comprador Principal` primero y el resto por fecha de
creación, y exponerlos todos.

**Aceptación del paso 1.7:**

- Con la plantilla real de Inversiones Ingeniería GC, el documento muestra
  la tabla completa de cuotas, el valor en letras y el nombre del proyecto.
- Una plantilla de prueba con `{{variable_inventada}}` la muestra resaltada
  y bloquea la firma.
- Un contrato con dos contratantes los nombra a ambos en el cuerpo.
- `compilarPlantilla` tiene pruebas con las tres formas de cláusula que
  hay en la base: array con `{titulo, contenido}`, array con
  `{title, content}` y cadena de HTML.

---

## Paso 1.8 · Editor de plantillas

**Hallazgos:** F-01, F-35. **Es el paso de mayor riesgo de la fase.**

Hoy el editor no lee lo que está guardado: arranca con dos cláusulas de
ejemplo escritas en el código y guarda con `upsert` sobre
`(empresa_id, tipo_contrato)`. El primer «Guardar» destruye la única
plantilla real que existe. Además la guarda con otra forma de campos
(`title`/`content` en vez de `titulo`/`contenido`/`numero`).

**Antes de tocar el archivo**, comprobar que el respaldo está:
`select count(*) from plantillas_respaldo;` debe ser ≥ 1.

**Cambio:**

1. Cargar la plantilla de la empresa y el tipo de contrato activos al
   abrir. Si no hay ninguna, empezar en blanco — **nunca** con cláusulas
   de ejemplo.
2. Forma canónica de cada cláusula: `{ numero, titulo, contenido }`, que es
   la que usa la plantilla real. Al leer, aceptar también `{title, content}`
   y convertir.
3. Versionado: migración con tabla `plantillas_versiones` (plantilla_id,
   clausulas jsonb, guardado_por, guardado_el). Cada guardado escribe una
   versión antes de actualizar. Botón para ver y restaurar versiones.
4. Selector de tipo de contrato: `Compraventa`, `Arrendamiento`,
   `Servicios`, `Corretaje`. Hoy siempre guarda como `Compraventa`.
5. Panel lateral con el diccionario de variables del paso 1.7.c, con
   copiar al portapapeles. El abogado no puede adivinar los nombres.
6. Botón «Duplicar a otra empresa»: C&C Ingeniería y C&R Group no tienen
   ninguna plantilla y hoy sus contratos no se podrían firmar (F-35).

**Aceptación:**

- Abrir el editor, no tocar nada y guardar deja las seis cláusulas
  intactas: `jsonb_array_length(clausulas)` sigue en 6.
- Guardar un cambio y restaurar la versión anterior devuelve el texto.
- Duplicar la plantilla a C&C deja una plantilla equivalente en esa
  empresa, sin tocar la original.

---

## Paso 1.9 · Previsualización y descarga del borrador

**Hallazgos:** F-10, F-12. El botón «Descargar PDF» de la lista de
contratos solo muestra un aviso de «Descargando…» y no hace nada. Y el
texto legal no se ve por ninguna parte antes de generar: aparece por
primera vez en la pantalla de firma, ya frente al cliente.

**Cambio:**

- En el generador, una pestaña «Vista previa del documento» junto a la
  proyección de pagos, que compile la plantilla con los datos del
  formulario usando `compilarPlantilla`. Si hay variables desconocidas, se
  listan y el botón de generar queda deshabilitado.
- Ruta `/contratos/[id]/imprimir`, solo para usuarios con sesión, que
  renderice el contrato en limpio con una hoja de estilo de impresión
  (`@page { size: letter; margin: 2.5cm }`, sin barra lateral ni cabecera)
  y llame a `window.print()`.

**Por qué así y no con jsPDF:** el PDF actual se arma rasterizando la
página con `html2canvas` y repartiendo la imagen con desplazamientos
negativos, lo que corta el texto en cada salto de página y suele añadir
una hoja en blanco (F-16). La impresión del navegador genera un PDF con
texto real, seleccionable y paginado correctamente, sin dependencias.

**No tocar** la generación del PDF de la página de firma: ese es el
original del contrato firmado y se rehace en servidor en la Fase 4.

**Aceptación:** desde la lista de contratos se obtiene un PDF con el texto
completo, seleccionable, sin cortes a mitad de renglón y sin páginas en
blanco.

---

## Verificación de cierre de fase

```bash
npx tsc --noEmit          # sin errores
npx next build            # completa, 11+ rutas
npm test                  # pruebas de numeroALetras y compilarPlantilla
```

En la base:

```sql
-- Sin contratos incompletos
select count(*) from contratos
where monto_cuota_inicial is null or numero_cuotas_ordinarias is null
   or fecha_fin is null or numero_contrato is null;   -- 0

-- Sin contratos sin plan ni sin partes
select count(*) from contratos c
where not exists (select 1 from plan_pagos p where p.contrato_id=c.id)
   or not exists (select 1 from contratantes_contrato t where t.contrato_id=c.id); -- 0

-- Sin lotes contratados que sigan disponibles
select count(*) from inmuebles i
where i.estado='Disponible' and exists (select 1 from contratos c where c.inmueble_id=i.id); -- 0

-- La plantilla real intacta
select jsonb_array_length(clausulas::jsonb) from plantillas_contratos
where empresa_id='00000000-0000-0000-0000-000000000001';  -- 6
```

Y una prueba de punta a punta: crear un contrato de compraventa con dos
compradores, cuota inicial diferida a 3 meses, 60 mensualidades con
interés y refuerzos semestrales; abrir la vista previa y comprobar que el
documento sale completo, con la tabla de cuotas, el valor en letras y los
dos compradores nombrados.
