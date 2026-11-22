import { HomeMiniCard } from "@/app/components/home-mini-card";
import { getGames } from "@/app/lib/games/repository";

/** Seis mini-tarjetas del home desde el catálogo real. */
export async function HomeCatalog() {
  const games = await getGames();

  return (
    <div className="mini-rail">
      {games.slice(0, 6).map((game) => (
        <HomeMiniCard key={game.id} game={game} />
      ))}
    </div>
  );
}

export function HomeCatalogSkeleton() {
  return (
    <div className="mini-rail" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="mini-card skeleton-card">
          <div className="mini-cover skeleton-cover" />
          <div className="mini-meta">
            <div className="skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton-line" style={{ width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
