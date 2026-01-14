import {
  useQueryClient,
  useSuspenseQuery,
  useMutation,
} from "@tanstack/react-query";
import { api } from "../utils/api";
import { useAuth } from "./useAuth";

export function useMyGame({ gameId }: { gameId: string }) {
  const { playerId, playerPin } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["myGame", gameId],
    queryFn: async () => {
      const response = await api.game[gameId].admin.get({
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

  const { mutate } = useMutation({
    mutationFn: async (
      updates: Partial<Pick<typeof data, "question" | "answer" | "isOver">>,
    ) => {
      const response = await api.game[gameId].admin.patch({
        ...updates,
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["myGame", gameId] });
      const previousData = queryClient.getQueryData<typeof data>([
        "myGame",
        gameId,
      ]);
      queryClient.setQueryData(["myGame", gameId], (oldData: typeof data) => ({
        ...oldData,
        ...updates,
      }));
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(["myGame", gameId], context!.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myGame", gameId] });
    },
  });

  function setQuestion(question: string) {
    mutate({ question });
  }

  function setAnswer(answer: number) {
    mutate({ answer });
  }

  function setIsOver(isOver: boolean) {
    mutate({ isOver });
  }

  return { ...data, setQuestion, setAnswer, setIsOver };
}
