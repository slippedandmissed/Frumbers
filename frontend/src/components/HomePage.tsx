import {
  Button,
  Card,
  NumberInput,
  Stack,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { api } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "@tanstack/react-router";

export function HomePage() {
  const { playerId, playerPin } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(0);
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
        question,
        answer,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }

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
          <Title order={2}>Pose a Question</Title>
          <TextInput
            size="xl"
            required
            w="90%"
            label="Question"
            placeholder="How many things have we sold this year?"
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
          />
          <NumberInput
            size="xl"
            w="90%"
            label="Answer"
            required
            placeholder="42"
            value={answer}
            onChange={(value) => setAnswer(isNaN(+value) ? 0 : +value)}
          />
        </Stack>
        <Button
          onClick={() => createGame()}
          mt="xl"
          size="xl"
          disabled={!question}
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
