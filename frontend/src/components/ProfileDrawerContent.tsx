import { Avatar, Stack, Text, TextInput } from "@mantine/core";
import { useMe } from "../hooks/useMe";

export function ProfileDrawerContent() {
  const { name, setName } = useMe();
  return (
    <Stack gap="lg">
      <Avatar name={name} color="initials" size={88} mx="auto" />
      <TextInput
        data-autofocus
        size="md"
        label="Display name"
        description="Shown next to your guesses. Change it to whatever you like."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Text size="sm" c="dimmed">
        Changes save as you type, and everyone in your games sees them right
        away.
      </Text>
    </Stack>
  );
}
