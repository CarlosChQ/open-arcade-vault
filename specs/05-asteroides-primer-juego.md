# SPEC 05 — Asteroides: el primer juego jugable

> **Estado:** Draft
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-18
> **Objetivo:** Convertir el HUD decorativo de `/play/[id]` en un juego real de asteroides jugable en `/play/asteroides`, portando `references/started-games/02-asteroids` a un motor TypeScript independiente con HUD, pausa y fin de partida integrados en la plataforma.

## Por qué existe esta spec

SPEC 01 dejó el reproductor como una pantalla decorativa: puntuación en 0, vidas fijas y una arena CRT falsa. El repositorio ya incluye un clon funcional de Asteroids en `references/started-games/02-asteroids`, un solo archivo `game.js` con canvas 800×600, teclado, vidas, niveles y power-up triple.

Esta spec convierte ese prototipo en el primer juego real de Arcade Vault. No reutiliza `rocas` para no pisar un juego existente del catálogo: agrega `asteroides` como novena entrada y deja las otras ocho rutas con el reproductor actual. Tampoco persiste puntuaciones ni toca Supabase; esa capa llega en su propia spec.

## Alcance

**In:**

- Nueva entrada `asteroides` en `app/data/games.ts`, agregada al final del arreglo, con `cover-asteroides` en `CoverName`.
- Bloque CSS `.cover-asteroides` en `app/globals.css` con arte propio: nave triangular, rocas y estrellas.
- Motor TypeScript sin React en `app/lib/games/asteroides/engine.ts`: clases `Bullet`, `Asteroid`, `Ship`, `Particle` y `PowerUp`, bucle `requestAnimationFrame` y un snapshot de estado.
- Componente cliente `app/components/asteroids-player.tsx` con canvas, HUD real, pantalla READY, pausa, fin de partida y modal.
- Canvas de 800×600 lógicos escalado al `.crt-screen`, con backing store ajustado por `devicePixelRatio`.
- Pantalla READY con botón `INSERTAR MONEDA`; Espacio también inicia.
- Controles con teclado: `←` `→` rotan, `↑` propulsa, `Espacio` dispara, `P` y `Escape` pausan.
- Pausa por botón del HUD, por `P`/`Escape` y automática al perder el foco de la ventana o cambiar de pestaña.
- Game over automático al llegar a 0 vidas: se detiene el motor y se abre el modal `FIN DEL JUEGO` con la puntuación real.
- Botón `FIN` del HUD que termina la partida y abre el mismo modal.
- `JUGAR DE NUEVO` reinicia el motor; `GUARDAR PUNTUACIÓN` conserva el toast local sin escribir en ningún almacenamiento.
- Bifurcación en `app/play/[id]/page.tsx`: `asteroides` monta el juego real, el resto sigue con `GamePlayer`.
- Ajuste del ancho del contenedor del reproductor si el HUD real lo requiere, sin cambiar el aspecto del CRT.
- Verificación con `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build` y partidas manuales a 390px y 1440px.

**Fuera de alcance (para futuras specs):**

- Persistencia de puntuaciones en `localStorage`, Supabase o cualquier base de datos.
- Leaderboard real, actualización de `best` o escritura de `ScoreRow`.
- Controles táctiles, gamepad, joystick virtual o botones en pantalla.
- Sonido, música o efectos de audio.
- Abstracción compartida o contrato genérico para los próximos juegos.
- Hacer jugables `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria` o `duelo-pixel`.
- Cambios en ROCAS, su detalle o su reproductor decorativo.
- Autenticación obligatoria para jugar, récords por usuario o sesión real.
- Tests automatizados, i18n, analítica y PWA/offline.

## Modelo de datos

La spec agrega una entrada de catálogo y un contrato de motor. No hay persistencia.

Catálogo (`app/data/games.ts`):

