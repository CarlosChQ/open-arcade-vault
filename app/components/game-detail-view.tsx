import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameById, getLeaderboard } from "@/app/lib/games/repository";

/** Detalle real + leaderboard de 10 filas. Vive dentro de un `<Suspense>`. */
export async function GameDetailView({ id }: { id: string }) {
  const [game, scores] = await Promise.all([
    getGameById(id),
    getLeaderboard(id, 10),
  ]);

  if (!game) {
    notFound();
  }

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/play/${game.id}`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.length === 0 ? (
            <div className="lb-row lb-empty">
              <div className="pl">AÚN NO HAY PUNTUACIONES</div>
            </div>
          ) : (
            scores.map((row, index) => (
              <div
                key={row.name}
                className={
                  "lb-row" +
                  (index === 0
                    ? " top1"
                    : index === 1
                      ? " top2"
                      : index === 2
                        ? " top3"
                        : "")
                }
              >
                <div className="rk">#{String(row.rank).padStart(2, "0")}</div>
                <div className="pl">
                  {row.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {row.date}
                  </div>
                </div>
                <div className="sc">{row.score.toLocaleString("es-ES")}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

/** Fallback mínimo mientras resuelven el detalle y el leaderboard. */
export function GameDetailSkeleton() {
  return (
    <div className="av-detail skeleton-detail" aria-hidden="true">
      <div>
        <div className="detail-cover skeleton-cover" />
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="skeleton-line" style={{ width: "45%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
          <div className="skeleton-line" style={{ width: "95%" }} />
          <div className="skeleton-line" style={{ width: "70%" }} />
        </div>
      </div>
      <aside>
        <div className="leaderboard">
          <div className="skeleton-line" style={{ width: "55%" }} />
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="skeleton-line" style={{ width: "100%" }} />
          ))}
        </div>
      </aside>
    </div>
  );
}
