# SPEC 04 — Fundación de Supabase: clientes SSR y verificación de conexión

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-18
> **Objetivo:** Conectar la aplicación a Supabase con clientes SSR reutilizables y un comando que verifique URL y llave, sin autenticación ni persistencia.

## Por qué existe esta spec

La app funciona con un usuario en memoria y datos estáticos. El siguiente paso natural es Supabase, pero mezclar configuración, autenticación y puntuaciones en una sola spec haría difícil aislar fallos. Esta spec deja solo la capa de conexión: dependencias, clientes, variables de entorno y una prueba real contra el proyecto.

El proyecto `drsthviyneavhbltolwk` está vacío (sin tablas ni migraciones). `.env.local` solo contiene `SUPABASE_DB_PASSWORD`, que hoy ninguna parte de la aplicación lee. Esta spec no lo usa ni lo expone.

## Alcance

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- `app/lib/supabase/config.ts` con `SupabaseConfig`, `isSupabaseConfigured()` y `getSupabaseConfig()`.
- `app/lib/supabase/client.ts` con un cliente browser singleton creado con `createBrowserClient`.
- `app/lib/supabase/server.ts` con `createSupabaseServerClient()`, creado con `createServerClient` y `cookies()` de `next/headers`.
- `scripts/check-supabase.mjs` y el comando `npm run check:supabase`.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.template`, `.env.local` y `README.md`.
- Verificación con `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

**Fuera de alcance (para futuras specs):**

- Formulario de acceso real, registro, logout, Server Actions de auth y sesión en cookies.
- `proxy.ts` o cualquier refresco automático de sesión.
- Tabla `profiles`, triggers, RLS, migraciones y cualquier cambio de esquema.
- Tipos generados de la base de datos (`database.types.ts`).
- Persistencia de puntuaciones, leaderboard real y migración de `GAMES`, `seededScores` o `ACTIVITY_FEED`.
- Service role key, `SUPABASE_DB_PASSWORD` o cualquier secreto de administración.
- Storage, Realtime, Edge Functions y OAuth.
- Cambios en `UserProvider`, `SiteNav`, `AuthForm` o cualquier pantalla.
- Tests automatizados, i18n y analítica.

## Modelo de datos

No hay estructuras nuevas en la base de datos ni cambios en los datos de la app. La spec solo introduce el contrato de configuración y los clientes.

```ts
// app/lib/supabase/config.ts
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function isSupabaseConfigured(): boolean;
export function getSupabaseConfig(): SupabaseConfig;
```

Convenciones:

- Las variables se llaman exactamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Se leen con acceso estático a propiedad (`process.env.NEXT_PUBLIC_SUPABASE_URL`), no con destructuring, para que Next las inline en el cliente.
- Un valor vacío o solo con espacios cuenta como ausente.
- `isSupabaseConfigured()` devuelve `false` sin lanzar excepciones.
- `getSupabaseConfig()` lanza un `Error` que nombra las dos variables cuando falta configuración.
- La configuración se valida dentro de las funciones, nunca al importar el módulo, para que `next build` pase sin variables definidas.
- `createSupabaseBrowserClient()` devuelve siempre la misma instancia y solo se importa desde componentes cliente.
- `createSupabaseServerClient()` es `async`, crea una instancia nueva por llamada y lee `cookies()`.
- El callback `setAll` del cliente de servidor captura el error de escritura de cookies en Server Components; el refresco real llega con la spec de auth.
- Ningún cliente usa el genérico `Database` hasta que existan tablas y tipos generados.

Contrato de `npm run check:supabase`:

