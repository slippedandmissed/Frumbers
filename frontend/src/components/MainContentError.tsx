import { Button, Stack, Text } from "@mantine/core";
import { useEffect } from "react";
import type { FallbackProps } from "react-error-boundary";

export function MainContentError({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Stack h="100%" align="center" justify="center" gap="xl">
      <Text>An error occurred: {error.message}</Text>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </Stack>
  );
}
