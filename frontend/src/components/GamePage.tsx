import { Suspense, useEffect, useMemo, useState } from "react";
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
  TextInput,
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
import { BigNumber } from "./BigNumber";

export function GamePage({ gameId }: { gameId: string }) {
  const pusher = usePusher();
  const { isMine, isOver, invalidate: invalidateGame } = useGame({ gameId });
  const { invalidate: invalidateGuesses } = useGuesses({ gameId });
  useEffect(() => {
    const channel = pusher.subscribe(`game-${gameId}`);
    channel.bind("game-updated", () => {
      invalidateGame();
    });
    channel.bind("new-guess", () => {
      invalidateGuesses();
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameId}`);
    };
  }, [pusher, gameId, invalidateGame, invalidateGuesses]);
  if (isOver) {
    return <GameOver gameId={gameId} />;
  }
  if (isMine) {
    return <MyGame gameId={gameId} />;
  }
  return <SomeoneElsesGame gameId={gameId} />;
}

function SomeoneElsesGame({ gameId }: { gameId: string }) {
  const { question } = useGame({ gameId });
  const { makeGuess, haveIGuessed } = useGuesses({ gameId });

  const [guess, setGuess] = useState<number>(0);

  return (
    <Stack m="xl" align="center" justify="center" gap="xl">
      <Title>{question}</Title>
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
  const { question, setQuestion, answer, setAnswer, setIsOver } = useMyGame({
    gameId,
  });

  return (
    <Stack m="xl" align="center" justify="center" gap="xl">
      <Title>The Game is On!</Title>
      <ShareCard />
      <Stack w={600} maw="90%">
        <TextInput
          label="Question"
          size="xl"
          value={question}
          onChange={(event) => setQuestion(event.currentTarget.value)}
        />
        <NumberInput
          size="xl"
          label="Answer"
          placeholder="42"
          value={answer}
          onChange={(value) => setAnswer(isNaN(+value) ? 0 : +value)}
        />
      </Stack>
      <Button size="xl" onClick={() => setIsOver(true)}>
        End Game
      </Button>
      <GuessList gameId={gameId} />
    </Stack>
  );
}

function GameOver({ gameId }: { gameId: string }) {
  const { question, answer } = useGame({ gameId });

  const { guesses } = useGuesses({ gameId });
  const sortedGuesses = useMemo(() => {
    return [...guesses].sort((a, b) => {
      return Math.abs(a.guess - answer) - Math.abs(b.guess - answer);
    });
  }, [guesses, answer]);
  const gold = sortedGuesses.length > 0 ? sortedGuesses[0] : null;
  const silver = sortedGuesses.length > 1 ? sortedGuesses[1] : null;
  const bronze = sortedGuesses.length > 2 ? sortedGuesses[2] : null;

  return (
    <Stack m="xl" align="center" justify="center">
      <Title>{question}</Title>
      <BigNumber value={answer} style={{ fontSize: 40 }} />
      <Group gap="xl" my="xl">
        {gold && (
          <Badge playerId={gold.playerId} guess={gold.guess} color="gold" />
        )}
        {silver && (
          <Badge
            playerId={silver.playerId}
            guess={silver.guess}
            color="silver"
          />
        )}
        {bronze && (
          <Badge
            playerId={bronze.playerId}
            guess={bronze.guess}
            color="bronze"
          />
        )}
      </Group>
      <GuessList gameId={gameId} />
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
  const { isMine: isGameMine, isOver: isGameOver } = useGame({ gameId });
  const canSeeAnswer = isGameOver || isGameMine || myPlayerId === playerId;

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

function Badge({
  playerId,
  guess,
  color,
}: {
  playerId: string;
  guess: number;
  color: "gold" | "silver" | "bronze";
}) {
  const { name } = usePlayer({ playerId });

  const cssColor = {
    gold: "gold",
    silver: "silver",
    bronze: "peru",
  }[color];

  const number = {
    gold: 1,
    silver: 2,
    bronze: 3,
  }[color];

  const cardSize = 100;

  return (
    <Stack align="center" justify="center" mx="xl">
      <Text c={cssColor} style={{ fontSize: 48 }}>
        #{number}
      </Text>
      <Card
        bg={cssColor}
        w={cardSize}
        h={cardSize}
        radius="100%"
        shadow="xl"
        withBorder
        bd="1px solid grey"
      >
        <Stack align="center" justify="center" h="100%" gap={0}>
          <BigNumber
            value={guess}
            c="black"
            fw="bold"
            style={{ fontSize: 30 }}
          />
        </Stack>
      </Card>
      <Text c={cssColor} fw="bold" size="lg" maw={160} ta="center">
        {name}
      </Text>
    </Stack>
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
