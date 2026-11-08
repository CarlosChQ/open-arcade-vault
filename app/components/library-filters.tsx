"use client";

import { useState } from "react";
import { CATS } from "@/app/data/games";

export function LibraryFilters() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("TODOS");

  return (
    <div className="av-filters">
      <div className="av-search">
        <span className="ico">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar un juego por nombre…"
          aria-label="Buscar un juego por nombre"
        />
      </div>
      <div className="av-chips">
        {CATS.map((option) => (
          <button
            key={option}
            type="button"
            className={"chip" + (cat === option ? " active" : "")}
            onClick={() => setCat(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