- Lee las mismas dos variables de entorno.
- Hace `GET {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` con la cabecera `apikey`.
- Sale con código `0` e imprime `✔ Supabase conectado · GoTrue vX.Y.Z` cuando la respuesta es `200`.
- Sale con código `1` y un mensaje que nombra las variables faltantes cuando no hay configuración.
- Sale con código `1` con el estado HTTP cuando la llave o la URL no son válidas.
- No imprime la llave en ningún mensaje.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` con npm y dejar las versiones fijadas en `package-lock.json`. Verificar que `npm run build` sigue pasando sin imports nuevos.
2. Crear `app/lib/supabase/config.ts` con `SupabaseConfig`, `isSupabaseConfigured()` y `getSupabaseConfig()`. Verificar con `npx tsc --noEmit`.
3. Crear `app/lib/supabase/client.ts` con `"use client"`, un singleton a nivel de módulo y `createSupabaseBrowserClient()`. Verificar con `npx tsc --noEmit`.
4. Crear `app/lib/supabase/server.ts` con `createSupabaseServerClient()`, `createServerClient`, `await cookies()` y el `setAll` protegido con `try/catch`. Verificar con `npx tsc --noEmit`.
5. Crear `scripts/check-supabase.mjs` con el contrato de la sección anterior y agregar `"check:supabase": "node scripts/check-supabase.mjs"` a `package.json`. Verificar que sin variables sale con código `1` y un mensaje claro.
6. Agregar las dos variables a `.env.template` con valores de ejemplo, completar los valores reales en `.env.local` y documentarlas en la tabla de `README.md`. Verificar que `git check-ignore .env.template` no lo marca como ignorado.
7. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; luego `npm run check:supabase` con los valores reales. Repetir el build con `.env.local` apartado para confirmar que no depende de Supabase.

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js`, `@supabase/ssr` y el script `check:supabase`.
- [ ] `app/lib/supabase/config.ts` exporta `SupabaseConfig`, `isSupabaseConfigured()` y `getSupabaseConfig()`.
- [ ] `isSupabaseConfigured()` devuelve `false` cuando falta cualquiera de las dos variables.
- [ ] `getSupabaseConfig()` lanza un error que nombra `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` cuando falta configuración.
- [ ] `app/lib/supabase/client.ts` exporta `createSupabaseBrowserClient()` y reutiliza una sola instancia.
- [ ] `app/lib/supabase/server.ts` exporta `createSupabaseServerClient()` como función asíncrona que usa `cookies()` de `next/headers`.
- [ ] Importar `app/lib/supabase/server.ts` desde un componente cliente falla en el build por el import de `next/headers`.
- [ ] `npm run check:supabase` con URL y llave válidas termina con código `0` e imprime `GoTrue` y su versión.
- [ ] `npm run check:supabase` sin variables termina con código `1` y nombra las dos variables faltantes.
- [ ] `npm run check:supabase` con una llave inválida termina con código `1` e incluye el estado `401`.
- [ ] `npm run check:supabase` con una URL inválida termina con código `1` y un mensaje legible.
- [ ] Ningún mensaje del script imprime el valor de la llave.
- [ ] `.env.template` contiene las dos variables con valores de ejemplo y no está ignorado por git.
- [ ] `.env.local` contiene los valores reales del proyecto y sigue ignorado por git.
- [ ] `README.md` documenta las dos variables en su tabla de entorno.
- [ ] `npx next typegen`, `npx tsc --noEmit` y `npm run lint` terminan sin errores.
- [ ] `npm run build` pasa con `.env.local` presente y también con `.env.local` apartado.
- [ ] Ninguna página o componente actual importa `app/lib/supabase/*`.
- [ ] `/`, `/games`, `/games/bloque-buster`, `/play/bloque-buster`, `/auth`, `/hall-of-fame` y `/about` se ven igual que antes a 390px y 1440px.
- [ ] El nav, el formulario de acceso y la sesión en memoria siguen funcionando sin cambios.
- [ ] No aparecen nuevas cookies `sb-*` tras navegar por las pantallas.
- [ ] Ningún archivo de la app lee `SUPABASE_DB_PASSWORD` ni una service role key.
- [ ] No se agregan tablas, migraciones, tipos generados, `proxy.ts` ni variables de OAuth.

## Decisiones tomadas y descartadas

