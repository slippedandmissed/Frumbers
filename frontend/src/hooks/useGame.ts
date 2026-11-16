import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

export function useGame({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt } = useSuspenseQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const response = await api.game[gameId].get({
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  return {
    ...data,
    isMine: data.ownerId === playerId,
    /** Add to Date.now() to get (approximately) the server's clock. */
    serverOffsetMs: Date.parse(data.serverTime) - dataUpdatedAt,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  };
}
