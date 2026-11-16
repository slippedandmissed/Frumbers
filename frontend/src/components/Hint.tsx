import type { ReactNode } from "react";
import { Box, Group, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

// The icon sits in a box exactly one text line tall, so it stays centred on
// the first line however far the text wraps.
const LINE = 19;

/** A quiet line of reassurance or explanation under a control. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <Group gap={8} wrap="nowrap" align="flex-start">
      <Box
        h={LINE}
        c="dimmed"
        style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
      >
        <IconInfoCircle size={17} stroke={1.9} aria-hidden />
      </Box>
      <Text size="xs" c="dimmed" lh={`${LINE}px`}>
        {children}
      </Text>
    </Group>
  );
}
