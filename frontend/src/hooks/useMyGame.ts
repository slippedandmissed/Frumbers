import {
  useQueryClient,
  useSuspenseQuery,
  useMutation,
} from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";
import { setShowRoundIndicatorPreference } from "../utils/preferences";

export function useMyGame({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const $headers = {
    "x-frumbers-player-id": playerId,
    "x-frumbers-player-pin": playerPin,
  };
  const admin = api.game[gameId].admin;

  const { data } = useSuspenseQuery({
    queryKey: ["myGame", gameId],
    queryFn: async () => {
      const response = await admin.get({ $headers });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  function invalidateEverything() {
    return Promise.all(
      ["myGame", "game", "standings", "guesses"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key, gameId] }),
      ),
    );
  }

  function unwrap(response: { error: { message?: unknown } | null }) {
    if (response.error) {
      throw new Error(String(response.error.message));
    }
  }

  /** Mutation whose result is simply "refetch everything". */
  function useAction<TVariables = void>(
    run: (
      variables: TVariables,
    ) => Promise<{ error: { message?: unknown } | null }>,
  ) {
    return useMutation({
      mutationFn: async (variables: TVariables) => unwrap(await run(variables)),
      onSettled: invalidateEverything,
    });
  }

  const myGameKey = ["myGame", gameId];

  // Text edits are applied optimistically since they fire on every keystroke.
  const editRound = useMutation({
    mutationFn: async ({
      roundId,
      ...updates
    }: {
      roundId: string;
      question?: string;
      answer?: number;
    }) => unwrap(await admin.rounds[roundId].patch({ ...updates, $headers })),
    onMutate: async ({ roundId, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: myGameKey });
      const previous = queryClient.getQueryData<typeof data>(myGameKey);
      queryClient.setQueryData(myGameKey, (old: typeof data) => ({
        ...old,
        rounds: old.rounds.map((round) =>
          round.id === roundId ? { ...round, ...updates } : round,
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(myGameKey, context!.previous);
    },
    onSettled: invalidateEverything,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: { showRoundIndicator?: boolean }) =>
      unwrap(await admin.patch({ ...updates, $headers })),
    onMutate: async (updates) => {
      if (updates.showRoundIndicator !== undefined) {
        setShowRoundIndicatorPreference(updates.showRoundIndicator);
      }
      await queryClient.cancelQueries({ queryKey: myGameKey });
      const previous = queryClient.getQueryData<typeof data>(myGameKey);
      queryClient.setQueryData(myGameKey, (old: typeof data) => ({
        ...old,
        game: { ...old.game, ...updates },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(myGameKey, context!.previous);
    },
    onSettled: invalidateEverything,
  });

  const addRound = useAction((round: { question: string; answer: number }) =>
    admin.rounds.post({ ...round, $headers }),
  );
  const deleteRound = useAction((roundId: string) =>
    admin.rounds[roundId].delete({ $headers }),
  );
  const reorderUpcomingRounds = useAction((roundIds: string[]) =>
    admin.rounds.order.put({ roundIds, $headers }),
  );
  const finishRound = useAction(() =>
    admin.rounds.current.finish.post({ $headers }),
  );
  const startNextRound = useAction(() => admin.rounds.next.post({ $headers }));
  const finishGame = useAction(() => admin.finish.post({ $headers }));

  const { game, rounds } = data;
  const currentRound = rounds.find(
    (round) => round.position === game.currentRoundPosition,
  );

  return {
    game,
    rounds,
    currentRound,
    hasNextRound: rounds.some(
      (round) => round.position > game.currentRoundPosition,
    ),
    editRound: editRound.mutate,
    setShowRoundIndicator: (showRoundIndicator: boolean) =>
      updateSettings.mutate({ showRoundIndicator }),
    addRound: addRound.mutateAsync,
    deleteRound: deleteRound.mutate,
    reorderUpcomingRounds: reorderUpcomingRounds.mutate,
    finishRound: finishRound.mutate,
    startNextRound: startNextRound.mutateAsync,
    finishGame: finishGame.mutate,
  };
}
