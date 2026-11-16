import { Badge } from "@mantine/core";

/** "Round X of Y". Renders nothing when the host has hidden the total. */
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
    <Badge variant="light" size="lg">
      Round {position + 1} of {totalRounds}
    </Badge>
  );
}
