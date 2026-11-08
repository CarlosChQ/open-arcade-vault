import type { Metadata } from "next";
import Link from "next/link";
import { HomeFeatureIcon } from "./components/home-feature-icon";
import { HomeMiniCard } from "./components/home-mini-card";
import { HomeSilhouettes } from "./components/home-silhouettes";
import { Reveal } from "./components/reveal";
import { GAMES } from "./data/games";
import { ACTIVITY_FEED, TOP_PLAYERS } from "./data/home";

export const metadata: Metadata = {
  title: "Arcade Vault · El arcade clásico está de vuelta",
  description:
    "Juega los mejores clásicos directamente en tu navegador. Sin descargas. Sin costo. Solo diversión.",
};

const FEATURES = [
  {
    icon: "GAMEPAD",
    title: "JUEGOS CLÁSICOS",
    description:
      "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.",
    color: "cyan",
  },
  {
    icon: "FREE",
    title: "100% GRATIS",
    description:
      "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    color: "yellow",
  },
  {
    icon: "TROPHY",
    title: "LADDER BOARDS",
    description:
      "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    color: "magenta",
  },
  {
    icon: "ROCKET",
    title: "SIEMPRE CRECIENDO",
    description:
      "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    color: "green",
  },
] as const;

const STATS = [
  { number: "12+", unit: "JUEGOS", sub: "Y CONTANDO" },
  { number: "MILES", unit: "DE PARTIDAS", sub: "JUGADAS CADA DÍA" },
  { number: "GLOBAL", unit: "RANKING", sub: "COMPITE CON EL MUNDO" },
] as const;

const FAQ = [
  {
    question: "¿REALMENTE ES GRATIS?",
    answer:
      'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
  },
  {
    question: "¿NECESITO CREAR CUENTA?",
    answer:
      "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
  },
  {
    question: "¿CÓMO SOBREVIVEN SIN COBRAR?",
    answer:
      "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
  },
] as const;

export default function Home() {
  return (
    <div className="home fade-in">
      <section className="home-hero">
        <HomeSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/games" className="btn xl pulse">
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link href="/auth" className="btn xl magenta">
              ✦ CREAR CUENTA
            </Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">// 01</div>
          <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
          <div className="section-rule" />
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={"feature-card " + feature.color}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <HomeFeatureIcon kind={feature.icon} />
              <div className="ft-title pixel">{feature.title}</div>
              <div className="ft-desc">{feature.description}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">// 02</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule" />
        </div>
        <div className="mini-rail">
          {GAMES.slice(0, 6).map((game) => (
            <HomeMiniCard key={game.id} game={game} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/games" className="btn lg">
            VER TODOS LOS JUEGOS →
          </Link>
        </div>
      </Reveal>

      <Reveal className="home-stats">
        <div className="stats-inner">
          {STATS.map((stat, index) => (
            <div
              key={stat.number}
              className="stat-block"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="stat-n neon-yellow">{stat.number}</div>
              <div className="stat-u pixel">{stat.unit}</div>
              <div className="stat-s">{stat.sub}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-yellow">// 03</div>
          <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
          <div className="section-rule" />
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
            </div>
            <div className="ticker">
              {ACTIVITY_FEED.map((row, index) => (
                <div
                  key={row.player}
                  className="tick-row"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className={"tk-p neon-" + row.accent}>{row.player}</span>
                  <span className="tk-mid">▸ {row.game}</span>
                  <span className="tk-s">
                    +{row.score.toLocaleString("es-ES")}
                  </span>
                  <span className="tk-t">{row.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">
                ▸ TOP JUGADORES · HOY
              </div>
              <Link href="/hall-of-fame" className="lb-link">
                VER SALÓN →
              </Link>
            </div>
            <div className="top-list">
              {TOP_PLAYERS.map((row, index) => (
                <div
                  key={row.player}
                  className={
                    "top-row" +
                    (index === 0
                      ? " top1"
                      : index === 1
                        ? " top2"
                        : index === 2
                          ? " top3"
                          : "")
                  }
                >
                  <span className="tp-rk">
                    #{String(row.rank).padStart(2, "0")}
                  </span>
                  <span className="tp-bar">
                    <span
                      className="tp-fill"
                      style={{ width: `${100 - index * 16}%` }}
                    />
                  </span>
                  <span className="tp-p">{row.player}</span>
                  <span className="tp-s">{row.score.toLocaleString("es-ES")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="home-section">
        <div className="section-head">
          <div className="kicker pixel neon-green">// 04</div>
          <h2 className="section-title">PRECIOS</h2>
          <div className="section-rule" />
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">PLAN ÚNICO</div>
            <div className="pc-name pixel">JUGADOR VAULT</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ SIEMPRE</span>
            </div>
            <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
            <ul className="pc-list">
              <li>✔ Acceso a todos los juegos</li>
              <li>✔ Ranking global y salón de la fama</li>
              <li>✔ Sin anuncios entre partidas</li>
              <li>✔ Guarda tus puntuaciones</li>
              <li>✔ Nuevos juegos cada mes</li>
              <li>✔ Funciona en cualquier navegador</li>
            </ul>
            <Link
              href="/auth"
              className="btn xl pulse"
              style={{ width: "100%" }}
            >
              EMPEZAR GRATIS →
            </Link>
            <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
            <div className="pc-stamp pixel">
              FREE
              <br />
              PLAY
            </div>
          </div>

          <div className="pricing-faq">
            {FAQ.map((item) => (
              <div key={item.question} className="faq-item">
                <div className="faq-q pixel">{item.question}</div>
                <div className="faq-a">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="home-final">
        <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
        <Link href="/games" className="btn xl pulse final-cta">
          INSERTAR MONEDA →
        </Link>
        <div className="final-tag">
          Gratis. Sin registro obligatorio. Empieza en segundos.
        </div>
      </Reveal>
    </div>
  );
}
