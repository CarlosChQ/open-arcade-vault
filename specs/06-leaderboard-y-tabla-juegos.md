# SPEC 06 — Leaderboard real y catálogo de juegos en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 05
> **Fecha:** 2026-11-22
> **Objetivo:** Persistir el catálogo y las puntuaciones en Supabase para que la biblioteca, el detalle, el salón de la fama y el home muestren datos reales, y que Asteroides guarde la mejor marca de cada jugador.

## Por qué existe esta spec

SPEC 04 conectó Supabase pero dejó el esquema vacío. SPEC 05 hizo jugable Asteroides pero dejó `GUARDAR PUNTUACIÓN` como un toast local. Hoy el catálogo vive en `app/data/games.ts`, los leaderboards se generan con `seededScores()` y el home usa `ACTIVITY_FEED` y `TOP_PLAYERS` inventados.

Esta spec cierra esa deuda en una sola capa de datos: una tabla `games` para el catálogo, una tabla `scores` para las marcas y dos vistas de lectura para no repetir agregaciones en TypeScript. También conecta el modal de fin de partida con una función Postgres que conserva la mejor marca de cada jugador.

No implementa autenticación real. El nombre del jugador sigue siendo el que escribe en el modal o el usuario en memoria de `UserProvider`. La identidad verificada llega en otra spec.

Esta spec deja sin efecto dos criterios de SPEC 04: el que prohibía crear tablas y el que exigía que ninguna página importara `app/lib/supabase/*`. También deja sin efecto el criterio de SPEC 05 que obligaba a que `GUARDAR PUNTUACIÓN` no escribiera en ningún almacenamiento.

## Alcance

**In:**

- Migración `supabase/migrations/20261122000000_games_and_scores.sql`, aplicada al proyecto con `apply_migration`.
- Tabla `public.games` con los 9 juegos actuales, ordenados por `sort_order`.
- Tabla `public.scores` con una fila por combinación `game_id` + `player_name`.
- Vista `public.game_catalog` con el catálogo y `best = max(score)` calculado.
- Vista `public.global_leaderboard` con el mejor score por jugador a nivel global.
- Función `public.submit_score(p_game_id, p_player_name, p_score)` con validación, upsert condicional y retorno `(best_score, improved)`.
- RLS y permisos: lectura pública de las dos tablas y las dos vistas; ninguna escritura directa para `anon` ni `authenticated`; escritura solo a través de `submit_score`.
- Seed idempotente de 9 juegos y 108 puntuaciones demo (12 por juego).
- Tipos generados en `app/lib/supabase/database.types.ts` y clientes tipados con `Database`.
- Repositorio de lectura `app/lib/games/repository.ts` con fallback a `GAMES`, `seededScores`, `ACTIVITY_FEED` y `TOP_PLAYERS`.
- Utilidades de formato de fecha y tiempo relativo en `app/lib/games/format.ts`.
- Server Action `app/actions/scores.ts` con `saveScore()`.
- `/games` leyendo el catálogo real, con las tarjetas actuales.
- `/games/[id]` leyendo juego, `best` y leaderboard reales.
- `/hall-of-fame` con tabs por juego, podio y tabla reales.
- Home con las seis mini-tarjetas, la actividad reciente y el top 5 global reales.
- Modal de fin de partida de Asteroides conectado a `saveScore()`, con estados de guardado, error y récord no superado.
- Skeletons mínimos para cada frontera de `Suspense`.
- Verificación con `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build` y pruebas manuales a 390px y 1440px.

**Fuera de alcance (para futuras specs):**

- Autenticación real, registro, sesión, `profiles`, `user_id` o récords firmados.
- Anti-cheat, rate limiting, CAPTCHA o validación de partidas en servidor.
- CRUD de juegos o de puntuaciones desde la UI, edición, borrado y moderación.
- Guardar el historial completo de cada partida; solo se conserva la mejor marca por jugador y juego.
- Realtime, polling o actualización automática sin recargar.
- Paginación, búsqueda o filtros funcionales en `/games`; `LibraryFilters` sigue decorativo.
- Migrar `STATS`, precios, FAQ o cualquier copy de marketing del home.
- Hacer jugables los otros ocho juegos del catálogo.
- Cambios en ROCAS, su detalle o su reproductor decorativo.
- Controles táctiles, sonido o gamepad.
- Tests automatizados, i18n, analítica y PWA/offline.
- Service role key, `SUPABASE_DB_PASSWORD` o cualquier secreto administrativo.

