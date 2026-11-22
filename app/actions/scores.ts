"use server";

import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export type SaveScoreError =
  | "not_configured"
  | "invalid"
  | "unknown_game"
  | "save_failed";

export interface SaveScoreInput {
  gameId: string;
  playerName: string;
  score: number;
}

export type SaveScoreResult =
  | { ok: true; bestScore: number; improved: boolean }
  | { ok: false; error: SaveScoreError };

const MAX_SCORE = 100_000_000;

/**
 * Guarda la mejor marca de un jugador a través del RPC `submit_score`.
 * No escribe directamente en `scores`: la validación y la comparación de
 * récords viven en Postgres.
 */
export async function saveScore(
  input: SaveScoreInput,
): Promise<SaveScoreResult> {
  const gameId = input.gameId?.trim() ?? "";
  const playerName = input.playerName?.trim().toUpperCase() ?? "";
  const score = input.score;

  if (
    !Number.isInteger(score) ||
    score <= 0 ||
    score > MAX_SCORE ||
    playerName.length < 1 ||
    playerName.length > 10
  ) {
    return { ok: false, error: "invalid" };
  }

  if (!gameId) {
    return { ok: false, error: "unknown_game" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "not_configured" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("submit_score", {
      p_game_id: gameId,
      p_player_name: playerName,
      p_score: score,
    });

    if (error) {
      const message = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;

      if (message.includes("unknown_game")) {
        return { ok: false, error: "unknown_game" };
      }

      if (
        message.includes("invalid_score") ||
        message.includes("invalid_player_name")
      ) {
        return { ok: false, error: "invalid" };
      }

      console.error(`[supabase] submit_score falló: ${error.message}`);
      return { ok: false, error: "save_failed" };
    }

    const row = data?.[0];

    if (!row) {
      console.error("[supabase] submit_score no devolvió ninguna fila");
      return { ok: false, error: "save_failed" };
    }

    return {
      ok: true,
      bestScore: Number(row.best_score),
      improved: Boolean(row.improved),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[supabase] Error inesperado en submit_score: ${reason}`);
    return { ok: false, error: "save_failed" };
  }
}
