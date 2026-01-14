import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../utils/api";

async function getAuth(): Promise<{ playerId: string; playerPin: string }> {
  const storedPlayerId = localStorage.getItem("playerId");
  const storedPlayerPin = localStorage.getItem("playerPin");

  if (storedPlayerId && storedPlayerPin) {
    const result = await api.player.me.name.get({
      $headers: {
        "x-frumbers-player-id": storedPlayerId,
        "x-frumbers-player-pin": storedPlayerPin,
      },
    });
    if (!result.error) {
      return { playerId: storedPlayerId, playerPin: storedPlayerPin };
    }
  }

  const result = await api.player.register.post();
  if (result.error) {
    throw new Error(result.error.message);
  }
  const {
    player: { id: playerId, pin: playerPin },
  } = result.data;
  localStorage.setItem("playerId", playerId);
  localStorage.setItem("playerPin", playerPin);
  return { playerId, playerPin };
}

export function useAuth() {
  const { data } = useSuspenseQuery({
    queryKey: ["auth"],
    queryFn: getAuth,
  });

  return data;
}
