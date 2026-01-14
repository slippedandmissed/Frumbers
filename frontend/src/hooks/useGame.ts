import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

export function useGame({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
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
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  };
}
