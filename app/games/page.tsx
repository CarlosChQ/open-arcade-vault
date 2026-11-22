import { Suspense } from "react";
import {
  CatalogGrid,
  CatalogGridSkeleton,
} from "../components/catalog-grid";
import { LibraryFilters } from "../components/library-filters";

export default function GamesPage() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <LibraryFilters />

      <Suspense fallback={<CatalogGridSkeleton />}>
        <CatalogGrid />
      </Suspense>
    </div>
  );
}
