import {
  Button,
  Card,
  Container,
  Divider,
  Stack,
  Checkbox,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "@tanstack/react-router";
import { Hint } from "./Hint";
import { RoundsEditor, type RoundDraft } from "./RoundsEditor";
import {
  getShowRoundIndicatorPreference,
  getShowRunningTotalsPreference,
  setShowRoundIndicatorPreference,
  setShowRunningTotalsPreference,
} from "../utils/preferences";

export function HomePage() {
  const { playerId, playerPin } = useAuth();
  const [rounds, setRounds] = useState<RoundDraft[]>([
    { question: "", answer: 0 },
  ]);
  const [showRoundIndicator, setShowRoundIndicator] = useState(
    getShowRoundIndicatorPreference,
  );
  const [showRunningTotals, setShowRunningTotals] = useState(
    getShowRunningTotalsPreference,
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
        showRunningTotals,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }

      setShowRoundIndicatorPreference(showRoundIndicator);
      setShowRunningTotalsPreference(showRunningTotals);
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
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Stack align="center" gap="xs" ta="center" pt="md">
          <Title order={1} fz={{ base: 36, sm: 52 }} lh={1.05}>
            Guess the{" "}
            <Text
              span
              inherit
              variant="gradient"
              gradient={{ from: "frum.5", to: "pink.5", deg: 120 }}
            >
              number
            </Text>
          </Title>
          <Text c="dimmed" size="lg" maw={460}>
            Ask a question with a numeric answer, share the link, and see who
            gets closest.
          </Text>
        </Stack>

        <Card p={{ base: "md", sm: "xl" }} shadow="sm">
          <Stack gap="lg">
            <Title order={3}>
              {rounds.length > 1 ? "Your questions" : "Your question"}
            </Title>
            <Text size="sm" c="dimmed" mt={-8}>
              Players only see each question when its round starts, and the
              answer stays hidden until the round is over.
            </Text>
            <RoundsEditor rounds={rounds} onChange={setRounds} />
            <Divider />
            <Checkbox
              size="md"
              label="Show players which round they're on"
              description="Displays “Round X of Y” to everyone."
              checked={showRoundIndicator}
              onChange={(event) =>
                setShowRoundIndicator(event.currentTarget.checked)
              }
            />
            <Checkbox
              size="md"
              label="Show running totals between rounds"
              description={
                rounds.length > 1
                  ? "Never shown after the last round, so the final reveal stays a surprise."
                  : "Needs more than one question."
              }
              disabled={rounds.length <= 1}
              checked={showRunningTotals}
              onChange={(event) =>
                setShowRunningTotals(event.currentTarget.checked)
              }
            />
            <Hint>
              You'll be able to change these settings later from Host controls.
            </Hint>
            <Button
              onClick={() => createGame()}
              size="lg"
              fullWidth
              rightSection={<IconArrowRight size={18} />}
              disabled={rounds.some((round) => !round.question)}
              loading={isCreating}
            >
              Create game
            </Button>
            {error && (
              <Text ta="center" c="red">
                {error}
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
