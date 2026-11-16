import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

export function useStandings({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["standings", gameId],
    queryFn: async () => {
      const response = await api.game[gameId].standings.get({
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
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["standings", gameId] }),
  };
}
