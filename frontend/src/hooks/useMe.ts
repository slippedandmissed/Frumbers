import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { api } from "../utils/api";

export function useMe() {
  const { playerId, playerPin } = useAuth();
  const client = useQueryClient();

  const { data: name } = useSuspenseQuery({
    queryKey: ["me", playerId],
    queryFn: async () => {
      const response = await api.player.me.name.get({
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data.name;
    },
  });

  const { mutate: setName } = useMutation({
    mutationFn: async (newName: string) => {
      const response = await api.player.me.name.put({
        name: newName,
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
    },
    onMutate: async (newName) => {
      await client.cancelQueries({ queryKey: ["me", playerId] });
      const previousName = client.getQueryData<string>(["me", playerId]);
      client.setQueryData(["me", playerId], newName);
      return { previousName };
    },
    onError: (_err, _newName, context) => {
      client.setQueryData(["me", playerId], context!.previousName);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["me", playerId] });
    },
  });

  return { name, setName };
}
