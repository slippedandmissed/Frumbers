import { Button, Card, Stack, Switch, Title, Text } from "@mantine/core";
import { useState } from "react";
import { api } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "@tanstack/react-router";
import { RoundsEditor, type RoundDraft } from "./RoundsEditor";
import {
  getShowRoundIndicatorPreference,
  setShowRoundIndicatorPreference,
} from "../utils/preferences";

export function HomePage() {
  const { playerId, playerPin } = useAuth();
  const [rounds, setRounds] = useState<RoundDraft[]>([
    { question: "", answer: 0 },
  ]);
  const [showRoundIndicator, setShowRoundIndicator] = useState(
    getShowRoundIndicatorPreference,
  );
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>();

  async function createGame() {
    setIsCreating(true);
    setError(null);
    try {
      const response = await api.game.post({
        $headers: {
          "x-frumbers-player-id": playerId,
          "x-frumbers-player-pin": playerPin,
        },
        rounds,
        showRoundIndicator,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }

      setShowRoundIndicatorPreference(showRoundIndicator);
      router.navigate({
        to: "/$gameSlug",
        params: { gameSlug: response.data.slug },
      });
    } catch (e) {
      console.error(e);
      setError("Failed to create game. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Stack align="center" justify="center" p="xl">
      <Card p="xl" w={600} maw="90%" radius="lg" shadow="lg">
        <Stack align="center" justify="center">
          <Title order={2}>
            {rounds.length > 1 ? "Pose some Questions" : "Pose a Question"}
          </Title>
          <RoundsEditor rounds={rounds} onChange={setRounds} />
          <Switch
            size="md"
            label="Show players which round they're on (Round X/Y)"
            checked={showRoundIndicator}
            onChange={(event) =>
              setShowRoundIndicator(event.currentTarget.checked)
            }
          />
        </Stack>
        <Button
          onClick={() => createGame()}
          mt="xl"
          size="xl"
          disabled={rounds.some((round) => !round.question)}
          loading={isCreating}
          ml="auto"
          mr="auto"
          px="xl"
        >
          Ask it
        </Button>
        {error && (
          <Text ta="center" c="red">
            {error}
          </Text>
        )}
      </Card>
    </Stack>
  );
}