```ts
export type CoverName =
  | "cover-bricks"
  | "cover-tetro"
  | "cover-snake"
  | "cover-glot"
  | "cover-invaders"
  | "cover-rocas"
  | "cover-rana"
  | "cover-duelo"
  | "cover-asteroides"; // nuevo

export const GAMES: Game[] = [
  // los 8 juegos actuales, sin cambios ni reordenamientos
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Rota, propulsa y parte rocas antes de que te alcancen.",
    long: "Tu nave triangular deriva en un campo de rocas toroidal: lo que sale por un borde entra por el otro. Dispara para partir los asteroides grandes en fragmentos cada vez más pequeños y recoge el power-up 3x para abrir fuego triple durante cinco segundos. Tres vidas, niveles sin techo y ninguna fricción.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "yellow",
    best: 52340,
    plays: "8.7K",
  },
];
```

Convenciones del catálogo:

- La entrada se agrega **al final** de `GAMES`; el home usa `GAMES.slice(0, 6)` y sus seis mini-tarjetas no deben cambiar.
- `id` es `asteroides` (español, igual que `rocas` y `ranaria`) y define la ruta `/games/asteroides` y `/play/asteroides`.
- `cat` es `SHOOTER` y `color` es `yellow`, coherente con la paleta del juego original.
- `best` y `plays` son datos ficticios, como el resto del catálogo.

Motor (`app/lib/games/asteroides/engine.ts`):

```ts
export type AsteroidsPhase = "ready" | "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  phase: AsteroidsPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
  tripleShot: number; // segundos restantes, 0 = inactivo
}

export interface AsteroidsEngineOptions {
  canvas: HTMLCanvasElement;
  onSnapshot: (snapshot: AsteroidsSnapshot) => void;
}

export interface AsteroidsEngine {
  start(): void;      // READY -> playing
  pause(): void;      // no-op fuera de playing/dead
  resume(): void;
  restart(): void;    // reinicia puntuación, vidas y nivel
  gameOver(): void;   // FIN del HUD
  destroy(): void;    // cancela rAF y libera referencias
  setKey(code: string, down: boolean): void;
  press(code: string): void;
  getSnapshot(): AsteroidsSnapshot;
}

export function createAsteroidsEngine(
  options: AsteroidsEngineOptions,
): AsteroidsEngine;
```

Convenciones del motor:

- No importa React, no usa `window` ni `document` y no registra listeners. Toda la entrada entra por `setKey()` y `press()`.
- `press(code)` encola una pulsación de un solo frame; `setKey(code, down)` mantiene el estado de teclas sostenidas.
- El motor obtiene el contexto con `canvas.getContext("2d")` y, en cada `draw()`, aplica `setTransform(canvas.width / 800, 0, 0, canvas.height / 600, 0, 0)`. Las coordenadas del juego siempre son 800×600.
- `onSnapshot` solo se dispara cuando cambia `phase`, `paused`, `score`, `lives`, `level` o `tripleShot` redondeado a 0.1 s. Nada de un render de React por frame.
- `pause()` cancela el `requestAnimationFrame`; `resume()` reinicia `lastTime = null` para que no haya salto de tiempo. `destroy()` es idempotente y deja el motor inutilizable.
- `restart()` vuelve a `playing` de inmediato, sin pasar por READY.
- `gameOver()` fija `phase = "gameover"`, emite el snapshot y cancela el bucle antes de que el componente abra el modal.

Reglas portadas del original (1:1):

| Concepto | Valor |
| --- | --- |
| Lienzo lógico | 800 × 600, envolvimiento toroidal en ambos ejes |
| Rocas iniciales | 4 en el nivel 1; `3 + level` en los siguientes |
| Tamaños de roca | 1, 2, 3 → radio 16 / 30 / 50 |
| Puntos | pequeño 100, mediano 50, grande 20 |
| Fragmentación | cada impacto genera 2 rocas de un tamaño menor; tamaño 1 desaparece |
| Vidas | 3, con 2 s de espera y 3 s de invencibilidad parpadeante al reaparecer |
| Nave | rotación 3.5 rad/s, empuje 260 px/s², arrastre 0.987, radio 12 |
| Colisión nave-roca | `radius * 0.82` sobre la roca |
| Bala | velocidad 520 px/s, vida 1.1 s, enfriamiento 0.2 s |
| Power-up 3x | 15 % por roca destruida, garantizado a las 5, uno por nivel, 12 s en pantalla, 5 s de efecto |
| `dt` máximo | 50 ms para evitar saltos al volver de otra pestaña |

