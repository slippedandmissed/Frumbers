import { Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePusher } from "../hooks/usePusher";
import { useGame } from "../hooks/useGame";
import {
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMyGame } from "../hooks/useMyGame";
import { useGuesses } from "../hooks/useGuesses";
import { useAuth } from "../hooks/useAuth";
import { usePlayer } from "../hooks/usePlayer";
import TimeAgo from "react-timeago";
import { IconCopy } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { RoundIndicator } from "./RoundIndicator";
import { AddRoundForm, HostRoundsPanel } from "./HostRoundsPanel";
import { FinalResults, RoundOverResults } from "./Results";

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
      <Stack m="xl" align="center" justify="center">
        <FinalResults gameId={gameId} />
      </Stack>
    );
  }
  if (phase === "round-over") {
    return <RoundOver gameId={gameId} isMine={isMine} />;
  }
  if (isMine) {
    return <MyGame gameId={gameId} />;
  }
  return <SomeoneElsesGame gameId={gameId} />;
}

function SomeoneElsesGame({ gameId }: { gameId: string }) {
  const { currentRound, totalRounds } = useGame({ gameId });
  // Remount per round so the guess box resets.
  return (
    <GuessScreen
      key={currentRound.id}
      gameId={gameId}
      question={currentRound.question}
      position={currentRound.position}
      totalRounds={totalRounds}
    />
  );
}

function GuessScreen({
  gameId,
  question,
  position,
  totalRounds,
}: {
  gameId: string;
  question: string;
  position: number;
  totalRounds: number | null;
}) {
  const { makeGuess, haveIGuessed } = useGuesses({ gameId });

  const [guess, setGuess] = useState<number>(0);

  return (
    <Stack m="xl" align="center" justify="center" gap="xl">
      <Stack align="center" gap={0}>
        <RoundIndicator position={position} totalRounds={totalRounds} />
        <Title ta="center">{question}</Title>
      </Stack>
      <GuessList gameId={gameId} />
      <NumberInput
        disabled={haveIGuessed}
        size="xl"
        label="Make a guess"
        placeholder="42"
        value={guess}
        onChange={(value) => setGuess(isNaN(+value) ? 0 : +value)}
      />
      <Button
        disabled={haveIGuessed}
        size="xl"
        onClick={() => {
          makeGuess(guess);
        }}
      >
        {haveIGuessed ? "Guess Submitted 🤞" : "Submit Guess"}
      </Button>
    </Stack>
  );
}

function MyGame({ gameId }: { gameId: string }) {
  const { game, rounds, finishRound } = useMyGame({ gameId });
  const { guesses } = useGuesses({ gameId });

  return (
    <Stack m="xl" align="center" justify="center" gap="xl">
      <Stack align="center" gap={0}>
        <RoundIndicator
          position={game.currentRoundPosition}
          totalRounds={rounds.length}
        />
        <Title>The Game is On!</Title>
      </Stack>
      <ShareCard />
      <HostRoundsPanel gameId={gameId} />
      <Stack align="center" gap="xs">
        <Button
          size="xl"
          disabled={guesses.length < MIN_GUESSES_TO_FINISH_ROUND}
          onClick={() => finishRound()}
        >
          Finish Round
        </Button>
        {guesses.length < MIN_GUESSES_TO_FINISH_ROUND && (
          <Text c="dimmed" size="sm">
            Waiting for at least {MIN_GUESSES_TO_FINISH_ROUND} guesses (
            {guesses.length} so far)
          </Text>
        )}
      </Stack>
      <GuessList gameId={gameId} />
    </Stack>
  );
}

/** Winner screen after a round. Everyone sees results; the host also steers. */
function RoundOver({ gameId, isMine }: { gameId: string; isMine: boolean }) {
  const { currentRound, totalRounds } = useGame({ gameId });
  return (
    <Stack m="xl" align="center" justify="center" gap="xl">
      <RoundIndicator
        position={currentRound.position}
        totalRounds={totalRounds}
      />
      <Suspense fallback={<Loader />}>
        <RoundOverResults gameId={gameId} roundId={currentRound.id} />
      </Suspense>
      {isMine ? (
        <HostRoundOverControls gameId={gameId} />
      ) : (
        <Text c="dimmed" fw="bold">
          Waiting for the host to continue&hellip;
        </Text>
      )}
    </Stack>
  );
}

function HostRoundOverControls({ gameId }: { gameId: string }) {
  const { hasNextRound, startNextRound, addRound, finishGame } = useMyGame({
    gameId,
  });
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Stack align="center" gap="xl" w="100%">
      {hasNextRound ? (
        <Button size="xl" onClick={() => startNextRound()}>
          Next Round
        </Button>
      ) : isAdding ? (
        <Card w={600} maw="90%" p="md" shadow="xl" radius="md">
          <Stack>
            <Title order={4}>One more question</Title>
            <AddRoundForm
              submitLabel="Add and start round"
              onAdd={async (round) => {
                await addRound(round);
                await startNextRound();
              }}
            />
            <Button variant="subtle" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </Stack>
        </Card>
      ) : (
        <Group>
          <Button size="xl" variant="outline" onClick={() => setIsAdding(true)}>
            Add a Question
          </Button>
          <Button size="xl" onClick={() => finishGame()}>
            Finish Game
          </Button>
        </Group>
      )}
      <HostRoundsPanel gameId={gameId} canAdd={hasNextRound} />
    </Stack>
  );
}

function GuessList({ gameId }: { gameId: string }) {
  const { guesses } = useGuesses({ gameId });

  return (
    <Card w={600} maw="90%" p="md" shadow="xl" radius="md">
      {guesses.length === 0 ? (
        <Text fw="bold" color="grey" ta="center">
          No guesses yet 🥱
        </Text>
      ) : (
        <Stack>
          {guesses.map((guess, index) => (
            <Guess gameId={gameId} {...guess} key={index} />
          ))}
        </Stack>
      )}
    </Card>
  );
}

function Guess({
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
  const canSeeAnswer =
    currentRound.isOver || isGameMine || myPlayerId === playerId;

  return (
    <Group>
      <Suspense fallback={<Loader />}>
        <GuessPlayerName playerId={playerId} />
      </Suspense>
      <Text>&mdash;</Text>
      {canSeeAnswer ? (
        <Text c="green" fw="bold">
          {guess}
        </Text>
      ) : (
        <Text style={{ filter: "blur(4px)" }}>0000</Text>
      )}
      <Tooltip label={new Date(created).toLocaleString()}>
        <Text c="grey" ml="auto">
          <TimeAgo date={new Date(created)} />
        </Text>
      </Tooltip>
    </Group>
  );
}

function GuessPlayerName({ playerId }: { playerId: string }) {
  const { name } = usePlayer({ playerId });
  return (
    <Text c="blue" fw="bold">
      {name}
    </Text>
  );
}

function ShareCard() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        notifications.show({
          title: "Copied",
          message: "The game link has been copied to your clipboard.",
        });
      }}
    >
      <Group>
        <IconCopy />
        <Text fw="bold">{window.location.href}</Text>
      </Group>
    </Button>
  );
}
