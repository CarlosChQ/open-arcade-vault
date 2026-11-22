"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game, ScoreRow } from "@/app/data/games";
import { formatScoreDate } from "@/app/lib/games/format";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { useUser } from "./user-context";

interface PersonalBest {
  score: number;
  rank: number;
  date: string;
}

interface PersonalState {
  tab: string;
  name: string;
  value: PersonalBest | null;
}

export interface HallOfFameProps {
  games: Game[];
  leaderboards: Record<string, ScoreRow[]>;
}

const DASH = "—";

function podiumName(row: ScoreRow | null): string {
  return row?.name ?? DASH;
}

function podiumScore(row: ScoreRow | null): string {
  return row ? row.score.toLocaleString("es-ES") : DASH;
}

function podiumDate(row: ScoreRow | null): string {
  return row?.date ?? DASH;
}

export function HallOfFame({ games, leaderboards }: HallOfFameProps) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const [personal, setPersonal] = useState<PersonalState | null>(null);

  const game = games.find((item) => item.id === tab) ?? games[0] ?? null;
  const rows = game ? (leaderboards[game.id] ?? []) : [];
  const configured = isSupabaseConfigured();
  const playerName = user?.name.trim().toUpperCase() ?? "";

  const personalValue =
    personal && personal.tab === tab && personal.name === playerName
      ? personal.value
      : undefined;

  useEffect(() => {
    if (!user || !configured) {
      return;
    }

    let cancelled = false;
    const name = user.name.trim().toUpperCase();

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("scores")
          .select("score, created_at")
          .eq("game_id", tab)
          .eq("player_name", name)
          .maybeSingle();

        if (error) {
          console.error(`[supabase] No se pudo leer tu marca: ${error.message}`);
          if (!cancelled) setPersonal({ tab, name, value: null });
          return;
        }

        if (!data) {
          if (!cancelled) setPersonal({ tab, name, value: null });
          return;
        }

        const { count, error: countError } = await supabase
          .from("scores")
          .select("id", { count: "exact", head: true })
          .eq("game_id", tab)
          .gt("score", data.score);

        if (countError) {
          console.error(
            `[supabase] No se pudo calcular tu puesto: ${countError.message}`,
          );
          if (!cancelled) setPersonal({ tab, name, value: null });
          return;
        }

        if (!cancelled) {
          setPersonal({
            tab,
            name,
            value: {
              score: Number(data.score),
              rank: (count ?? 0) + 1,
              date: formatScoreDate(data.created_at),
            },
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`[supabase] Error leyendo tu marca: ${reason}`);
        if (!cancelled) setPersonal({ tab, name, value: null });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, tab, configured]);

  const podium = [rows[1] ?? null, rows[0] ?? null, rows[2] ?? null];
  const [silver, gold, bronze] = podium;

  const syntheticRank = user ? Math.floor(8 + (tab.length % 4)) : null;
  const syntheticScore = user && rows[5] ? rows[5].score - 2400 : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((item) => (
          <button
            key={item.id}
            type="button"
            className={"chip" + (tab === item.id ? " active" : "")}
            onClick={() => setTab(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{podiumName(silver)}</div>
          <div className="score">{podiumScore(silver)}</div>
          <div className="date">{podiumDate(silver)}</div>
        </div>
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{
              fontSize: 9,
              color: "var(--gold)",
              letterSpacing: "0.18em",
            }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{podiumName(gold)}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {podiumScore(gold)}
          </div>
          <div className="date">{podiumDate(gold)}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{podiumName(bronze)}</div>
          <div className="score">{podiumScore(bronze)}</div>
          <div className="date">{podiumDate(bronze)}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 ? (
          <div className="tr empty-row">
            <div className="pl">AÚN NO HAY PUNTUACIONES</div>
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.name + index}
              className={
                "tr" +
                (index === 0
                  ? " top1"
                  : index === 1
                    ? " top2"
                    : index === 2
                      ? " top3"
                      : "")
              }
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="rk">#{String(row.rank).padStart(2, "0")}</div>
              <div className="pl">{row.name}</div>
              <div className="sc">{row.score.toLocaleString("es-ES")}</div>
              <div className="dt">{row.date}</div>
            </div>
          ))
        )}

        {user && game && (
          <>
            <div className="tr you-label">
              ▸ TU MEJOR MARCA EN {game.title}
            </div>

            {!configured ? (
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(syntheticRank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {(syntheticScore ?? 9999).toLocaleString("es-ES")}
                </div>
                <div className="dt">11/05/2026</div>
              </div>
            ) : personalValue === undefined ? (
              <div className="tr you">
                <div className="pl">BUSCANDO TU MARCA_</div>
              </div>
            ) : personalValue === null ? (
              <div className="tr you-empty">
                SIN MARCA REGISTRADA EN {game.title}
              </div>
            ) : (
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(personalValue.rank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {personalValue.score.toLocaleString("es-ES")}
                </div>
                <div className="dt">{personalValue.date}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

/** Fallback mínimo mientras resuelven el catálogo y los leaderboards. */
export function HallOfFameSkeleton() {
  return (
    <div className="av-hall skeleton-hall" aria-hidden="true">
      <div className="hall-head">
        <div className="skeleton-line" style={{ width: "60%", height: 36 }} />
        <div className="skeleton-line" style={{ width: "40%" }} />
      </div>
      <div className="hall-tabs">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="skeleton-chip" />
        ))}
      </div>
      <div className="podium">
        <div className="skeleton-podium" />
        <div className="skeleton-podium" />
        <div className="skeleton-podium" />
      </div>
      <div className="hall-table">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="skeleton-line" style={{ width: "100%" }} />
        ))}
      </div>
    </div>
  );
}