Lectura del HUD (`asteroids-player.tsx`):

```ts
const [snapshot, setSnapshot] = useState<AsteroidsSnapshot>({
  phase: "ready",
  paused: false,
  score: 0,
  lives: 3,
  level: 1,
  tripleShot: 0,
});
```

Convenciones del componente:

- `Puntuación` se formatea con `toLocaleString("es-ES")`; `Nivel` se rellena a dos dígitos.
- `Vidas` usa `"♥ ".repeat(lives).trim()` y muestra `—` en 0.
- El HUD solo refleja el snapshot; ninguna cifra se escribe a mano en el canvas.
- El nombre del jugador sale de `useUser()`, con `"INVITADO"` como respaldo, igual que hoy.
- El modal se abre cuando `snapshot.phase === "gameover"` o cuando se pulsa `FIN`, y usa la puntuación del último snapshot.
- `GUARDAR PUNTUACIÓN` mantiene el toast local de SPEC 01 y no escribe en ningún almacenamiento.

## Plan de implementación

1. Agregar `"cover-asteroides"` a `CoverName` y la entrada `asteroides` al final de `GAMES` en `app/data/games.ts`. Verificar que `/games` muestra 9 tarjetas, que `/games/asteroides` renderiza el detalle y que el home sigue mostrando las mismas 6 mini-tarjetas.
2. Agregar `.cover-asteroides` y su `::before`/`::after` en `app/globals.css`, con arte distinto al de `.cover-rocas`. Verificar la tarjeta en `/games` a 390px y 1440px.
3. Crear `app/lib/games/asteroides/engine.ts` con las clases, las constantes de la tabla, el bucle y el snapshot. Verificar con `npx tsc --noEmit`; el archivo no debe importar React.
4. Crear `app/components/asteroids-player.tsx`: canvas con `ResizeObserver` y `devicePixelRatio`, creación y `destroy()` del motor en un `useEffect`, HUD conectado al snapshot, overlay READY con `INSERTAR MONEDA`, overlay de pausa y modal de fin de partida. Verificar que una partida completa se puede jugar de principio a fin.
5. Añadir en el mismo componente los listeners de `keydown`/`keyup` con filtro de campos editables, `preventDefault` en flechas y Espacio, y pausa automática en `blur` y `visibilitychange`. Verificar que el modal no dispara al escribir el nombre.
6. Bifurcar `app/play/[id]/page.tsx` para montar `AsteroidsPlayer` cuando `id === "asteroides"` y `GamePlayer` en los demás casos. Verificar `/play/rocas` y `/play/asteroides`.
7. Agregar al final de `app/globals.css` solo las reglas nuevas del canvas (`.asteroids-canvas`) y del overlay READY; reutilizar `.av-player`, `.player-hud`, `.crt`, `.crt-screen`, `.crt-content`, `.crt-bottom` y `.modal`. Verificar que el resto de pantallas no cambia.
8. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que aparezca hasta que los cuatro pasen. Repetir la verificación visual a 390px y 1440px y una partida manual completa.

## Criterios de aceptación

