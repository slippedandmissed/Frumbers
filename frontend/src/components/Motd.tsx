import { useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useMotd } from "../hooks/useMotd";
import classes from "./Motd.module.css";

export function Motd() {
  const { motd, refresh, isRefreshing } = useMotd();
  // Each click adds a full turn, so the icon spins forward every time.
  const [turns, setTurns] = useState(0);

  return (
    <Group gap={6} justify="center" wrap="nowrap" className={classes.root}>
      <Text
        key={motd}
        size="sm"
        fs="italic"
        c="dimmed"
        ta="center"
        className={classes.text}
        data-refreshing={isRefreshing || undefined}
      >
        {motd}
      </Text>
      <Tooltip label="Another one">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          radius="xl"
          aria-label="Show another message"
          onClick={() => {
            setTurns((t) => t + 1);
            refresh();
          }}
        >
          <IconRefresh
            size={14}
            className={classes.icon}
            style={{ transform: `rotate(${turns * 360}deg)` }}
          />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
