import { Suspense } from "react";
import {
  Accordion,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { usePlayer } from "../hooks/usePlayer";
import { useAuth } from "../hooks/useAuth";
import { useStandings } from "../hooks/useStandings";
import { BigNumber } from "./BigNumber";

export function PlayerName({ playerId }: { playerId: string }) {
  const { playerId: myPlayerId } = useAuth();
  return (
    <Suspense fallback={<Loader size="xs" />}>
      <PlayerNameInner playerId={playerId} isMe={playerId === myPlayerId} />
    </Suspense>
  );
}

function PlayerNameInner({
  playerId,
  isMe,
}: {
  playerId: string;
  isMe: boolean;
}) {
  const { name } = usePlayer({ playerId });
  return (
    <Text span c="blue" fw="bold">
      {name}
      {isMe ? " (you)" : ""}
    </Text>
  );
}

const PODIUM_COLORS = { 1: "gold", 2: "silver", 3: "peru" } as const;

function PodiumPlace({
  playerId,
  rank,
  value,
  caption,
}: {
  playerId: string;
  rank: 1 | 2 | 3;
  value: number;
  caption?: string;
}) {
  const color = PODIUM_COLORS[rank];
  const { name } = usePlayer({ playerId });
  return (
    <Stack align="center" justify="center" mx="xl">
      <Text c={color} style={{ fontSize: 48 }}>
        #{rank}
      </Text>
      <Card
        bg={color}
        w={100}
        h={100}
        radius="100%"
        shadow="xl"
        withBorder
        bd="1px solid grey"
      >
        <Stack align="center" justify="center" h="100%" gap={0}>
          <BigNumber
            value={value}
            c="black"
            fw="bold"
            style={{ fontSize: 30 }}
          />
        </Stack>
      </Card>
      <Text c={color} fw="bold" size="lg" maw={160} ta="center">
        {name}
      </Text>
      {caption && (
        <Text c="dimmed" size="sm">
          {caption}
        </Text>
      )}
    </Stack>
  );
}

export type PodiumEntry = {
  playerId: string;
  rank: number;
  value: number;
  caption?: string;
};

/** Up to three places. Tied players share a rank, so more than one can be #1. */
export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const places = entries.filter((e) => e.rank <= 3).slice(0, 6);
  return (
    <Group gap="xl" my="xl" justify="center">
      {places.map((entry) => (
        <Suspense key={entry.playerId} fallback={<Loader />}>
          <PodiumPlace
            playerId={entry.playerId}
            rank={entry.rank as 1 | 2 | 3}
            value={entry.value}
            caption={entry.caption}
          />
        </Suspense>
      ))}
    </Group>
  );
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function RoundResultsTable({
  results,
}: {
  results: {
    playerId: string;
    guess: number;
    distance: number;
    rank: number;
    points: number;
  }[];
}) {
  if (results.length === 0) {
    return (
      <Text fw="bold" c="dimmed" ta="center">
        Nobody guessed this round 🦗
      </Text>
    );
  }
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th ta="right">Guess</Table.Th>
            <Table.Th ta="right">Off by</Table.Th>
            <Table.Th ta="right">Points</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {results.map((r) => (
            <Table.Tr key={r.playerId}>
              <Table.Td>{r.rank}</Table.Td>
              <Table.Td>
                <PlayerName playerId={r.playerId} />
              </Table.Td>
              <Table.Td ta="right">{r.guess}</Table.Td>
              <Table.Td ta="right">{r.distance}</Table.Td>
              <Table.Td ta="right">{formatPoints(r.points)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function TotalsTable({ gameId }: { gameId: string }) {
  const { totals } = useStandings({ gameId });
  if (totals.length === 0) {
    return null;
  }
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th ta="right">Total</Table.Th>
            <Table.Th ta="right">Rounds won</Table.Th>
            <Table.Th ta="right">Played</Table.Th>
            <Table.Th ta="right">Avg</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {totals.map((total, index) => (
            <Table.Tr key={total.playerId}>
              <Table.Td>{index + 1}</Table.Td>
              <Table.Td>
                <PlayerName playerId={total.playerId} />
              </Table.Td>
              <Table.Td ta="right" fw="bold">
                {formatPoints(total.totalPoints)}
              </Table.Td>
              <Table.Td ta="right">{total.roundsWon}</Table.Td>
              <Table.Td ta="right">{total.roundsPlayed}</Table.Td>
              <Table.Td ta="right">
                {formatPoints(total.averagePoints)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

const cardProps = {
  w: 600,
  maw: "90%",
  p: "md",
  shadow: "xl",
  radius: "md",
} as const;

/** Winner screen shown after each round: this round's stats and the running total. */
export function RoundOverResults({
  gameId,
  roundId,
}: {
  gameId: string;
  roundId: string;
}) {
  const { rounds, totals } = useStandings({ gameId });
  const round = rounds.find((r) => r.roundId === roundId);
  if (!round) {
    return <Loader />;
  }
  return (
    <Stack align="center" gap="md" w="100%">
      <Title order={2}>{round.question}</Title>
      <BigNumber value={round.answer} style={{ fontSize: 40 }} />
      <Podium
        entries={round.results.map((r) => ({
          playerId: r.playerId,
          rank: r.rank,
          value: r.guess,
        }))}
      />
      <Card {...cardProps}>
        <Title order={4} mb="xs">
          This round
        </Title>
        <RoundResultsTable results={round.results} />
      </Card>
      {totals.length > 0 && rounds.length > 1 && (
        <Card {...cardProps}>
          <Title order={4} mb="xs">
            Running total
          </Title>
          <TotalsTable gameId={gameId} />
        </Card>
      )}
    </Stack>
  );
}

/** Overall winners screen shown to everyone once the host finishes the game. */
export function FinalResults({ gameId }: { gameId: string }) {
  const { rounds, totals } = useStandings({ gameId });
  return (
    <Stack align="center" gap="md" w="100%">
      <Title>Final results</Title>
      {totals.length === 0 ? (
        <Text c="dimmed">Nobody played 🦗</Text>
      ) : (
        <Podium
          entries={totals.map((total) => ({
            playerId: total.playerId,
            // Ranks are by total points, so equal totals share a place.
            rank:
              1 +
              totals.filter((o) => o.totalPoints > total.totalPoints).length,
            value: total.totalPoints,
            caption: `${total.roundsWon} round${total.roundsWon === 1 ? "" : "s"} won`,
          }))}
        />
      )}
      <Card {...cardProps}>
        <Title order={4} mb="xs">
          Leaderboard
        </Title>
        <TotalsTable gameId={gameId} />
      </Card>
      <Card {...cardProps}>
        <Title order={4} mb="xs">
          Round by round
        </Title>
        <Accordion variant="separated">
          {rounds.map((round) => (
            <Accordion.Item key={round.roundId} value={round.roundId}>
              <Accordion.Control>
                {round.position + 1}. {round.question} &mdash;{" "}
                <Text span fw="bold">
                  {round.answer}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <RoundResultsTable results={round.results} />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card>
    </Stack>
  );
}