- [ ] `GAMES` contiene 9 entradas y `asteroides` es la última.
- [ ] `CoverName` incluye `"cover-asteroides"` y la tarjeta usa un arte distinto al de ROCAS.
- [ ] `/games` muestra la tarjeta ASTEROIDES con categoría `SHOOTER`, descripción corta, mejor puntuación y botón JUGAR.
- [ ] El home sigue mostrando exactamente las mismas seis mini-tarjetas que antes de esta spec.
- [ ] `/games/asteroides` muestra portada, tags, descripción larga, estadísticas y leaderboard de 10 filas.
- [ ] `JUGAR AHORA` en el detalle navega a `/play/asteroides`.
- [ ] `/play/asteroides` muestra el HUD con `Puntuación 0`, 3 corazones y `Nivel 01`, y el CRT con la pantalla READY.
- [ ] Pulsar `INSERTAR MONEDA` inicia la partida; Espacio también la inicia.
- [ ] `←` y `→` rotan la nave, `↑` propulsa y `Espacio` dispara.
- [ ] Mientras el reproductor está montado, flechas y Espacio no hacen scroll en la página.
- [ ] Destruir una roca grande suma 20 puntos y genera dos medianas.
- [ ] Destruir una mediana suma 50 puntos y genera dos pequeñas.
- [ ] Destruir una pequeña suma 100 puntos y no genera fragmentos.
- [ ] Al destruir todas las rocas sube el nivel, se mantienen puntuación y vidas, y aparecen `3 + level` rocas nuevas.
- [ ] Chocar con una roca resta una vida, muestra la explosión y reaparece con parpadeo de invencibilidad.
- [ ] Al llegar a 0 vidas el motor se detiene y aparece el modal `FIN DEL JUEGO` con la puntuación real.
- [ ] `JUGAR DE NUEVO` cierra el modal, reinicia puntuación, vidas y nivel, y vuelve a `playing`.
- [ ] `PAUSA` congela la simulación y muestra `EN PAUSA`; `REANUDAR` continúa sin salto de tiempo.
- [ ] `P` y `Escape` alternan la pausa con el mismo comportamiento que el botón.
- [ ] Cambiar de pestaña o perder el foco de la ventana pausa la partida automáticamente.
- [ ] `FIN` detiene la partida y abre el modal con la puntuación acumulada.
- [ ] `SALIR` navega a `/games/asteroides`.
- [ ] `GUARDAR PUNTUACIÓN` muestra el toast y no escribe nada en `localStorage`, cookies ni Supabase.
- [ ] El power-up 3x aparece como máximo una vez por nivel y su temporizador se ve en el HUD mientras está activo.
- [ ] El canvas no dibuja puntuación, nivel ni vidas: esos valores solo viven en `.player-hud`.
- [ ] Con el foco en el input de iniciales del modal, Espacio no dispara ni reinicia la partida.
- [ ] `app/lib/games/asteroides/engine.ts` no importa React ni usa `window` o `document`.
- [ ] `/play/rocas`, `/play/bloque-buster` y las demás rutas conservan el reproductor decorativo de SPEC 01.
- [ ] `/play/asteroides` se ve sin solapamientos a 390px y a 1440px, y el canvas mantiene la proporción 4:3 del CRT.
- [ ] Al navegar fuera de `/play/asteroides` no quedan `requestAnimationFrame` ni listeners activos.
- [ ] No hay errores ni warnings de hidratación en la consola del navegador.
- [ ] No se agregan dependencias, variables de entorno ni tablas.
- [ ] `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** entrada nueva `asteroides` en lugar de reutilizar `rocas`. El usuario pidió un catálogo con el juego nuevo y así ROCAS conserva su identidad y su tarjeta.
- **Sí:** agregar la entrada al final de `GAMES`. El home toma `GAMES.slice(0, 6)`; insertarla en medio cambiaría la landing sin necesidad.
- **Sí:** motor separado en `app/lib/games/asteroides/engine.ts`. Permite razonar sobre el bucle y las colisiones sin mezclar React, y deja el camino abierto a `app/lib/games/<id>/engine.ts`.
- **Sí:** el motor no toca `window` ni registra listeners. El componente es el único dueño del teclado y del ciclo de vida.
- **Sí:** coordenadas lógicas fijas de 800×600 y transformación por tamaño real del canvas. Mantiene el port fiel y permite nitidez en pantallas HiDPI.
- **Sí:** el HUD de React es la única fuente visible de puntuación, vidas y nivel. Evita duplicar texto entre canvas y DOM.
- **Sí:** pantalla READY con inicio explícito. Evita que el usuario pierda vidas mientras todavía está leyendo la pantalla.
- **Sí:** game over con el modal existente en lugar del overlay dibujado en canvas. Reutiliza el lenguaje visual de la plataforma y permite ofrecer guardar la puntuación.
- **Sí:** `FIN` termina la partida y abre el modal. Es consistente con el game over real y no descarta la puntuación acumulada.
- **Sí:** `P` y `Escape` además del botón. El jugador no tiene que soltar el teclado para pausar.
- **Sí:** pausa automática al perder foco. Evita muertes y consumo de CPU en segundo plano.
- **Sí:** 1:1 con el original, incluido el power-up 3x y los niveles progresivos. Es el comportamiento que el README del juego documenta.
- **Sí:** `GUARDAR PUNTUACIÓN` sigue siendo local. La persistencia real necesita su propia spec sobre Supabase.
- **Sí:** se reutilizan `.crt`, `.crt-screen`, `.player-hud` y `.modal`. Solo se agregan el arte de portada y las reglas del canvas.
- **Sí:** bifurcación por `id` en `app/play/[id]/page.tsx`. Es explícita y no obliga a tocar `GamePlayer`.
- **No:** registro de juegos jugables o contrato genérico de motores. Con un solo juego sería una abstracción especulativa.
- **No:** controles táctiles. El usuario eligió solo teclado; los botones en pantalla llegan con la spec de móvil.
- **No:** persistencia o leaderboard real. Requiere tablas, RLS y tipos generados.
- **No:** reordenar `GAMES` para mostrar ASTEROIDES en el home. La landing es parte de SPEC 02 y no se toca.
- **No:** marcar ROCAS como PRÓXIMAMENTE. Se mantiene decorativo y sin cambios.
- **No:** sonido. El original no lo tiene y agregarlo amplía el alcance sin aportar a la verificación.
- **No:** tocar `GamePlayer`. Sigue siendo el reproductor de los otros ocho juegos.

Esta spec deja sin efecto el criterio de SPEC 01 que fijaba 8 tarjetas en la biblioteca: ahora son 9.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `requestAnimationFrame` sigue corriendo tras navegar fuera | `useEffect` llama `engine.destroy()` en el cleanup y `destroy()` es idempotente. |
| StrictMode monta el efecto dos veces en desarrollo | El cleanup destruye el motor y cancela el frame antes del segundo montaje; no se comparten referencias globales. |
| Un `dt` enorme tras volver de otra pestaña teletransporta la nave | `dt` se limita a 50 ms y `resume()` reinicia `lastTime`. |
| Las flechas y Espacio bloquean el scroll de la página o el formulario del modal | Se filtran `input`, `textarea`, `select` y `contentEditable`, y se hace `preventDefault` solo con el reproductor montado. |
| El canvas se ve borroso en pantallas HiDPI o al escalar al ancho del CRT | Backing store a `cssSize * devicePixelRatio` con `ResizeObserver` y transformación por frame. |
| Un `setState` por frame degrada el rendimiento | El motor emite solo cambios reales y redondea `tripleShot` a 0.1 s. |
| El modal se abre con una puntuación desactualizada | `FIN` lee `getSnapshot()` después de detener el motor; el game over emite antes de abrirse. |
| La novena tarjeta rompe expectativas de conteo de specs anteriores | Queda registrado en las decisiones; el home usa `slice(0, 6)` y no cambia. |
| Dos juegos de asteroides confunden al usuario | ASTEROIDES tiene copy, portada y color propios; ROCAS conserva su descripción de OVNIs. |
| El puerto del motor arrastra dependencias del DOM | El contrato prohíbe `window`, `document` y React en `engine.ts`; el canvas llega por opciones. |
| El juego consume CPU cuando la pestaña está oculta | `visibilitychange` pausa la simulación y cancela el frame. |

## Lo que **no** entra en esta spec

- Persistencia de puntuaciones, leaderboard real y actualización de `best`.
- Controles táctiles, gamepad o botones en pantalla.
- Sonido y música.
- Un contrato de motores compartido para los próximos juegos.
- Hacer jugables los otros ocho juegos del catálogo.
- Cambios en ROCAS, su detalle o su reproductor.
- Autenticación obligatoria, récords por usuario o sesión real.
- Tests automatizados, i18n, analítica y PWA/offline.

Cada uno de esos puntos, si llega, va en su propia spec.
