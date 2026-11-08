# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-11-07
> **Objetivo:** Implementar visualmente las cinco pantallas del template de Arcade Vault con rutas reales y datos ficticios locales, sin lógica de juego.

## Por qué existe esta spec

El repositorio ya tiene el tema visual portado a `app/globals.css` y las fuentes configuradas en `app/layout.tsx`. Falta convertir el prototipo de `references/resources/templates/` (React UMD + hash router) en pantallas reales del App Router. Esta spec fija el alcance visual y deja explícito qué NO se implementa para que la primera iteración no derive en un motor de juegos, autenticación real o persistencia.

## Alcance

**In:**

- Rutas reales del App Router: `/` (biblioteca), `/games/[id]` (detalle), `/play/[id]` (reproductor), `/auth` (acceso) y `/hall-of-fame` (salón de la fama).
- Barra de navegación compartida con panel móvil, contador de créditos y botón de usuario.
- Footer compartido en todas las pantallas.
- Biblioteca: hero con título parpadeante, buscador, chips de categoría y grid de 8 tarjetas con portadas generadas en CSS, tilt al pasar el ratón y botón JUGAR.
- Detalle: portada, tags, descripción larga, tira de estadísticas, acciones y leaderboard de 10 filas.
- Reproductor: HUD estático, marco CRT con arena decorativa, overlay de pausa y modal de fin de juego.
- Acceso: tabs de iniciar sesión / crear cuenta, campos, botón de invitado y botones sociales decorativos.
- Salón de la fama: tabs por juego, podio de tres posiciones, tabla de 12 filas y fila "tu mejor marca" cuando hay usuario en memoria.
- Datos ficticios tipados en `app/data/games.ts` como semilla de una futura base de datos.
- Contexto de usuario en memoria (sin persistencia) para que el nav y el HUD muestren el nombre.
- `notFound()` para ids de juego inexistentes.
- Responsive según los breakpoints ya definidos en `globals.css` (900px, 840px, 720px).

**Fuera de alcance (para futuras specs):**

- Cualquier juego real: canvas, motor, controles, colisiones o puntuación simulada.
- Persistencia de usuario o puntuaciones (`localStorage`, cookies, base de datos).
- Autenticación real y OAuth de Google/GitHub.
- Búsqueda y filtrado funcionales: el buscador y los chips son decorativos en esta spec.
- Guardado real de puntuaciones desde el modal de fin de juego.
- Página 404 personalizada (se usa el `not-found` por defecto de Next.js).
- Tests automatizados, i18n, analítica y panel de administración.
- Cambios de diseño fuera del template de referencia.

## Modelo de datos

Todo vive en `app/data/games.ts`. Es data estática tipada, no una capa de acceso a datos.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type CoverName =
  | "cover-bricks"
  | "cover-tetro"
  | "cover-snake"
  | "cover-glot"
  | "cover-invaders"
  | "cover-rocas"
  | "cover-rana"
  | "cover-duelo";

export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: CoverName;
  color: AccentColor;
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export interface SessionUser {
  name: string;
}

export const GAMES: Game[] = [/* los 8 juegos del template */];
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;

export function seededScores(seed: number, count = 12): ScoreRow[];
```

Convenciones:

- `GAMES` conserva los 8 ids del template: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`.
- `seededScores` es determinista: mismo `seed` produce las mismas filas en servidor y cliente.
- Los seeds usados son los del template: detalle `id.length * 17 + 3` (10 filas) y salón `tab.length * 23 + 7` (12 filas).
- El locale de formateo es siempre `"es-ES"`.
- El usuario de sesión solo tiene `name`; no hay email, rol ni token.

## Plan de implementación

1. Crear `app/data/games.ts` con los tipos, los 8 juegos, `CATS`, `PLAYERS` y `seededScores`. Verificar con `npx tsc --noEmit`.
2. Crear `app/components/user-context.tsx` como client component con `UserProvider` y `useUser` (expone `user`, `signIn`, `signOut`). Verificar que compila.
3. Crear `app/components/site-footer.tsx` y actualizar `app/layout.tsx` para envolver `children` con `UserProvider`, `SiteNav` y `SiteFooter` dentro de `.av-app`. Verificar `/` con nav y footer.
4. Crear `app/components/site-nav.tsx` como client component: logo, links Biblioteca y Salón, contador de créditos, botón de usuario o iniciar sesión, hamburguesa y panel móvil. Usar `usePathname` y `next/link`; detalle y reproductor marcan Biblioteca como activa.
5. Reescribir `app/page.tsx` como biblioteca: hero, bloque de filtros decorativos y grid de 8 tarjetas. Crear `app/components/game-card.tsx` (client, tilt con `onMouseMove`) que enlaza a `/games/[id]`.
6. Crear `app/games/[id]/page.tsx` con `PageProps<"/games/[id]">`, `const { id } = await params`, `notFound()` si el id no existe, portada, tags, descripción, estadísticas, acciones y leaderboard de 10 filas.
7. Crear `app/components/game-player.tsx` (client) y `app/play/[id]/page.tsx`: HUD estático con score 0, 3 vidas y nivel 01; arena CRT decorativa; PAUSA alterna el overlay; FIN abre el modal; GUARDAR muestra el toast; JUGAR DE NUEVO reinicia el estado; SALIR y VOLVER AL VAULT navegan fuera.
8. Crear `app/components/auth-form.tsx` (client) y `app/auth/page.tsx`: tabs de login/registro, campo de email solo en registro, envío que llama `signIn({ name })` y navega a `/`, invitado que navega a `/` sin usuario y botones sociales deshabilitados visualmente.
9. Crear `app/components/hall-of-fame.tsx` (client) y `app/hall-of-fame/page.tsx`: tabs por juego, podio, tabla de 12 filas y fila "tu mejor marca" solo si `useUser()` devuelve usuario.
10. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que aparezca hasta que los cuatro pasen.

