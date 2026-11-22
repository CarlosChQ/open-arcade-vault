import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/app/data/games";
import {
  GameDetailSkeleton,
  GameDetailView,
} from "@/app/components/game-detail-view";

export const instant = false;

export function generateStaticParams() {
  return GAMES.map((game) => ({ id: game.id }));
}

export default async function GameDetailPage({
  params,
}: PageProps<"/games/[id]">) {
  const { id } = await params;

  if (!GAMES.some((game) => game.id === id)) {
    notFound();
  }

  return (
    <Suspense fallback={<GameDetailSkeleton />}>
      <GameDetailView id={id} />
    </Suspense>
  );
}
