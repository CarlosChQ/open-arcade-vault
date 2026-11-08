# SPEC 02 — Landing de inicio y biblioteca en `/games`

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-08
> **Objetivo:** Implementar la landing pública en `/` según el template `home-about` y mover la biblioteca actual a `/games` con su navegación actualizada.

## Por qué existe esta spec

SPEC 01 dejó la biblioteca como punto de entrada en `/`. El template `home-about` introduce una landing real con hero, propuesta de valor, vista previa de juegos, estadísticas, actividad, precios y CTA final. Para que el home sea la portada, la biblioteca necesita una ruta propia y el nav necesita un link de Inicio. Esta spec fija ese cambio de rutas y el alcance visual para no mezclarlo con la página Acerca de ni con datos reales.

## Alcance

**In:**

- Nueva landing en `/` con estas secciones, en este orden:
  - Hero con eyebrow `▸ INSERTA UNA MONEDA_`, título en tres líneas, subtítulo, CTAs y flecha de scroll.
  - Ocho siluetas pixel decorativas flotando alrededor del hero.
  - Sección `// 01 ¿POR QUÉ ARCADE VAULT?` con cuatro tarjetas de features.
  - Sección `// 02 JUEGOS DISPONIBLES AHORA` con seis mini-tarjetas y botón `VER TODOS LOS JUEGOS →`.
  - Banda `12+ / MILES / GLOBAL` con tres bloques de estadísticas.
  - Sección `// 03 ACTIVIDAD EN VIVO` con ticker de últimas puntuaciones y top 5 de jugadores.
  - Sección `// 04 PRECIOS` con una tarjeta de plan único y tres preguntas frecuentes.
  - CTA final `¿LISTO PARA JUGAR?` con botón `INSERTAR MONEDA →`.
- Animación de entrada por scroll para las secciones `.reveal`, con `IntersectionObserver`.
- Mover la biblioteca actual de `app/page.tsx` a `app/games/page.tsx`, sin cambios visuales.
- Actualizar el nav compartido: logo a `/`, links Inicio (`/`), Biblioteca (`/games`) y Salón de la Fama (`/hall-of-fame`), tanto en desktop como en el panel móvil.
- Actualizar los enlaces internos que significan "volver a la biblioteca" para que apunten a `/games`.
- Fixture tipado con la actividad y el top de jugadores en `app/data/home.ts`.
- Estilos nuevos en `app/globals.css` portados desde `references/resources/templates/home-about/styles.css`.
- `metadata` propia de la landing en `app/page.tsx`.
- Responsive según los breakpoints del template (`1100px`, `980px`, `900px`, `720px`, `600px`, `520px`) y los ya existentes (`840px` para el nav móvil).

**Fuera de alcance (para futuras specs):**

- Página `/about` y su formulario de contacto.
- Link "Acerca de" en el nav: no se agrega hasta que exista la página.
- Actividad en tiempo real, polling, websockets o escritura de puntuaciones.
- Precios funcionales, checkout, pagos o planes reales; la sección es copy de marketing.
- Cambios en la autenticación, el usuario en memoria o la persistencia.
- Búsqueda y filtrado funcionales de la biblioteca; siguen decorativos como en SPEC 01.
- Rediseño de las pantallas de detalle, reproductor, acceso o salón más allá de corregir sus enlaces a la biblioteca.
- Tests automatizados, i18n, analítica y página 404 personalizada.

## Modelo de datos

El home no introduce persistencia. Solo agrega un fixture estático tipado en `app/data/home.ts`.

```ts
import type { AccentColor } from "./games";

export interface ActivityRow {
  player: string;
  game: string;
  score: number;
  time: string; // copy literal: "hace 2 min"
  accent: AccentColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export const ACTIVITY_FEED: ActivityRow[]; // 7 filas
export const TOP_PLAYERS: TopPlayer[]; // 5 filas
```

Convenciones:

- `ACTIVITY_FEED` reproduce las siete filas del template: `NEONFOX`, `PX_KAI`, `Z3R0COOL`, `VAULT_07`, `GLITCHA`, `ARKADYA` y `CYBER_LU`.
- `TOP_PLAYERS` reproduce las cinco filas del template: `NEONFOX`, `PX_KAI`, `M00NRYU`, `VAULT_07` y `GLITCHA`.
- `score` es numérico y se formatea con `toLocaleString("es-ES")` en el servidor.
- `time` es texto literal del template; no se calcula desde fechas.
- `accent` reutiliza `AccentColor` de `app/data/games.ts` y se mapea a las clases `neon-cyan`, `neon-magenta`, `neon-yellow` y `neon-green`.
- Los juegos de la vista previa no se duplican: se leen de `GAMES.slice(0, 6)`.

