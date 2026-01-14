import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "../utils/api";

export function useGuesses({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();

  const { data: guesses } = useSuspenseQuery({
    queryKey: ["guesses", gameId],
    queryFn: async () => {
      const response = await api.game[gameId].guesses.get({
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

  const { mutate: makeGuess } = useMutation({
    mutationFn: async (guess: number) => {
      const response = await api.game[gameId].guesses.post({
        guess,
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
    },
    onMutate: async (newGuess) => {
      const now = new Date();
      await queryClient.cancelQueries({ queryKey: ["guesses", gameId] });
      const previousGuesses = queryClient.getQueryData<typeof guesses>([
        "guesses",
        gameId,
      ]);
      queryClient.setQueryData(
        ["guesses", gameId],
        (oldGuesses: typeof guesses) => [
          ...oldGuesses,
          { playerId, guess: newGuess, created: now.toISOString() },
        ],
      );
      return { previousGuesses };
    },
    onError: (_err, _newGuess, context) => {
      queryClient.setQueryData(["guesses", gameId], context!.previousGuesses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["guesses", gameId] });
    },
  });

  const haveIGuessed = guesses.some((g) => g.playerId === playerId);

  return {
    guesses,
    haveIGuessed,
    makeGuess,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["guesses", gameId] }),
  };
}
