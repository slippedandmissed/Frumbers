import { Suspense } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Popover,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import TimeAgo from "react-timeago";
import { useGuesses } from "../hooks/useGuesses";
import { useGame } from "../hooks/useGame";
import { useAuth } from "../hooks/useAuth";
import { usePlayer } from "../hooks/usePlayer";
import { useYouHint } from "../utils/hints";
import classes from "./GuessList.module.css";

export function GuessList({ gameId }: { gameId: string }) {
  const { guesses } = useGuesses({ gameId });

  return (
    <Stack gap="xs">
      <Group justify="space-between" px={4}>
        <Title order={4}>Guesses</Title>
        <Badge variant="light" color="gray" size="lg" circle>
          {guesses.length}
        </Badge>
      </Group>
      {guesses.length === 0 ? (
        <Card p="xl" className={classes.empty}>
          <Text fw={600} c="dimmed" ta="center">
            No guesses yet 🥱
          </Text>
        </Card>
      ) : (
        <Card p={0}>
          {guesses.map((guess) => (
            <Suspense key={guess.playerId} fallback={<GuessSkeleton />}>
              <GuessRow gameId={gameId} {...guess} />
            </Suspense>
          ))}
        </Card>
      )}
    </Stack>
  );
}

function GuessSkeleton() {
  return (
    <Group className={classes.row} wrap="nowrap">
      <Skeleton circle h={36} />
      <Skeleton h={14} w={120} />
    </Group>
  );
}

function GuessRow({
  gameId,
  playerId,
  guess,
  created,
}: {
  gameId: string;
  playerId: string;
  guess: number;
  created: string;
}) {
  const { playerId: myPlayerId } = useAuth();
  const { isMine: isGameMine, currentRound } = useGame({ gameId });
  const { name } = usePlayer({ playerId });
  const youHint = useYouHint();
  const isMe = myPlayerId === playerId;
  const canSeeGuess = currentRound.isOver || isGameMine || isMe;

  const identity = (
    <Group gap="sm" wrap="nowrap" miw={0}>
      <Avatar name={name} color="initials" size={36} />
      <Text fw={600} truncate>
        {name}
      </Text>
      {isMe && (
        <Badge size="sm" variant="light">
          You
        </Badge>
      )}
    </Group>
  );

  return (
    <Group
      className={classes.row}
      data-me={isMe || undefined}
      justify="space-between"
      wrap="nowrap"
    >
      {isMe ? (
        <Popover
          opened={youHint.show}
          position="top-start"
          withArrow
          arrowOffset={20}
          width={230}
          offset={8}
        >
          <Popover.Target>{identity}</Popover.Target>
          <Popover.Dropdown>
            <Text size="sm" fw={700} mb={2}>
              That's you! 👋
            </Text>
            <Text size="sm" c="dimmed">
              Everyone gets a random name. Don't love yours? You can change it
              at the top right.
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              mt="xs"
              ml="auto"
              display="block"
              onClick={youHint.dismiss}
            >
              Got it
            </Button>
          </Popover.Dropdown>
        </Popover>
      ) : (
        identity
      )}
      <Group gap="md" wrap="nowrap">
        {canSeeGuess ? (
          <Text fw={800} fz="lg" className={classes.value}>
            {guess}
          </Text>
        ) : (
          <Text
            className={classes.hidden}
            aria-label="Hidden until the round is over"
          >
            0000
          </Text>
        )}
        <Tooltip label={new Date(created).toLocaleString()}>
          <Text
            size="xs"
            c="dimmed"
            w={92}
            ta="right"
            visibleFrom="xs"
            className={classes.time}
          >
            <TimeAgo date={new Date(created)} />
          </Text>
        </Tooltip>
      </Group>
    </Group>
  );
}