## Plan de implementación

1. Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero de biblioteca, `LibraryFilters`, grid de `GameCard`). Verificar que `/` y `/games` renderizan la misma biblioteca.
2. Actualizar `app/components/site-nav.tsx`: logo a `/`; links Inicio, Biblioteca (`/games`) y Salón de la Fama; estados activos (`/` para Inicio, `/games`, `/games/[id]` y `/play/[id]` para Biblioteca); mismos links en el panel móvil. Verificar que el nav resalta la sección correcta.
3. Actualizar a `/games` los enlaces que representan la biblioteca: `app/games/[id]/page.tsx`, `app/components/game-player.tsx`, `app/components/hall-of-fame.tsx` y los `router.push` de `app/components/auth-form.tsx`. Verificar cada navegación.
4. Agregar al final de `app/globals.css` los estilos del home portados del template: `.home`, hero, siluetas, secciones, features, mini-rail, stats, actividad, pricing, FAQ, `.reveal` y los keyframes `float`, `bounce`, `tickin`. No duplicar reglas existentes de `.btn`, `.pixel`, `.neon-*` ni `fade-in`.
5. Crear `app/data/home.ts` con `ActivityRow`, `TopPlayer`, `ACTIVITY_FEED` y `TOP_PLAYERS`. Verificar con `npx tsc --noEmit`.
6. Crear `app/components/reveal.tsx` como client component que renderiza un `<section>` con las clases `reveal` y el `className` recibido, y agrega `in` cuando el bloque entra en viewport. Si `IntersectionObserver` no existe, agrega `in` de inmediato.
7. Crear los componentes de presentación del home: `app/components/home-silhouettes.tsx` (ocho SVG decorativos) y `app/components/home-feature-icon.tsx` (iconos GAMEPAD, FREE, TROPHY, ROCKET). Ambos pueden ser server components.
8. Crear `app/components/home-mini-card.tsx` como componente server que recibe un `Game` y renderiza la mini-tarjeta enlazada a `/games/[id]`.
9. Reescribir `app/page.tsx` como landing: hero, siluetas, features, preview de seis juegos, stats, actividad, pricing, FAQ y CTA final. Envolver las secciones animadas con `Reveal`. Exportar `metadata` con título y descripción de la landing.
10. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que aparezca hasta que los cuatro pasen.

## Criterios de aceptación

