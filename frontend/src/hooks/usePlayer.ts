import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";
import { usePusher } from "./usePusher";
import { useEffect } from "react";

export function playerQueryOptions(playerId: string) {
  return {
    queryKey: ["player", playerId],
    queryFn: async () => {
      const response = await api.player[playerId].get();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  };
}

export function usePlayer({ playerId }: { playerId: string }) {
  const pusher = usePusher();
  const queryClient = useQueryClient();

  useEffect(() => {
    pusher.subscribe(`player-${playerId}`).bind("name-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
    });
    return () => {
      pusher.unsubscribe(`player-${playerId}`);
    };
  }, [playerId, pusher, queryClient]);

  const { data } = useSuspenseQuery(playerQueryOptions(playerId));

  return data;
}
