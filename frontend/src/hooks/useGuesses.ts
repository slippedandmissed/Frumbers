import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "../utils/api";
import { useGame } from "./useGame";

export function useGuesses({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { currentRound } = useGame({ gameId });

  const { data: allGuesses } = useSuspenseQuery({
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
      const previousGuesses = queryClient.getQueryData<typeof allGuesses>([
        "guesses",
        gameId,
      ]);
      queryClient.setQueryData(
        ["guesses", gameId],
        (oldGuesses: typeof allGuesses) => [
          ...oldGuesses,
          {
            playerId,
            roundId: currentRound.id,
            guess: newGuess,
            created: now.toISOString(),
          },
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

  // Guesses made in the round that is currently on screen.
  const guesses = allGuesses.filter((g) => g.roundId === currentRound.id);
  const haveIGuessed = guesses.some((g) => g.playerId === playerId);

  return {
    guesses,
    allGuesses,
    haveIGuessed,
    makeGuess,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["guesses", gameId] }),
  };
}
