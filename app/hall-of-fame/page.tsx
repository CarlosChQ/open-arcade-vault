import { Suspense } from "react";
import {
  HallOfFame,
  HallOfFameSkeleton,
} from "@/app/components/hall-of-fame";
import { getHallOfFame } from "@/app/lib/games/repository";

async function HallOfFameContent() {
  const { games, leaderboards } = await getHallOfFame(12);

  return <HallOfFame games={games} leaderboards={leaderboards} />;
}

export default function HallOfFamePage() {
  return (
    <Suspense fallback={<HallOfFameSkeleton />}>
      <HallOfFameContent />
    </Suspense>
  );
}
