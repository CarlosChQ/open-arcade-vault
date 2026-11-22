import Link from "next/link";

import { getRecentActivity, getTopPlayers } from "@/app/lib/games/repository";

/** Actividad reciente y top global reales del home. */
export async function HomeActivity() {
  const [activity, topPlayers] = await Promise.all([
    getRecentActivity(7),
    getTopPlayers(5),
  ]);

  return (
    <div className="activity-grid">
      <div className="activity-card">
        <div className="ac-head">
          <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
        </div>
        <div className="ticker">
          {activity.map((row, index) => (
            <div
              key={row.player + index}
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
            ▸ TOP JUGADORES · GLOBAL
          </div>
          <Link href="/hall-of-fame" className="lb-link">
            VER SALÓN →
          </Link>
        </div>
        <div className="top-list">
          {topPlayers.map((row, index) => (
            <div
              key={row.player + index}
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
  );
}

export function HomeActivitySkeleton() {
  return (
    <div className="activity-grid" aria-hidden="true">
      <div className="activity-card">
        <div className="ac-head">
          <div className="skeleton-line" style={{ width: "45%" }} />
        </div>
        <div className="ticker">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton-line" style={{ width: "100%" }} />
          ))}
        </div>
      </div>
      <div className="activity-card">
        <div className="ac-head">
          <div className="skeleton-line" style={{ width: "40%" }} />
        </div>
        <div className="top-list">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton-line" style={{ width: "100%" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