## Modelo de datos

### Esquema Postgres

La migración crea este esquema. Los valores de `cat`, `cover` y `color` están restringidos con `check` para que coincidan con las uniones de TypeScript.

```sql
create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null check (cover in (
    'cover-bricks', 'cover-tetro', 'cover-snake', 'cover-glot',
    'cover-invaders', 'cover-rocas', 'cover-rana', 'cover-duelo',
    'cover-asteroides'
  )),
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  plays text not null,
  sort_order integer not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  player_name text not null check (
    player_name = upper(player_name)
    and char_length(player_name) between 1 and 10
  ),
  score bigint not null check (score > 0 and score <= 100000000),
  created_at timestamptz not null default now(),
  constraint scores_game_player_unique unique (game_id, player_name)
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_created_at_idx on public.scores (created_at desc);
```

`games.sort_order` es la única fuente de orden del catálogo: 1 para `bloque-buster`, 2 para `caida`, y así hasta 9 para `asteroides`. El home usa los seis primeros.

`games.plays` conserva el texto decorativo actual (`"12.4K"`). No se incrementa al guardar una puntuación.

### Vistas de lectura

```sql
create view public.game_catalog
with (security_invoker = true)
as
select
  g.id, g.title, g.short, g.long, g.cat, g.cover, g.color, g.plays,
  g.sort_order,
  coalesce(max(s.score), 0)::bigint as best
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id, g.title, g.short, g.long, g.cat, g.cover, g.color, g.plays, g.sort_order;

create view public.global_leaderboard
with (security_invoker = true)
as
select
  player_name,
  max(score)::bigint as score
from public.scores
group by player_name
order by score desc, player_name asc;
```

Convenciones:

- `game_catalog.best` es `0` cuando el juego no tiene puntuaciones.
- `global_leaderboard` devuelve una fila por jugador, no una por partida.
- Ambas vistas usan `security_invoker = true` para respetar RLS. Sin eso, la vista se saltaría las políticas de las tablas.
- La app nunca escribe en `games` en tiempo de ejecución. El catálogo cambia solo con migraciones.

### Función de escritura

```sql
public.submit_score(p_game_id text, p_player_name text, p_score bigint)
returns table (best_score bigint, improved boolean)
```

Comportamiento:

- Normaliza el nombre con `upper(btrim(p_player_name))`.
- Rechaza nombres de longitud fuera de 1–10, scores nulos, menores o iguales a 0, mayores a 100 000 000, o `game_id` inexistente.
- Si no existe fila para `(p_game_id, nombre)`, inserta y devuelve `improved = true`.
- Si existe y `p_score` es mayor, actualiza `score` y `created_at = now()`, y devuelve `improved = true`.
- Si existe y `p_score` es menor o igual, no modifica nada y devuelve la mejor marca con `improved = false`.
- Se declara `security definer`, con `set search_path = public`, y usa `on conflict (game_id, player_name)` para ser atómica ante llamadas simultáneas.
- No acepta SQL dinámico ni nombres de tabla por parámetro.

### Permisos y RLS

```sql
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_public_read" on public.games for select using (true);
create policy "scores_public_read" on public.scores for select using (true);

revoke all on public.games from anon, authenticated;
revoke all on public.scores from anon, authenticated;
grant select on public.games to anon, authenticated;
grant select on public.scores to anon, authenticated;

grant select on public.game_catalog to anon, authenticated;
grant select on public.global_leaderboard to anon, authenticated;

revoke all on function public.submit_score(text, text, bigint) from public;
grant execute on function public.submit_score(text, text, bigint) to anon, authenticated;
```

Convenciones:

- No hay políticas de `insert`, `update` o `delete` en `scores` ni en `games`.
- Aunque un cliente tenga la publishable key, un `POST`, `PATCH` o `DELETE` directo a `/rest/v1/scores` debe fallar.
- `submit_score` es el único camino de escritura.
- La publishable key sigue siendo pública; la seguridad depende de RLS, de los `check` y de la función.

### Seed

La migración inserta:

