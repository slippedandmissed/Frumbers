import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Checkbox,
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
import { Hint } from "./Hint";

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
        question={question}
        answer={answer}
        onQuestionChange={setQuestion}
        onAnswerChange={setAnswer}
      />
      <Button
        leftSection={<IconPlus size={16} />}
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
 * The host's view of every round, shown in the host drawer. Finished rounds
 * are locked; the live round and upcoming rounds can be edited, and upcoming
 * rounds can also be reordered or removed.
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
    setShowRunningTotals,
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
    <Stack gap="lg">
      <Hint>
        Changes save as you make them, and players see them straight away.
      </Hint>
      <Checkbox
        label="Show players which round they're on"
        description="Displays “Round X of Y” to everyone."
        checked={game.showRoundIndicator}
        onChange={(event) => setShowRoundIndicator(event.currentTarget.checked)}
      />
      <Checkbox
        label="Show running totals between rounds"
        description={
          rounds.length > 1
            ? "Never shown after the last round, so the final reveal stays a surprise."
            : "Needs more than one question. Add another to enable this."
        }
        disabled={rounds.length <= 1}
        checked={game.showRunningTotals}
        onChange={(event) => setShowRunningTotals(event.currentTarget.checked)}
      />
      <Stack gap="xs">
        <Title order={5}>Questions</Title>
        <Hint>
          Finished rounds are locked. The live round and upcoming ones can still
          be edited, and upcoming ones reordered or removed.
        </Hint>
        {rounds.map((round) => {
          const isCurrent = round.position === game.currentRoundPosition;
          const isUpcoming = round.position > game.currentRoundPosition;
          const upcomingIndex = upcomingIds.indexOf(round.id);
          return (
            <Card key={round.id} p="sm" radius="md">
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Group gap="xs">
                  <Text fw={600}>Round {round.position + 1}</Text>
                  {round.isOver && (
                    <Badge
                      color="gray"
                      variant="light"
                      leftSection={<IconLock size={12} />}
                    >
                      Finished
                    </Badge>
                  )}
                  {isCurrent && !round.isOver && (
                    <Badge variant="filled">Live</Badge>
                  )}
                </Group>
                {isUpcoming && (
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Move up"
                      disabled={upcomingIndex === 0}
                      onClick={() => moveUpcoming(round.id, -1)}
                    >
                      <IconArrowUp size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Move down"
                      disabled={upcomingIndex === upcomingIds.length - 1}
                      onClick={() => moveUpcoming(round.id, 1)}
                    >
                      <IconArrowDown size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Delete round"
                      onClick={() => deleteRound(round.id)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
              {round.isOver ? (
                <Text size="sm">
                  {round.question} &mdash; <b>{round.answer}</b>
                </Text>
              ) : (
                <RoundFields
                  size="sm"
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
              {isCurrent && !round.isOver && (
                <Box mt="xs">
                  <Hint>
                    You can still edit this while people are guessing.
                  </Hint>
                </Box>
              )}
              {isUpcoming && (
                <Box mt="xs">
                  <Hint>Players can't see this yet.</Hint>
                </Box>
              )}
            </Card>
          );
        })}
      </Stack>
      {canAdd && !game.isOver && (
        <Stack gap="xs">
          <Title order={5}>Add a question</Title>
          <Hint>
            It joins the end of the queue, and players won't see it until its
            round starts.
          </Hint>
          <AddRoundForm onAdd={addRound} />
        </Stack>
      )}
    </Stack>
  );
}
