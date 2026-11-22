"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/app/data/games";
import {
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsSnapshot,
} from "@/app/lib/games/asteroides/engine";
import { useUser } from "./user-context";

const INITIAL_SNAPSHOT: AsteroidsSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: 3,
  level: 1,
  tripleShot: 0,
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function AsteroidsPlayer({ game }: { game: Game }) {
  const { user } = useUser();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);

  const [snapshot, setSnapshot] = useState<AsteroidsSnapshot>(INITIAL_SNAPSHOT);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createAsteroidsEngine({
      canvas,
      onSnapshot: setSnapshot,
    });
    engineRef.current = engine;

    const container = canvas.parentElement;
    const resize = () => {
      const rect = (container ?? canvas).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container ?? canvas);
    resize();

    return () => {
      observer.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const engine = engineRef.current;
      if (!engine) return;

      const code = event.code;
      if (
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "Space"
      ) {
        event.preventDefault();
      }

      if (code === "Space") {
        if (event.repeat) return;
        if (engine.getSnapshot().phase === "ready") {
          engine.start();
          return;
        }
        engine.press("Space");
        return;
      }

      if (code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowUp") {
        engine.setKey(code, true);
        return;
      }

      if (code === "KeyP" || code === "Escape") {
        const current = engine.getSnapshot();
        if (current.phase !== "playing" && current.phase !== "dead") return;
        if (current.paused) engine.resume();
        else engine.pause();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight" ||
        event.code === "ArrowUp"
      ) {
        engine.setKey(event.code, false);
      }
    };

    const releaseKeys = () => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setKey("ArrowLeft", false);
      engine.setKey("ArrowRight", false);
      engine.setKey("ArrowUp", false);
    };

    const onBlur = () => {
      releaseKeys();
      engineRef.current?.pause();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      releaseKeys();
      engineRef.current?.pause();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const start = () => engineRef.current?.start();
  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const current = engine.getSnapshot();
    if (current.phase !== "playing" && current.phase !== "dead") return;
    if (current.paused) engine.resume();
    else engine.pause();
  };
  const endGame = () => engineRef.current?.gameOver();
  const restart = () => {
    setSaved(false);
    engineRef.current?.restart();
  };

  const lives = snapshot.lives > 0 ? "♥ ".repeat(snapshot.lives).trim() : "—";

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snapshot.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{lives}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snapshot.level).padStart(2, "0")}</div>
          </div>
          {snapshot.tripleShot > 0 && (
            <div className="hud-stat">
              <div className="l">Triple</div>
              <div className="v">{snapshot.tripleShot.toFixed(1)}s</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
          >
            {snapshot.paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            className="asteroids-canvas"
            aria-label="Arena de juego de Asteroides"
          >
            Tu nave triangular deriva en un campo de rocas toroidal.
          </canvas>

          {snapshot.phase === "ready" && (
            <div className="crt-content asteroids-ready">
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  READY
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  ← → ROTAN · ↑ PROPULSA · ESPACIO DISPARA
                </div>
                <button
                  type="button"
                  className="btn yellow"
                  style={{ marginTop: 18 }}
                  onClick={start}
                >
                  INSERTAR MONEDA
                </button>
              </div>
            </div>
          )}

          {snapshot.paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
                <button
                  type="button"
                  className="btn yellow"
                  style={{ marginTop: 18 }}
                  onClick={togglePause}
                >
                  REANUDAR
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {snapshot.phase === "gameover" && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">
              {snapshot.score.toLocaleString("es-ES")}
            </div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={() => setSaved(true)}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
