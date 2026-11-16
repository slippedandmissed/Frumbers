import { ActionIcon, Button, Card, Group, Stack, Text } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { RoundFields } from "./RoundFields";

export type RoundDraft = { question: string; answer: number };

/** Editable list of rounds used when creating a game. */
export function RoundsEditor({
  rounds,
  onChange,
}: {
  rounds: RoundDraft[];
  onChange: (rounds: RoundDraft[]) => void;
}) {
  function update(index: number, patch: Partial<RoundDraft>) {
    onChange(rounds.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function move(index: number, by: -1 | 1) {
    const next = [...rounds];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    onChange(next);
  }

  return (
    <Stack w="100%" align="center">
      {rounds.map((round, index) => (
        <Card key={index} withBorder w="100%" p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text fw="bold">Round {index + 1}</Text>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <IconArrowUp />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                aria-label="Move down"
                disabled={index === rounds.length - 1}
                onClick={() => move(index, 1)}
              >
                <IconArrowDown />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label="Remove round"
                disabled={rounds.length === 1}
                onClick={() => onChange(rounds.filter((_, i) => i !== index))}
              >
                <IconTrash />
              </ActionIcon>
            </Group>
          </Group>
          <RoundFields
            size="md"
            question={round.question}
            answer={round.answer}
            onQuestionChange={(question) => update(index, { question })}
            onAnswerChange={(answer) => update(index, { answer })}
          />
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus />}
        onClick={() => onChange([...rounds, { question: "", answer: 0 }])}
      >
        Add another question
      </Button>
    </Stack>
  );
}
