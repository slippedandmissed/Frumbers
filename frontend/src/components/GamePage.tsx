import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePusher } from "../hooks/usePusher";
import { useGame } from "../hooks/useGame";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMyGame } from "../hooks/useMyGame";
import { useGuesses } from "../hooks/useGuesses";
import { useAuth } from "../hooks/useAuth";
import {
  IconCheck,
  IconCopy,
  IconEye,
  IconPlayerPlay,
  IconPlus,
  IconFlag,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { RoundIndicator } from "./RoundIndicator";
import { AddRoundForm } from "./HostRoundsPanel";
import { HostControls } from "./HostControls";
import { GuessList } from "./GuessList";
import { FinalResults, RoundOverResults } from "./Results";
import { markGuessMade } from "../utils/hints";
import classes from "./GamePage.module.css";

// Keep in sync with MIN_GUESSES_TO_FINISH_ROUND in backend/src/core/game.ts.
const MIN_GUESSES_TO_FINISH_ROUND = 2;

export function GamePage({ gameId }: { gameId: string }) {
  const pusher = usePusher();
  const queryClient = useQueryClient();
  const { isMine, phase } = useGame({ gameId });
  const { invalidate: invalidateGuesses } = useGuesses({ gameId });
  useEffect(() => {
    const channel = pusher.subscribe(`game-${gameId}`);
    channel.bind("game-updated", () => {
      for (const key of ["game", "standings", "guesses", "myGame"]) {
        queryClient.invalidateQueries({ queryKey: [key, gameId] });
      }
    });
    channel.bind("new-guess", () => {
      invalidateGuesses();
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameId}`);
    };
  }, [pusher, gameId, queryClient, invalidateGuesses]);

  if (phase === "game-over") {
    return (
      <Container size="md" py="xl">
        <FinalResults gameId={gameId} />
      </Container>
    );
  }
  if (phase === "round-over") {
    return <RoundOver gameId={gameId} isMine={isMine} />;
  }
  if (isMine) {
    return <HostPlaying gameId={gameId} />;
  }
  return <PlayerPlaying gameId={gameId} />;
}

/** The frame every in-game screen shares: a status row, then the content. */
function Screen({
  gameId,
  isMine,
  live,
  position,
  totalRounds,
  size = "sm",
  children,
}: {
  gameId: string;
  isMine: boolean;
  size?: "sm" | "md";
  live?: boolean;
  position: number;
  totalRounds: number | null;
  children: ReactNode;
}) {
  return (
    <Container size={size} py="lg">
      <Stack gap="lg">
        <Group justify="space-between" mih={34}>
          <Group gap="xs">
            {live && (
              <Badge variant="light" color="red" size="lg" tt="uppercase">
                <span className={classes.live} />
                Live
              </Badge>
            )}
            <RoundIndicator position={position} totalRounds={totalRounds} />
          </Group>
          {isMine && <HostControls gameId={gameId} />}
        </Group>
        {children}
      </Stack>
    </Container>
  );
}

function QuestionCard({
  question,
  hostAnswer,
}: {
  question: string;
  /** Only passed to the host. */
  hostAnswer?: number;
}) {
  return (
    <Card p={{ base: "lg", sm: "xl" }} className={classes.question} shadow="sm">
      <Stack align="center" gap="md">
        <Title order={1} className={classes.questionText}>
          {question}
        </Title>
        {hostAnswer !== undefined && (
          <Badge
            variant="light"
            color="gray"
            size="lg"
            tt="none"
            leftSection={<IconEye size={14} />}
          >
            Answer: {hostAnswer} &middot; only you can see this
          </Badge>
        )}
      </Stack>
    </Card>
  );
}

function PlayerPlaying({ gameId }: { gameId: string }) {
  const { currentRound, totalRounds } = useGame({ gameId });
  // Remount per round so the guess box resets.
  return (
    <Screen
      key={currentRound.id}
      gameId={gameId}
      isMine={false}
      live
      position={currentRound.position}
      totalRounds={totalRounds}
    >
      <QuestionCard question={currentRound.question} />
      <GuessBox gameId={gameId} />
      <GuessList gameId={gameId} />
    </Screen>
  );
}

function GuessBox({ gameId }: { gameId: string }) {
  const { makeGuess, haveIGuessed, guesses } = useGuesses({ gameId });
  const { playerId } = useAuth();
  const [guess, setGuess] = useState<number | string>("");
  const myGuess = guesses.find((g) => g.playerId === playerId);

  if (haveIGuessed) {
    return (
      <Card
        p="lg"
        className={classes.lockedIn}
        bg="var(--mantine-color-green-light)"
      >
        <Group justify="center" gap="md" wrap="nowrap">
          <IconCheck size={28} color="var(--mantine-color-green-filled)" />
          <Stack gap={0}>
            <Text fw={700}>
              Locked in{myGuess ? `: ${myGuess.guess}` : ""} 🤞
            </Text>
            <Text size="sm" c="dimmed">
              Waiting for the host to reveal the answer.
            </Text>
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card p="lg" shadow="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (guess === "") return;
          markGuessMade();
          makeGuess(Number(guess));
        }}
      >
        <Stack>
          <NumberInput
            size="xl"
            aria-label="Your guess"
            placeholder="Your guess"
            hideControls
            classNames={{ root: classes.guessInput }}
            value={guess}
            onChange={setGuess}
          />
          <Button type="submit" size="lg" fullWidth disabled={guess === ""}>
            Submit guess
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

function HostPlaying({ gameId }: { gameId: string }) {
  const { game, rounds, currentRound, finishRound } = useMyGame({ gameId });
  const { guesses } = useGuesses({ gameId });
  const enough = guesses.length >= MIN_GUESSES_TO_FINISH_ROUND;

  return (
    <Screen
      gameId={gameId}
      isMine
      live
      position={game.currentRoundPosition}
      totalRounds={rounds.length}
    >
      <QuestionCard
        question={currentRound?.question ?? ""}
        hostAnswer={currentRound?.answer}
      />
      <ShareButton />
      <Card p="lg" shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap" align="center">
            <Stack gap={2}>
              <Text fw={700}>
                {guesses.length} guess{guesses.length === 1 ? "" : "es"} in
              </Text>
              <Text size="sm" c="dimmed">
                {enough
                  ? "Reveal whenever you're ready."
                  : `Need at least ${MIN_GUESSES_TO_FINISH_ROUND} to reveal the answer.`}
              </Text>
            </Stack>
            <Button
              size="md"
              leftSection={<IconEye size={18} />}
              disabled={!enough}
              onClick={() => finishRound()}
            >
              Reveal answer
            </Button>
          </Group>
          {!enough && (
            <Progress
              value={(guesses.length / MIN_GUESSES_TO_FINISH_ROUND) * 100}
              size="xs"
              animated
            />
          )}
        </Stack>
      </Card>
      <GuessList gameId={gameId} />
    </Screen>
  );
}

/** Results after a round. Everyone sees them; the host also steers. */
function RoundOver({ gameId, isMine }: { gameId: string; isMine: boolean }) {
  const { currentRound, totalRounds } = useGame({ gameId });
  return (
    <Screen
      size="md"
      gameId={gameId}
      isMine={isMine}
      position={currentRound.position}
      totalRounds={totalRounds}
    >
      <Suspense fallback={<Loader mx="auto" />}>
        <RoundOverResults gameId={gameId} roundId={currentRound.id} />
      </Suspense>
      <Card p="md" className={classes.sticky} radius="xl">
        {isMine ? (
          <HostRoundOverControls gameId={gameId} />
        ) : (
          <Group justify="center" gap="sm">
            <span className={classes.waitDot} />
            <Text fw={600} c="dimmed">
              Waiting for the host to continue&hellip;
            </Text>
          </Group>
        )}
      </Card>
    </Screen>
  );
}

function HostRoundOverControls({ gameId }: { gameId: string }) {
  const { hasNextRound, startNextRound, addRound, finishGame } = useMyGame({
    gameId,
  });
  const [isAdding, setIsAdding] = useState(false);

  return (
    <>
      {hasNextRound ? (
        <Button
          size="lg"
          fullWidth
          leftSection={<IconPlayerPlay size={18} />}
          onClick={() => startNextRound()}
        >
          Next round
        </Button>
      ) : (
        <Group grow>
          <Button
            size="lg"
            variant="default"
            leftSection={<IconPlus size={18} />}
            onClick={() => setIsAdding(true)}
          >
            Add a question
          </Button>
          <Button
            size="lg"
            leftSection={<IconFlag size={18} />}
            onClick={() => finishGame()}
          >
            Finish game
          </Button>
        </Group>
      )}
      <Modal
        opened={isAdding}
        onClose={() => setIsAdding(false)}
        title={
          <Title order={4} component="span">
            One more question
          </Title>
        }
        centered
      >
        <AddRoundForm
          submitLabel="Add and start round"
          onAdd={async (round) => {
            await addRound(round);
            await startNextRound();
            setIsAdding(false);
          }}
        />
      </Modal>
    </>
  );
}

function ShareButton() {
  return (
    <Button
      variant="light"
      size="md"
      fullWidth
      leftSection={<IconCopy size={16} />}
      styles={{ label: { overflow: "hidden", textOverflow: "ellipsis" } }}
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        notifications.show({
          title: "Copied",
          message: "The game link has been copied to your clipboard.",
        });
      }}
    >
      Copy invite link
    </Button>
  );
}