- [ ] `/` muestra el hero con `▸ INSERTA UNA MONEDA_`, las tres líneas `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA` y el subtítulo del template.
- [ ] El hero muestra ocho siluetas pixel decorativas con animación de flotación.
- [ ] `EXPLORAR JUEGOS` navega a `/games` y `CREAR CUENTA` navega a `/auth`.
- [ ] La sección `¿POR QUÉ ARCADE VAULT?` muestra cuatro tarjetas con sus iconos y descripciones.
- [ ] La sección `JUEGOS DISPONIBLES AHORA` muestra exactamente las seis primeras entradas de `GAMES`.
- [ ] Cada mini-tarjeta navega a `/games/<id>` del juego correspondiente.
- [ ] `VER TODOS LOS JUEGOS →` navega a `/games`.
- [ ] La banda de estadísticas muestra `12+`, `MILES` y `GLOBAL` con sus tres subtítulos.
- [ ] `ACTIVIDAD EN VIVO` muestra siete filas de puntuaciones y cinco filas de top de jugadores.
- [ ] Las puntuaciones de actividad y top se muestran con separador de miles `es-ES`.
- [ ] `VER SALÓN →` navega a `/hall-of-fame`.
- [ ] La sección `PRECIOS` muestra el plan `JUGADOR VAULT` con `$0`, seis beneficios y tres preguntas frecuentes.
- [ ] `EMPEZAR GRATIS →` navega a `/auth` y `INSERTAR MONEDA →` navega a `/games`.
- [ ] Las secciones con `.reveal` empiezan invisibles y reciben `.in` al entrar en viewport.
- [ ] El nav muestra Inicio, Biblioteca y Salón de la Fama; no muestra Acerca de.
- [ ] En `/`, Inicio aparece activo; en `/games`, `/games/<id>` y `/play/<id>`, Biblioteca aparece activa; en `/hall-of-fame`, Salón aparece activo.
- [ ] El logo del nav navega a `/` y el link Biblioteca navega a `/games`.
- [ ] En móvil, la hamburguesa abre el panel con Inicio, Biblioteca, Salón y el acceso; cada link cierra el panel y navega.
- [ ] `/games` muestra la biblioteca completa: hero, buscador, chips y ocho tarjetas.
- [ ] En `/games/<id>`, `VOLVER AL VAULT` navega a `/games`.
- [ ] En `/play/<id>`, `VOLVER AL VAULT` navega a `/games`.
- [ ] En `/hall-of-fame`, `VOLVER A LA BIBLIOTECA` navega a `/games`.
- [ ] Iniciar sesión o entrar como invitado desde `/auth` navega a `/games`.
- [ ] La landing se ve sin solapamientos a 390px y a 1440px de ancho.
- [ ] No hay errores ni warnings de hidratación en la consola del navegador.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** `/` es la landing y `/games` es la biblioteca. Es la única forma de que el home sea la portada sin perder la vista de biblioteca del template.
- **Sí:** `/games` en lugar de `/biblioteca` o `/library`. Reutiliza el prefijo existente de `/games/[id]` y mantiene la convención de slugs en inglés de SPEC 01.
- **Sí:** la página es un server component y solo `Reveal` es cliente. La landing no tiene estado propio; el único JS necesario es el observer de scroll.
- **Sí:** fixture tipado en `app/data/home.ts` para actividad y top. Separa datos de presentación y deja una semilla reemplazable por datos reales.
- **Sí:** los juegos de la vista previa salen de `GAMES`; no se duplican en el fixture.
- **Sí:** se portan todas las secciones del template, incluida `PRECIOS`. La sección forma parte de la fidelidad visual aunque no exista cobro real.
- **Sí:** el logo navega a `/` como en el template. Antes apuntaba a la biblioteca.
- **Sí:** login e invitado navegan a `/games` para conservar el comportamiento de SPEC 01 de terminar en la biblioteca.
- **Sí:** `Reveal` agrega `in` de inmediato si no hay `IntersectionObserver`. Evita secciones invisibles en navegadores viejos.
- **No:** página Acerca de en esta spec. El link se omite hasta que exista una spec propia.
- **No:** link "Acerca de" apuntando a una ruta inexistente. Sería un 404 visible en el nav principal.
- **No:** datos en vivo o polling. El ticker es copy estático del template.
- **No:** calcular las filas con `seededScores`. El template fija nombres y tiempos concretos que no se derivan de los datos de juego.
- **No:** mover la biblioteca a `/biblioteca`. Rompería la convención de rutas en inglés ya decidida.
- **No:** redirección de `/` a `/games`. `/` cambia de significado de forma intencional; los bookmarks antiguos llegan al home.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El contenido de las secciones queda invisible si falla el JS del observer | `Reveal` agrega `in` en el efecto cuando `IntersectionObserver` no está disponible. |
| Desajuste de hidratación al formatear puntuaciones | El formateo con `es-ES` ocurre solo en el server component; `Reveal` solo cambia clases en cliente. |
| Colisión entre `/games` y `/games/[id]` | Next resuelve primero la ruta estática; `page.tsx` vive en `app/games/page.tsx`. |
| Los estilos portados pisan reglas existentes de botones o nav | Se agregan solo selectores `.home-*`, `.section-*`, `.feature-*`, `.mini-*`, `.activity-*`, `.tick-*`, `.top-*`, `.pricing-*`, `.price-*`, `.faq-*`, `.reveal` y los keyframes nuevos. |
| El port del CSS arrastra estilos de `about` fuera de alcance | Se copia solo el bloque del home y la sección de actividad/precios del template. |
| El build de Next 16 falla por datos sin boundary | La landing usa únicamente data estática; no se agregan exports `dynamic`, `revalidate` ni `fetchCache`. |

## Lo que **no** entra en esta spec

- Página Acerca de y formulario de contacto.
- Link "Acerca de" en el nav.
- Actividad en tiempo real, puntuaciones persistidas o ranking real.
- Checkout, pagos o planes funcionales.
- Búsqueda y filtrado funcionales.
- Rediseño de detalle, reproductor, acceso o salón.
- Tests automatizados, i18n y analítica.

Cada uno de esos puntos, si llega, va en su propia spec.
