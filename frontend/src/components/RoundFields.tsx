import { NumberInput, Stack, TextInput } from "@mantine/core";

/** Question + answer inputs, shared by the create form and the host's panel. */
export function RoundFields({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  size = "xl",
  disabled,
}: {
  question: string;
  answer: number;
  onQuestionChange: (question: string) => void;
  onAnswerChange: (answer: number) => void;
  size?: string;
  disabled?: boolean;
}) {
  return (
    <Stack w="100%" gap="xs">
      <TextInput
        size={size}
        required
        disabled={disabled}
        label="Question"
        placeholder="How many things have we sold this year?"
        value={question}
        onChange={(event) => onQuestionChange(event.currentTarget.value)}
      />
      <NumberInput
        size={size}
        required
        disabled={disabled}
        label="Answer"
        placeholder="42"
        value={answer}
        onChange={(value) => onAnswerChange(isNaN(+value) ? 0 : +value)}
      />
    </Stack>
  );
}
