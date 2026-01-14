import { createFileRoute } from "@tanstack/react-router";
import { useGameId } from "../../hooks/useGameId";
import { GamePage } from "../../components/GamePage";

export const Route = createFileRoute("/_game/$gameSlug")({
  component: Game,
});

function Game() {
  const { gameSlug } = Route.useParams();
  const gameId = useGameId({ slug: gameSlug });
  return <GamePage gameId={gameId} />;
}
