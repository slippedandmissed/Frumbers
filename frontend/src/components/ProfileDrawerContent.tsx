import { Avatar, Stack, TextInput, Title } from "@mantine/core";
import { useMe } from "../hooks/useMe";

export function ProfileDrawerContent() {
  const { name, setName } = useMe();
  return (
    <Stack gap="lg">
      <Title order={2} mb="lg">
        Profile
      </Title>
      <Avatar name={name} color="initials" size={80} ml="auto" mr="auto" />
      <TextInput
        value={name}
        description="Your display name will be shown to other players."
        onChange={(e) => setName(e.target.value)}
        label="Name"
      />
    </Stack>
  );
}
