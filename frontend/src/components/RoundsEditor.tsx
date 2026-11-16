import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { Hint } from "./Hint";
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
    <Stack w="100%">
      {rounds.map((round, index) => (
        <Card key={index} p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Badge circle size="lg">
                {index + 1}
              </Badge>
              <Text fw={600}>Question {index + 1}</Text>
            </Group>
            {rounds.length > 1 && (
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowUp size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Move down"
                  disabled={index === rounds.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowDown size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Remove question"
                  onClick={() => onChange(rounds.filter((_, i) => i !== index))}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            )}
          </Group>
          <RoundFields
            inline
            question={round.question}
            answer={round.answer}
            onQuestionChange={(question) => update(index, { question })}
            onAnswerChange={(answer) => update(index, { answer })}
          />
        </Card>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() => onChange([...rounds, { question: "", answer: 0 }])}
      >
        Add another question
      </Button>
      <Hint>
        You can add more questions later, even once the game is under way.
      </Hint>
    </Stack>
  );
}
