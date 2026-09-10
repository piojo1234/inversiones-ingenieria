# Base de datos: cómo se cambia a partir de ahora

Hasta hoy el esquema vivía **solo dentro de Supabase**: no había ni un
archivo SQL en el proyecto, y `src/lib/supabase/types.ts` estaba escrito a
mano. De ahí salieron las cinco parejas de columnas duplicadas en
`contratos`: nadie podía ver el esquema completo de un vistazo.

A partir de ahora **ningún cambio se hace a mano en el panel de Supabase**.
Todo cambio es un archivo en `supabase/migrations/`, se confirma en Git y
queda revisable y reversible.

## Nombre de los archivos

    AAAAMMDDHHMMSS_descripcion_corta.sql

Se ejecutan en orden alfabético, que con ese formato es el orden
cronológico. Nunca se edita una migración ya ejecutada: se crea una nueva.

## Migraciones actuales

| Archivo | Qué hace |
|---|---|
| `20260910120000_baseline_esquema.sql` | Foto del esquema tal como está hoy. **Falta generarla** (ver abajo). |
| `20260910120050_respaldo_plantillas.sql` | Copia las plantillas de contrato a una tabla aparte, antes de tocar nada. |
| `20260910120100_activar_rls.sql` | Cierra las 13 tablas con políticas por empresa. Rompe a propósito el enlace público de firma. |
| `20260910120200_consolidar_columnas_contratos.sql` | Unifica las 5 parejas de columnas duplicadas en `contratos`. |

En `auditoria/diagnostico.sql` quedan las consultas de solo lectura que se
usaron para revisar el estado de la base. No modifican nada y se pueden
volver a correr cuando haga falta.

## Pendiente: generar la migración base

Es el único paso que no puedo hacer yo, porque necesita iniciar sesión en
tu cuenta de Supabase. Desde la carpeta del proyecto:

```bash
npx supabase login                          # abre el navegador
npx supabase link --project-ref TU_REF      # el ref sale de la URL del panel
npx supabase db pull                        # escribe la migración base sola
```

`db pull` crea el archivo con el esquema completo dentro de
`supabase/migrations/`. Si le pone otro nombre, se deja el que ponga: lo
importante es que quede **antes** que las otras dos por fecha. Si el
archivo que genera empieza por una fecha posterior, renómbralo a
`20260910120000_baseline_esquema.sql`.

## Cómo aplicar los cambios

Dos caminos, elige uno y quédate con él:

**Con la CLI (recomendado):**

```bash
npx supabase db push        # aplica lo que falte por aplicar
```

**A mano**, si prefieres no instalar nada: abre cada archivo pendiente en
Supabase > SQL Editor y ejecútalo en orden. Funciona igual, pero tienes que
llevar tú la cuenta de cuáles ya corriste.

## Regenerar los tipos de TypeScript

Después de cada migración, para que `types.ts` deje de escribirse a mano:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```
