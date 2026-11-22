import { connection } from "next/server";

import {
  GAMES,
  seededScores,
  type AccentColor,
  type Category,
  type CoverName,
  type Game,
  type ScoreRow,
} from "@/app/data/games";
import {
  ACTIVITY_FEED,
  TOP_PLAYERS,
  type ActivityRow,
  type TopPlayer,
} from "@/app/data/home";
import { formatRelativeTime, formatScoreDate } from "@/app/lib/games/format";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

const CATEGORIES: readonly string[] = ["ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
const COVERS: readonly string[] = [
  "cover-bricks",
  "cover-tetro",
  "cover-snake",
  "cover-glot",
  "cover-invaders",
  "cover-rocas",
  "cover-rana",
  "cover-duelo",
  "cover-asteroides",
];
const COLORS: readonly string[] = ["cyan", "magenta", "yellow", "green"];

interface CatalogRow {
  id: string | null;
  title: string | null;
  short: string | null;
  long: string | null;
  cat: string | null;
  cover: string | null;
  color: string | null;
  plays: string | null;
  sort_order: number | null;
  best: number | null;
}

interface ScoreQueryRow {
  player_name: string;
  score: number;
  created_at: string;
}

interface ActivityQueryRow {
  player_name: string;
  score: number;
  created_at: string;
  games:
    | { title: string | null; color: string | null }
    | { title: string | null; color: string | null }[]
    | null;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapCatalogRow(row: CatalogRow): Game | null {
  const { id, title, short, long, cat, cover, color, plays } = row;

  if (!id || !title || !short || !long || !cat || !cover || !color || !plays) {
    console.error(
      `[supabase] Fila incompleta en game_catalog: ${id ?? "(sin id)"}`,
    );
    return null;
  }

  if (
    !CATEGORIES.includes(cat) ||
    !COVERS.includes(cover) ||
    !COLORS.includes(color)
  ) {
    console.error(`[supabase] Fila inválida en game_catalog: ${id}`);
    return null;
  }

  return {
    id,
    title,
    short,
    long,
    cat: cat as Category,
    cover: cover as CoverName,
    color: color as AccentColor,
    best: Number(row.best ?? 0),
    plays,
  };
}

function mapScoreRows(rows: ScoreQueryRow[]): ScoreRow[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    name: row.player_name,
    score: Number(row.score),
    date: formatScoreDate(row.created_at),
  }));
}

/**
 * Catálogo público. Cae a `GAMES` sin configuración, ante un error o si la
 * tabla/vista está vacía (un catálogo vacío rompería el home y el nav).
 */
export async function getGames(): Promise<Game[]> {
  if (!isSupabaseConfigured()) {
    return GAMES;
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("game_catalog")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        `[supabase] No se pudo leer game_catalog: ${error.message}`,
      );
      return GAMES;
    }

    const games = ((data ?? []) as CatalogRow[])
      .map(mapCatalogRow)
      .filter((game): game is Game => game !== null);

    return games.length > 0 ? games : GAMES;
  } catch (error) {
    console.error(
      `[supabase] Error inesperado leyendo game_catalog: ${describeError(error)}`,
    );
    return GAMES;
  }
}

/** Un juego del catálogo por id. Devuelve `null` si no existe. */
export async function getGameById(id: string): Promise<Game | null> {
  if (!isSupabaseConfigured()) {
    return GAMES.find((game) => game.id === id) ?? null;
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("game_catalog")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        `[supabase] No se pudo leer game_catalog/${id}: ${error.message}`,
      );
      return GAMES.find((game) => game.id === id) ?? null;
    }

    if (!data) {
      return GAMES.find((game) => game.id === id) ?? null;
    }

    return mapCatalogRow(data as CatalogRow);
  } catch (error) {
    console.error(
      `[supabase] Error inesperado leyendo game_catalog/${id}: ${describeError(error)}`,
    );
    return GAMES.find((game) => game.id === id) ?? null;
  }
}

/**
 * Ranking de un juego (una fila por jugador). Devuelve `[]` si el juego no
 * tiene puntuaciones; cae a `seededScores` sin configuración o ante un error.
 */
export async function getLeaderboard(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  if (!isSupabaseConfigured()) {
    return seededScores(gameId.length * 17 + 3, limit);
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scores")
      .select("player_name, score, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .order("player_name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error(
        `[supabase] No se pudo leer scores de ${gameId}: ${error.message}`,
      );
      return seededScores(gameId.length * 17 + 3, limit);
    }

    return mapScoreRows((data ?? []) as ScoreQueryRow[]);
  } catch (error) {
    console.error(
      `[supabase] Error inesperado leyendo scores de ${gameId}: ${describeError(error)}`,
    );
    return seededScores(gameId.length * 17 + 3, limit);
  }
}

/** Catálogo y leaderboards por juego, listos para el salón de la fama. */
export async function getHallOfFame(limit = 12): Promise<{
  games: Game[];
  leaderboards: Record<string, ScoreRow[]>;
}> {
  const games = await getGames();

  const entries = await Promise.all(
    games.map(async (game) => {
      const rows = await getLeaderboard(game.id, limit);
      return [game.id, rows] as const;
    }),
  );

  return { games, leaderboards: Object.fromEntries(entries) };
}

/** Últimas puntuaciones registradas, con el juego al que pertenecen. */
export async function getRecentActivity(limit = 7): Promise<ActivityRow[]> {
  if (!isSupabaseConfigured()) {
    return ACTIVITY_FEED.slice(0, limit);
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("scores")
      .select("player_name, score, created_at, games(title, color)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        `[supabase] No se pudo leer la actividad reciente: ${error.message}`,
      );
      return ACTIVITY_FEED.slice(0, limit);
    }

    const rows: ActivityRow[] = [];

    for (const raw of (data ?? []) as ActivityQueryRow[]) {
      const game = Array.isArray(raw.games) ? raw.games[0] : raw.games;

      if (!game?.title) {
        continue;
      }

      const accent = COLORS.includes(game.color ?? "")
        ? (game.color as AccentColor)
        : "cyan";

      rows.push({
        player: raw.player_name,
        game: game.title,
        score: Number(raw.score),
        time: formatRelativeTime(raw.created_at),
        accent,
      });
    }

    return rows;
  } catch (error) {
    console.error(
      `[supabase] Error inesperado leyendo la actividad reciente: ${describeError(error)}`,
    );
    return ACTIVITY_FEED.slice(0, limit);
  }
}

/** Top de jugadores por su mejor marca global. */
export async function getTopPlayers(limit = 5): Promise<TopPlayer[]> {
  if (!isSupabaseConfigured()) {
    return TOP_PLAYERS.slice(0, limit);
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("global_leaderboard")
      .select("player_name, score")
      .order("score", { ascending: false })
      .order("player_name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error(
        `[supabase] No se pudo leer global_leaderboard: ${error.message}`,
      );
      return TOP_PLAYERS.slice(0, limit);
    }

    return (data ?? [])
      .filter(
        (row): row is { player_name: string; score: number } =>
          Boolean(row.player_name) && row.score !== null,
      )
      .map((row, index) => ({
        rank: index + 1,
        player: row.player_name,
        score: Number(row.score),
      }));
  } catch (error) {
    console.error(
      `[supabase] Error inesperado leyendo global_leaderboard: ${describeError(error)}`,
    );
    return TOP_PLAYERS.slice(0, limit);
  }
}
