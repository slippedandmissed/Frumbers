import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

/** Host-only. The skip is shared, so every player's race jumps to the podium. */
export function useSkipRace({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: async () => {
      const response = await api.game[gameId].admin.race.skip.post({
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(String(response.error.message));
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });
  return mutate;
}