## Criterios de aceptación

- [ ] `/` muestra el hero con el título ARCADE VAULT y el subtítulo con cursor parpadeante.
- [ ] `/` muestra un buscador, cinco chips de categoría y las 8 tarjetas de juego.
- [ ] Cada tarjeta muestra portada, categoría, título, descripción, mejor puntuación formateada y botón JUGAR.
- [ ] Al pulsar una tarjeta o su botón JUGAR se navega a `/games/<id>` del juego correspondiente.
- [ ] `/games/<id>` muestra portada, tags, título, descripción larga, tira de estadísticas y leaderboard de 10 filas.
- [ ] `/games/no-existe` responde con la página 404 de Next.js.
- [ ] JUGAR AHORA navega a `/play/<id>` y VOLVER AL VAULT navega a `/`.
- [ ] `/play/<id>` muestra jugador, puntuación 0, 3 vidas y nivel 01 sin simular una partida.
- [ ] El botón PAUSA muestra el overlay EN PAUSA y el mismo botón lo oculta.
- [ ] El botón FIN abre el modal FIN DEL JUEGO con puntuación final 0 y campo de nombre.
- [ ] GUARDAR PUNTUACIÓN muestra el toast sin escribir en ningún almacenamiento.
- [ ] JUGAR DE NUEVO cierra el modal y restablece la puntuación, vidas y nivel.
- [ ] SALIR navega al detalle del juego y VOLVER AL VAULT navega a `/`.
- [ ] `/auth` alterna entre INICIAR SESIÓN y CREAR CUENTA; el campo de email solo aparece en registro.
- [ ] Enviar el formulario de acceso navega a `/` y el nav muestra el nombre del usuario en mayúsculas.
- [ ] El botón de usuario en el nav cierra la sesión y vuelve a mostrar Iniciar Sesión.
- [ ] JUGAR COMO INVITADO navega a `/` sin crear usuario.
- [ ] `/hall-of-fame` muestra tabs de los 8 juegos, podio de tres posiciones y tabla de 12 filas.
- [ ] Cambiar de tab actualiza el podio y la tabla del juego seleccionado.
- [ ] Con usuario en memoria, el salón muestra la fila "TU MEJOR MARCA"; sin usuario, no la muestra.
- [ ] Los links del nav navegan a `/`, `/hall-of-fame` y `/auth`, y resaltan la sección activa.
- [ ] En detalle y reproductor, el link Biblioteca aparece como activo.
- [ ] En viewport móvil, la hamburguesa abre el panel lateral y cada link lo cierra y navega.
- [ ] Escribir en el buscador y pulsar chips no filtra la grilla; los chips solo cambian el estado activo.
- [ ] Todas las pantallas se ven sin solapamientos a 390px y a 1440px de ancho.
- [ ] No hay errores ni warnings de hidratación en la consola del navegador.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** rutas reales del App Router. URLs compartibles, prefetch y back/forward funcionan.
- **Sí:** slugs en inglés (`/games`, `/play`, `/hall-of-fame`). Separar el contrato de URLs del copy en español.
- **Sí:** `/` es la biblioteca, sin landing intermedia. Es el punto de entrada del template.
- **Sí:** datos ficticios en `app/data/games.ts` con tipos exportados. Deja una semilla limpia para sustituir por base de datos después.
- **Sí:** usuario en memoria vía contexto cliente. Permite probar el nav y el salón sin implementar persistencia.
- **Sí:** reproductor solo visual con overlays. Cumple "no implementar ningún juego" sin dejar una pantalla muerta.
- **Sí:** buscador y chips decorativos; solo navegación y tabs tienen comportamiento.
- **Sí:** fidelidad 1:1 al template y reutilización de `globals.css`. Menos riesgo visual y verificación directa contra la referencia.
- **No:** router por hash del template. No aporta URLs reales ni integración con Next.
- **No:** `localStorage` (`av_user`, `av_scores`). Queda para la spec de autenticación/puntuaciones.
- **No:** ticker de puntuación simulado del template. Se consideró para dar vida a la pantalla, pero se descartó por la restricción de no implementar juego.
- **No:** filtrado real en la biblioteca. Se consideró trivial, pero se difiere para mantener esta spec puramente visual.
- **No:** 404 personalizada. `notFound()` con la página por defecto es suficiente para el MVP.
- **No:** OAuth real. Los botones de Google y GitHub se renderizan como decoración deshabilitada.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Desajuste de hidratación al formatear números o fechas | Locale fijo `"es-ES"` y `seededScores` determinista en cliente y servidor. |
| El tilt inline de las tarjetas obliga a un client component en toda la grilla | Aislar el tilt en `game-card.tsx` y dejar `page.tsx` como server component. |
| `cacheComponents` rompe el build por datos sin boundary | Usar solo data estática y `PageProps<...>` con `await params`; no añadir exports `dynamic`, `revalidate` ni `fetchCache`. |
| Confundir los filtros inertes con un bug | Queda registrado en alcance y criterios de aceptación; la lógica llega en otra spec. |

## Lo que **no** entra en esta spec

- Juegos jugables, puntuaciones reales o simulación de partidas.
- Persistencia, autenticación real y OAuth.
- Búsqueda y filtrado funcionales.
- Página 404 personalizada.
- Tests automatizados, i18n y analítica.

Cada uno de esos puntos, si llega, va en su propia spec.
