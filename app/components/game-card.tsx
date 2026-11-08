"use client";

import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import type { Game } from "@/app/data/games";

const BUTTON_CLASS: Record<Game["color"], string> = {
  cyan: "",
  magenta: "magenta",
  yellow: "yellow",
  green: "",
};

export function GameCard({ game }: { game: Game }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = cardRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const handleMouseLeave = () => {
    const element = cardRef.current;
    if (!element) return;
    element.style.transform = "";
  };

  return (
    <Link
      ref={cardRef}
      href={`/games/${game.id}`}
      className="card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cover">
        <div className={"cover-bg " + game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{game.best.toLocaleString("es-ES")}</b>
          </div>
          <span className={"btn " + BUTTON_CLASS[game.color]}>JUGAR</span>
        </div>
      </div>
    </Link>
  );
}
