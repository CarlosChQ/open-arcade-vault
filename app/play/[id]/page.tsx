import { notFound } from "next/navigation";
import { GamePlayer } from "@/app/components/game-player";
import { GAMES } from "@/app/data/games";

export const instant = false;

export function generateStaticParams() {
  return GAMES.map((game) => ({ id: game.id }));
}

export default async function PlayPage({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  const game = GAMES.find((item) => item.id === id);

  if (!game) {
    notFound();
  }

  return <GamePlayer game={game} />;
}
