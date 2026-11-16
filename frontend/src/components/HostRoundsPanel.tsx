import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconLock,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMyGame } from "../hooks/useMyGame";
import { RoundFields } from "./RoundFields";

/** Form for appending a question. `onAdd` decides what happens next. */
export function AddRoundForm({
  onAdd,
  submitLabel = "Add question",
}: {
  onAdd: (round: { question: string; answer: number }) => Promise<unknown>;
  submitLabel?: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Stack w="100%">
      <RoundFields
        size="md"
        question={question}
        answer={answer}
        onQuestionChange={setQuestion}
        onAnswerChange={setAnswer}
      />
      <Button
        leftSection={<IconPlus />}
        disabled={!question}
        loading={isAdding}
        onClick={async () => {
          setIsAdding(true);
          try {
            await onAdd({ question, answer });
            setQuestion("");
            setAnswer(0);
          } finally {
            setIsAdding(false);
          }
        }}
      >
        {submitLabel}
      </Button>
    </Stack>
  );
}

/**
 * The host's view of every round. Finished rounds are locked; the live round
 * and upcoming rounds can be edited, and upcoming rounds can also be
 * reordered or removed.
 */
export function HostRoundsPanel({
  gameId,
  canAdd = true,
}: {
  gameId: string;
  canAdd?: boolean;
}) {
  const {
    game,
    rounds,
    editRound,
    deleteRound,
    reorderUpcomingRounds,
    addRound,
    setShowRoundIndicator,
  } = useMyGame({ gameId });

  const upcomingIds = rounds
    .filter((round) => round.position > game.currentRoundPosition)
    .map((round) => round.id);

  function moveUpcoming(roundId: string, by: -1 | 1) {
    const index = upcomingIds.indexOf(roundId);
    const next = [...upcomingIds];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    reorderUpcomingRounds(next);
  }

  return (
    <Card w={600} maw="90%" p="md" shadow="xl" radius="md">
      <Stack>
        <Title order={3}>Rounds</Title>
        <Switch
          label="Show players which round they're on (Round X/Y)"
          checked={game.showRoundIndicator}
          onChange={(event) =>
            setShowRoundIndicator(event.currentTarget.checked)
          }
        />
        {rounds.map((round) => {
          const isCurrent = round.position === game.currentRoundPosition;
          const isUpcoming = round.position > game.currentRoundPosition;
          const upcomingIndex = upcomingIds.indexOf(round.id);
          return (
            <Card key={round.id} withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw="bold">Round {round.position + 1}</Text>
                  {round.isOver && (
                    <Badge color="gray" leftSection={<IconLock size={12} />}>
                      Finished
                    </Badge>
                  )}
                  {isCurrent && !round.isOver && <Badge>Current</Badge>}
                </Group>
                {isUpcoming && (
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      aria-label="Move up"
                      disabled={upcomingIndex === 0}
                      onClick={() => moveUpcoming(round.id, -1)}
                    >
                      <IconArrowUp />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      aria-label="Move down"
                      disabled={upcomingIndex === upcomingIds.length - 1}
                      onClick={() => moveUpcoming(round.id, 1)}
                    >
                      <IconArrowDown />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Delete round"
                      onClick={() => deleteRound(round.id)}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
              {round.isOver ? (
                <Text>
                  {round.question} &mdash; <b>{round.answer}</b>
                </Text>
              ) : (
                <RoundFields
                  size="md"
                  question={round.question}
                  answer={round.answer}
                  onQuestionChange={(question) =>
                    editRound({ roundId: round.id, question })
                  }
                  onAnswerChange={(answer) =>
                    editRound({ roundId: round.id, answer })
                  }
                />
              )}
            </Card>
          );
        })}
        {canAdd && !game.isOver && (
          <>
            <Title order={4}>Add a question</Title>
            <AddRoundForm onAdd={addRound} />
          </>
        )}
      </Stack>
    </Card>
  );
}
