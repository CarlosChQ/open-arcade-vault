import { GameCard } from "@/app/components/game-card";
import { getGames } from "@/app/lib/games/repository";

/** Catálogo real. Vive dentro de un `<Suspense>` en `/games`. */
export async function CatalogGrid() {
  const games = await getGames();

  return (
    <div className="av-grid">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

/** Fallback de 9 tarjetas mientras el catálogo resuelve. */
export function CatalogGridSkeleton() {
  return (
    <div className="av-grid" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="card skeleton-card">
          <div className="cover skeleton-cover" />
          <div className="meta">
            <div className="skeleton-line" style={{ width: "72%" }} />
            <div className="skeleton-line" style={{ width: "92%" }} />
            <div className="skeleton-line" style={{ width: "48%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
