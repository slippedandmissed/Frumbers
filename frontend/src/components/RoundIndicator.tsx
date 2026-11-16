import { Text } from "@mantine/core";

/** "Round X/Y". Renders nothing when the host has hidden the total. */
export function RoundIndicator({
  position,
  totalRounds,
}: {
  position: number;
  totalRounds: number | null;
}) {
  if (totalRounds === null) {
    return null;
  }
  return (
    <Text c="dimmed" fw="bold" size="lg">
      Round {position + 1}/{totalRounds}
    </Text>
  );
}