- **Sí:** spec de fundación únicamente. Auth y datos quedan en specs separadas para poder verificar la conexión sin mezclarla con sesiones ni RLS.
- **Sí:** `@supabase/ssr` en lugar de solo `supabase-js`. El cliente de servidor con cookies es la base que la spec de auth necesitará; agregarlo después obligaría a reescribir los clientes.
- **Sí:** dos clientes separados (browser y server). El navegador usa un singleton y el servidor necesita `cookies()` por request.
- **Sí:** publishable key (`sb_publishable_...`) en lugar de la anon key legacy. Es el formato recomendado por Supabase y está habilitado en el proyecto; la anon key sigue disponible pero no se usa.
- **Sí:** prefijo `NEXT_PUBLIC_` para ambas variables. La URL y la publishable key están diseñadas para ser públicas.
- **Sí:** configuración perezosa con `isSupabaseConfigured()` y `getSupabaseConfig()`. Permite que el build y las pantallas actuales funcionen sin `.env.local`.
- **Sí:** `app/lib/supabase/`. Sigue la ubicación de `app/data`, `app/actions` y `app/components`, y usa el alias `@/app/lib/supabase/...`.
- **Sí:** script de verificación contra `/auth/v1/health`. Prueba URL y llave sin necesitar tablas, sesión ni una ruta pública nueva.
- **Sí:** parser mínimo de `.env.local` dentro del script, sin `dotenv` ni `--env-file`. Evita una dependencia extra y diferencias entre versiones de Node.
- **No:** proxy o middleware de sesión. No hay login todavía; agregarlo antes sería código sin uso. Llega con la spec de auth.
- **No:** tipos generados de la base de datos. La base está vacía y el archivo sería ruido; se generan cuando existan tablas.
- **No:** paquete `server-only`. El import de `next/headers` ya impide que el cliente de servidor se cuele en un componente cliente.
- **No:** endpoint `/api/health/supabase`. El script cubre la verificación local sin agregar superficie pública.
- **No:** tocar `UserProvider`, `SiteNav` o `AuthForm`. La fundación no debe alterar el flujo de invitado ni el login simulado.
- **No:** leer `SUPABASE_DB_PASSWORD` desde la app. Es una credencial administrativa y solo sirve para tareas de CLI o consola.
- **No:** service role key. Ninguna operación de esta spec la necesita y exponerla rompería el modelo de RLS futuro.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Next inlinea `NEXT_PUBLIC_*` en build; cambiar `.env.local` no se refleja en caliente | Documentar en README que hay que reiniciar `next dev`; en producción, reconstruir. |
| La publishable key viaja al navegador | Es pública por diseño; la seguridad real dependerá de RLS en la primera tabla. No crear tablas sin políticas. |
| `createServerClient` intenta escribir cookies dentro de un Server Component y falla | El `setAll` captura el error y lo deja pasar; el refresco llegará con proxy y Server Actions en la spec de auth. |
| Sin proxy, una sesión futura no se refresca automáticamente | Aceptado en esta spec; queda como requisito explícito de la spec de auth. |
| `/auth/v1/health` exige Auth habilitado y la cabecera `apikey` | El script muestra el estado HTTP real; si Auth se deshabilita o la llave rota, el error es visible. |
| El script duplica los nombres de las variables y puede desincronizarse del cliente | `.env.template` y README son la fuente única; el mensaje de error nombra ambas variables. |
| Importar el cliente de servidor desde un componente cliente rompe el build | Es el comportamiento deseado: `next/headers` actúa como guardia. |
| Supabase no responde o hay un corte de red | El script falla con un mensaje de conexión; la app actual no se ve afectada porque nada la importa todavía. |
| Versiones incompatibles entre `@supabase/ssr` y `supabase-js` | Instalar ambas juntas y fijar el resultado en `package-lock.json`. |

## Lo que **no** entra en esta spec

- Autenticación real, registro, logout, sesiones o cookies de Supabase.
- `proxy.ts`, refresco de sesión y rutas protegidas.
- Tabla `profiles`, triggers, RLS y migraciones.
- Tipos generados de la base de datos.
- Persistencia de puntuaciones o leaderboard real.
- Migración de `GAMES`, `seededScores` o la actividad del home.
- Service role key, `SUPABASE_DB_PASSWORD` o secretos administrativos.
- Storage, Realtime, Edge Functions y OAuth.
- Cambios visuales, páginas nuevas o modificaciones al login simulado.
- Tests automatizados, i18n y analítica.

Cada uno de esos puntos, si llega, va en su propia spec.
