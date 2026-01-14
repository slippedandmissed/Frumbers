import { Text } from "@mantine/core";
import { useMotd } from "../hooks/useMotd";

export function Motd() {
  const motd = useMotd();

  return (
    <Text ta="right" fs="italic" c="darkgrey" maw={600}>
      {motd}
    </Text>
  );
}
