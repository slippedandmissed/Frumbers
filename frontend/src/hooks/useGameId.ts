import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

export function useGameId({ slug }: { slug: string }) {
  const { playerId, playerPin } = useAuth();
  const { data: gameId } = useSuspenseQuery({
    queryKey: ["gameId", slug],
    queryFn: async () => {
      const response = await api.game.gameId.get({
        $query: { slug },
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data.gameId;
    },
  });

  return gameId;
}
