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
    // Only a 401 means the stored credentials are really invalid. Anything
    // else (a 5xx during a deploy, say) is transient, and registering a new
    // player here would silently discard the user's identity, including admin
    // access to any games they host.
    if (result.error.status !== 401) {
      throw new Error(`Couldn't verify your player: ${result.error.status}`);
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
