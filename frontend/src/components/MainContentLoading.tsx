import { Loader, Stack } from "@mantine/core";

export function MainContentLoading() {
  return (
    <Stack h="100%" align="center" justify="center">
      <Loader />
    </Stack>
  );
}