- Los 9 juegos de `GAMES`, con los mismos `id`, `title`, `short`, `long`, `cat`, `cover`, `color` y `plays`.
- 12 puntuaciones por juego, con los 12 primeros nombres de `PLAYERS`: `PX_KAI`, `NEONFOX`, `Z3R0COOL`, `M00NRYU`, `VAULT_07`, `GLITCHA`, `ATARI_KID`, `CYBER_LU`, `MAGENTA88`, `SCANLINE`, `BIT_LORD` y `ARKADYA`.
- Scores deterministas y distintos por juego, entre 10 000 y 260 000, para que el podio y las tablas no arranquen vacíos.
- Fechas `created_at` entre el 2026-09-01 y el 2026-11-20, para que la actividad reciente tenga datos.
- `on conflict do nothing` en `scores` y `on conflict (id) do update` en `games`, para que la migración sea idempotente.

Los valores del seed son datos de demostración. No representan partidas reales y se pueden reemplazar sin tocar la app.

### Tipos de TypeScript

```ts
// app/lib/games/repository.ts
export async function getGames(): Promise<Game[]>;
export async function getGameById(id: string): Promise<Game | null>;
export async function getLeaderboard(gameId: string, limit?: number): Promise<ScoreRow[]>;
export async function getHallOfFame(limit?: number): Promise<{
  games: Game[];
  leaderboards: Record<string, ScoreRow[]>;
}>;
export async function getRecentActivity(limit?: number): Promise<ActivityRow[]>;
export async function getTopPlayers(limit?: number): Promise<TopPlayer[]>;
```

Convenciones del repositorio:

- `getGames()` consulta `game_catalog` ordenado por `sort_order` y mapea cada fila a `Game`, con `best` incluido.
- `getGameById(id)` consulta `game_catalog` por `id`; devuelve `null` si no existe.
- `getLeaderboard(gameId, limit = 10)` consulta `scores` por `game_id`, ordena por `score desc, created_at asc, player_name asc` y numera `rank` desde 1.
- `getHallOfFame(limit = 12)` obtiene el catálogo y ejecuta las consultas de leaderboard en paralelo.
- `getRecentActivity(limit = 7)` consulta las últimas filas de `scores` con su juego, ordena por `created_at desc` y calcula `time` con `formatRelativeTime()`.
- `getTopPlayers(limit = 5)` consulta `global_leaderboard` y numera `rank` desde 1.
- `getGames()` usa `GAMES` si `isSupabaseConfigured()` es `false`, si la consulta lanza un error o si la tabla devuelve cero filas.
- Los demás métodos usan sus fixtures (`seededScores`, `ACTIVITY_FEED`, `TOP_PLAYERS`) en los mismos casos.
- Un error de Supabase se registra en el servidor con `console.error("[supabase] …")` y no se propaga al cliente.
- `cat`, `cover` y `color` se validan contra sus uniones antes de construir `Game`; una fila con un valor inválido se descarta y se registra el `id`.
- `ScoreRow.date` se formatea como `DD/MM/YYYY` con `Intl.DateTimeFormat("es-ES", { timeZone: "UTC" })`.

```ts
// app/lib/games/format.ts
export function formatScoreDate(iso: string): string;   // "22/11/2026"
export function formatRelativeTime(iso: string): string; // "hace 2 min", "hace 3 h", "hace 5 d"
```

```ts
// app/actions/scores.ts
export type SaveScoreError =
  | "not_configured"
  | "invalid"
  | "unknown_game"
  | "save_failed";

export async function saveScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<
  | { ok: true; bestScore: number; improved: boolean }
  | { ok: false; error: SaveScoreError }
>;
```

Convenciones de `saveScore()`:

- Es un Server Action (`"use server"`) y se importa solo desde componentes cliente.
- Normaliza el nombre a mayúsculas y recorta espacios antes de llamar al RPC.
- Rechaza scores que no sean enteros, menores o iguales a 0, o mayores a 100 000 000.
- Llama `supabase.rpc("submit_score", { p_game_id, p_player_name, p_score })`.
- Toma la primera fila del resultado y devuelve `{ ok: true, bestScore, improved }`.
- Traduce los errores `invalid_score`, `invalid_player_name` y `unknown_game` a `invalid` o `unknown_game`; cualquier otro error es `save_failed`.
- No usa service role ni escribe directamente en `scores`.

### Contrato de las pantallas

`/games`:

- Hero y `LibraryFilters` siguen estáticos.
- La grilla se renderiza dentro de `<Suspense>` con un fallback de 9 tarjetas esqueleto.
- Cada tarjeta usa `Game` del repositorio, incluido `best` calculado.
- Los filtros siguen siendo decorativos.

