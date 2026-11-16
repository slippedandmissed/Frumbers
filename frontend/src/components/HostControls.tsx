import { Button, Drawer, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useGame } from "../hooks/useGame";
import { useMyGame } from "../hooks/useMyGame";
import { HostRoundsPanel } from "./HostRoundsPanel";

/**
 * Everything the host can tweak (questions, answers, round indicator) lives
 * behind this button so the main screen can look like the players' one.
 */
export function HostControls({ gameId }: { gameId: string }) {
  const { phase } = useGame({ gameId });
  const { hasNextRound } = useMyGame({ gameId });
  // Between rounds, new questions are added via the "Add a question" button
  // once the queue runs out, so only offer it here while there's a queue.
  const canAdd = phase === "playing" || hasNextRound;
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button
        variant="default"
        size="compact-md"
        leftSection={<IconAdjustmentsHorizontal size={16} />}
        onClick={open}
      >
        Host controls
      </Button>
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="md"
        title={
          <Title order={3} component="span">
            Host controls
          </Title>
        }
      >
        <HostRoundsPanel gameId={gameId} canAdd={canAdd} />
      </Drawer>
    </>
  );
}
