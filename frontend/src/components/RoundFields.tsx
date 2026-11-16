import { Grid, NumberInput, TextInput } from "@mantine/core";

/** Question + answer inputs, shared by the create form and the host's drawer. */
export function RoundFields({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  size = "md",
  inline = false,
  disabled,
}: {
  question: string;
  answer: number;
  onQuestionChange: (question: string) => void;
  onAnswerChange: (answer: number) => void;
  size?: string;
  /** Put the answer beside the question on wide screens. */
  inline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Grid gutter="xs">
      <Grid.Col span={{ base: 12, sm: inline ? 8 : 12 }}>
        <TextInput
          size={size}
          required
          disabled={disabled}
          label="Question"
          placeholder="How many things have we sold this year?"
          value={question}
          onChange={(event) => onQuestionChange(event.currentTarget.value)}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: inline ? 4 : 12 }}>
        <NumberInput
          size={size}
          required
          disabled={disabled}
          label="Answer"
          placeholder="42"
          value={answer}
          onChange={(value) => onAnswerChange(isNaN(+value) ? 0 : +value)}
        />
      </Grid.Col>
    </Grid>
  );
}