`/games/[id]`:

- `generateStaticParams()` sigue usando `GAMES`, para que el build no dependa de Supabase.
- La existencia del `id` se valida contra `GAMES` antes del `Suspense`; si no está, `notFound()`.
- El detalle y su leaderboard de 10 filas se leen dentro de `<Suspense>` con `getGameById()` y `getLeaderboard()`.
- Si el leaderboard está vacío, se muestra una fila `AÚN NO HAY PUNTUACIONES`.
- `Mejor global` usa `game.best`; `Partidas` sigue usando `game.plays`.

`/hall-of-fame`:

- La página es un Server Component que resuelve `getHallOfFame(12)` dentro de `<Suspense>`.
- `HallOfFame` sigue siendo cliente y recibe `games` y `leaderboards` por props.
- El podio usa los tres primeros; si faltan filas, muestra `—` en nombre, score y fecha.
- La tabla muestra las 12 filas; si no hay ninguna, muestra un estado vacío.
- `user` sigue saliendo de `useUser()`.
- Si hay usuario y Supabase está configurado, la fila `TU MEJOR MARCA` consulta `scores` desde el navegador con `createSupabaseBrowserClient()` y calcula el puesto contando los scores mayores.
- Si el usuario no tiene marca, la fila dice `SIN MARCA REGISTRADA EN {JUEGO}`.
- Si Supabase no está configurado, se conserva la fila sintética actual para no romper el modo demo.

`/` (home):

- Las seis mini-tarjetas usan `getGames()` y `slice(0, 6)` dentro de `<Suspense>`.
- La sección `ACTIVIDAD EN VIVO` usa `getRecentActivity(7)` y `getTopPlayers(5)` dentro de `<Suspense>`.
- El título `TOP JUGADORES · HOY` cambia a `TOP JUGADORES · GLOBAL`, porque el ranking es histórico y no de las últimas 24 horas.
- `ACTIVITY_FEED` y `TOP_PLAYERS` quedan solo como fallback.

`/play/[id]`:

- Sigue leyendo `GAMES` para la cáscara del reproductor. No necesita Supabase para renderizar.
- `AsteroidsPlayer` recibe el `game.id` y lo usa para guardar la puntuación.

`AsteroidsPlayer`:

- Reemplaza el booleano `saved` por `saveState: "idle" | "saving" | "saved" | "not_improved" | "error"`.
- `GUARDAR PUNTUACIÓN` se deshabilita con score 0, nombre vacío o mientras guarda.
- Al guardar con `improved: true`, muestra `PUNTUACIÓN GUARDADA_` y llama `router.refresh()`.
- Al guardar con `improved: false`, muestra `NO SUPERA TU RÉCORD: {bestScore}`.
- Con `not_configured`, muestra `SUPABASE NO ESTÁ CONFIGURADO`.
- Con `invalid`, muestra `REVISA EL NOMBRE Y LA PUNTUACIÓN`.
- Con `save_failed`, muestra `NO SE PUDO GUARDAR. REINTENTA.` y deja el botón activo.
- `JUGAR DE NUEVO` vuelve a `saveState = "idle"`.
- El input sigue limitado a 10 caracteres y se muestra en mayúsculas.

## Plan de implementación

1. Crear `supabase/migrations/20261122000000_games_and_scores.sql` con las tablas, vistas, RPC, RLS, permisos y seed. Aplicarla al proyecto con `apply_migration` (nombre `games_and_scores`). Verificar con SQL que hay 9 juegos, 108 scores, que `game_catalog.best` coincide con `max(score)` y que `submit_score` inserta, mejora y rechaza valores inválidos.
2. Generar `app/lib/supabase/database.types.ts` desde el esquema real y actualizar `client.ts` y `server.ts` para usar `createBrowserClient<Database>` y `createServerClient<Database>`. Verificar con `npx tsc --noEmit`.
3. Crear `app/lib/games/format.ts` con `formatScoreDate()` y `formatRelativeTime()`. Verificar los formatos con fechas conocidas y `timeZone: "UTC"`.
4. Crear `app/lib/games/repository.ts` con las seis funciones, el mapeo `Game`, los fallbacks y los `try/catch`. Verificar con `npx tsc --noEmit`; el archivo no debe importarse desde componentes cliente.
5. Crear `app/actions/scores.ts` con `saveScore()` y sus validaciones. Verificar el RPC primero con SQL y después con una llamada manual desde el modal en el paso 9.
6. Crear `app/components/catalog-grid.tsx` y actualizar `app/games/page.tsx` para renderizarlo dentro de `<Suspense>`. Verificar 9 tarjetas, `best` real y fallback al quitar las variables de Supabase.
7. Crear `app/components/game-detail-view.tsx` y actualizar `app/games/[id]/page.tsx` para usarlo dentro de `<Suspense>`, manteniendo `generateStaticParams()` y la validación contra `GAMES`. Verificar detalle, `Mejor global` y 10 filas de leaderboard.
8. Actualizar `app/hall-of-fame/page.tsx` para resolver `getHallOfFame(12)` dentro de `<Suspense>` y pasar `games` y `leaderboards` a `HallOfFame`. Actualizar el componente cliente para usar props, manejar podio/table vacíos y consultar la marca personal real. Verificar las 9 tabs.
9. Crear `app/components/home-catalog.tsx` y `app/components/home-activity.tsx`; actualizar `app/page.tsx` para usarlos dentro de `<Suspense>` y cambiar el título a `TOP JUGADORES · GLOBAL`. Verificar mini-tarjetas, actividad y top 5 reales.
10. Conectar `app/components/asteroids-player.tsx` con `saveScore()` y los cinco estados de guardado. Verificar partida con score nuevo, score menor, score 0, nombre vacío, Supabase apagado y error de red.
11. Añadir solo las clases de skeleton necesarias en `app/globals.css` y reutilizar `.av-grid`, `.mini-rail`, `.activity-grid`, `.av-detail`, `.leaderboard` y `.hall-table` como contenedores. Verificar a 390px y 1440px.
12. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build` con `.env.local` presente y con `.env.local` apartado. Repetir una partida completa y navegar a `/games`, `/games/asteroides` y `/hall-of-fame` para confirmar que la puntuación aparece.

## Criterios de aceptación

- [ ] `supabase/migrations/20261122000000_games_and_scores.sql` existe y la migración está aplicada al proyecto.
- [ ] `public.games` tiene exactamente 9 filas, con los mismos `id` que `GAMES` y `sort_order` de 1 a 9.
- [ ] `public.scores` tiene 108 filas, 12 por juego, y una sola fila por `(game_id, player_name)`.
- [ ] `public.game_catalog` devuelve 9 filas y `best` coincide con `max(score)` de cada juego.
- [ ] `public.game_catalog.best` es `0` para un juego sin puntuaciones.
- [ ] `public.global_leaderboard` devuelve una fila por jugador con su `max(score)`.
- [ ] `submit_score` con un jugador nuevo inserta la fila y devuelve `improved = true`.
- [ ] `submit_score` con un score mayor actualiza la fila, actualiza `created_at` y devuelve `improved = true`.
- [ ] `submit_score` con un score menor o igual conserva la marca anterior y devuelve `improved = false`.
- [ ] `submit_score` rechaza score 0, score negativo, score mayor a 100 000 000, nombre vacío, nombre de más de 10 caracteres y `game_id` inexistente.
- [ ] `anon` puede hacer `select` sobre `games`, `scores`, `game_catalog` y `global_leaderboard`.
- [ ] `anon` no puede hacer `insert`, `update` ni `delete` directo sobre `games` ni `scores`.
- [ ] `submit_score` es `security definer`, tiene `search_path = public` y no está ejecutable por `public`.
- [ ] `app/lib/supabase/database.types.ts` incluye las dos tablas, las dos vistas y la función.
- [ ] `createSupabaseBrowserClient()` y `createSupabaseServerClient()` usan el genérico `Database`.
- [ ] `/games` muestra 9 tarjetas con el `best` de `game_catalog`.
- [ ] Cambiar el `title` de un juego en la base de datos se refleja en `/games` tras recargar.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL` o sin llave, `/games` sigue mostrando las 9 tarjetas desde `GAMES`.
- [ ] `/games/asteroides` muestra el `Mejor global` de `game_catalog` y 10 filas de `scores`.
- [ ] `/games/asteroides` muestra `AÚN NO HAY PUNTUACIONES` si el leaderboard está vacío.
- [ ] `/hall-of-fame` muestra 12 filas por tab, podio con los tres primeros y estado vacío cuando no hay filas.
- [ ] El home muestra las seis primeras entradas de `game_catalog` en las mini-tarjetas.
- [ ] El home muestra las últimas 7 puntuaciones de `scores` y el top 5 de `global_leaderboard`.
- [ ] El título del home dice `TOP JUGADORES · GLOBAL`.
- [ ] Guardar una puntuación nueva desde Asteroides la inserta y muestra `PUNTUACIÓN GUARDADA_`.
- [ ] Guardar una puntuación menor muestra `NO SUPERA TU RÉCORD: {bestScore}` y no modifica la fila.
- [ ] Guardar con score 0 mantiene el botón deshabilitado y no llama al RPC.
- [ ] Guardar con nombre vacío mantiene el botón deshabilitado.
- [ ] Sin Supabase configurado, guardar muestra `SUPABASE NO ESTÁ CONFIGURADO` y no finge que guardó.
- [ ] Si el RPC falla, el modal muestra `NO SE PUDO GUARDAR. REINTENTA.` y permite reintentar.
- [ ] Después de guardar, navegar a `/games/asteroides` o `/hall-of-fame` muestra la puntuación.
- [ ] Con usuario en memoria, `TU MEJOR MARCA` muestra su score y puesto reales; sin marca muestra `SIN MARCA REGISTRADA`.
- [ ] En modo fallback, `TU MEJOR MARCA` conserva el comportamiento sintético actual.
- [ ] Los filtros de `/games` siguen sin filtrar, como en SPEC 01 y SPEC 02.
- [ ] `/play/rocas`, `/play/bloque-buster`, `/about` y `/auth` se ven igual que antes.
- [ ] No se agregan variables de entorno, dependencias ni un archivo `proxy.ts`.
- [ ] No aparece ninguna cookie de autenticación nueva.
- [ ] No hay errores ni warnings de hidratación en la consola del navegador.
- [ ] Las pantallas nuevas se ven sin solapamientos a 390px y 1440px.
- [ ] `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores con y sin `.env.local`.

## Decisiones tomadas y descartadas

- **Sí:** una sola spec para catálogo y leaderboard. Comparten esquema, repositorio y fallback; separarlas obligaría a tocar dos veces las mismas pantallas.
- **Sí:** tabla `games` en Supabase en lugar de una tabla visual en `/games`. La UI de tarjetas ya existe y el usuario no pidió reemplazarla.
- **Sí:** `game_catalog` como vista con `best = max(score)`. Evita guardar un `best_score` desincronizado y mantiene el cálculo en Postgres.
- **Sí:** `global_leaderboard` como vista. El home necesita un top por jugador y PostgREST no hace `group by` sin una vista o un RPC.
- **Sí:** una fila por `(game_id, player_name)`. El leaderboard nunca repite nombres y `TU MEJOR MARCA` es una consulta directa.
- **Sí:** `submit_score` como único camino de escritura. Centraliza la validación y la comparación de récords en una operación atómica.
- **Sí:** `security definer` con `search_path` fijo y `execute` revocado de `public`. Evita que `anon` escriba directamente en `scores`.
- **Sí:** solo lectura pública de tablas y vistas. El catálogo se modifica con migraciones, no desde la app.
- **Sí:** seed de 108 puntuaciones demo. El podio y las tablas actuales esperan filas; arrancar vacío habría obligado a rediseñar el estado inicial.
- **Sí:** `best` calculado y `plays` estático. `plays` es copy de marketing y no hay eventos de partida que lo justifiquen.
- **Sí:** lectura siempre fresca en Server Components, sin `"use cache"` ni Realtime. Los datos son pequeños y el usuario eligió no añadir caché ni suscripciones.
- **Sí:** `<Suspense>` en cada lectura de Supabase. Es obligatorio con `cacheComponents` y evita que el build falle por datos sin cachear.
- **Sí:** fallback a `GAMES`, `seededScores`, `ACTIVITY_FEED` y `TOP_PLAYERS`. Mantiene el build y el modo demo sin `.env.local`.
- **Sí:** el fallback también se activa si la tabla `games` está vacía. Un catálogo vacío rompería el home y el nav.
- **Sí:** mini-tarjetas del home desde Supabase. Si el catálogo es real, el home no debe mostrar una copia estática.
- **Sí:** cambiar `TOP JUGADORES · HOY` a `TOP JUGADORES · GLOBAL`. El ranking es histórico; el copy anterior habría sido falso.
- **Sí:** score 0 no se guarda. Un leaderboard lleno de ceros no aporta y el RPC ya exige `score > 0`.
- **Sí:** avisar cuando la marca no se supera. El jugador ve el récord que conserva en lugar de un toast engañoso.
- **Sí:** consultar `TU MEJOR MARCA` desde el navegador. El usuario vive en `UserProvider` y el servidor no conoce su nombre; la política de `select` permite esa lectura.
- **Sí:** mantener `/play/[id]` leyendo `GAMES`. El reproductor solo necesita la cáscara del juego; migrarlo a Supabase añadiría una frontera dinámica sin beneficio.
- **Sí:** conservar `GAMES` como fuente del seed y del fallback. Borrarlo obligaría a que el build dependiera de Supabase.
- **Sí:** `generateStaticParams()` desde `GAMES`. El build no necesita red y las 9 rutas siguen siendo válidas.
- **No:** autenticación real, `profiles` o `user_id`. Es otra spec y multiplicaría el alcance.
- **No:** anti-cheat o rate limiting. Sin identidad verificada no hay forma sólida de impedir scores falsos; se documenta como riesgo.
- **No:** guardar cada partida. La mejor marca por jugador es el modelo elegido.
- **No:** CRUD de juegos o moderación. El catálogo se administra con migraciones.
- **No:** Realtime. El usuario eligió refresco al navegar y `router.refresh()` tras guardar.
- **No:** caché con `cacheTag`. Añadiría invalidación sin una necesidad medida.
- **No:** una tabla visual en `/games`. La grilla de tarjetas se mantiene.
- **No:** filtros funcionales. Siguen decorativos, como en las specs anteriores.
- **No:** tocar los otros ocho juegos. Solo Asteroides guarda puntuaciones.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Cualquiera puede enviar un score falso por el RPC | Se validan nombre, score y juego; no hay escritura directa. El anti-cheat real necesita autenticación y queda para su spec. |
| `security definer` mal configurado permite escrituras amplias | `search_path = public`, sin SQL dinámico, `revoke all ... from public` y `grant execute` solo a `anon` y `authenticated`. |
| Las vistas se saltan RLS | Se crean con `security_invoker = true` y se prueba el acceso con la publishable key. |
| El fallback oculta un fallo de Supabase y muestra datos viejos | Cada error se registra en el servidor; se verifica el comportamiento con y sin `.env.local` y con una tabla vacía. |
| El build falla por datos sin cachear | Toda llamada al repositorio vive dentro de `<Suspense>`; se ejecuta `npm run build` como verificación final. |
| Dos guardados simultáneos del mismo jugador duplican filas | La restricción `unique (game_id, player_name)` y el `on conflict` del RPC resuelven la carrera. |
| Los tipos generados se desincronizan del esquema | Se generan después de aplicar la migración y se regeneran en cualquier cambio futuro. |
| El seed de demo se confunde con partidas reales | Se documenta como demo y se puede reemplazar; no hay marca visual porque el usuario no la pidió. |
| El home se vuelve más lento por tres consultas | Las consultas van en paralelo dentro de `Suspense` y el catálogo tiene 9 filas. |
| `TU MEJOR MARCA` no aparece si el cliente no tiene red | Se muestra `SIN MARCA REGISTRADA` o se conserva el fallback; no rompe la tabla. |
| Cambiar `GAMES` sin actualizar el seed desincroniza el catálogo | `GAMES` sigue siendo la fuente del seed y del fallback; la migración se actualiza en el mismo cambio. |
| El usuario espera ver su partida en el leaderboard sin recargar | `router.refresh()` corre tras guardar y el leaderboard se lee fresco al navegar; no hay Realtime. |

## Lo que **no** entra en esta spec

- Autenticación real, registro, login, logout, `profiles` o `user_id`.
- Anti-cheat, rate limiting, CAPTCHA o validación de partidas en servidor.
- CRUD de juegos, edición o borrado de puntuaciones y moderación.
- Historial completo de partidas.
- Realtime, polling o actualización automática.
- Paginación, búsqueda o filtros funcionales.
- Migrar el copy de marketing del home.
- Hacer jugables los otros ocho juegos.
- Cambios en ROCAS o en su reproductor.
- Controles táctiles, sonido o gamepad.
- Tests automatizados, i18n, analítica y PWA/offline.
- Service role key o `SUPABASE_DB_PASSWORD` en la app.

Cada uno de esos puntos, si llega, va en su propia spec.
