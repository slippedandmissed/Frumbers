import { Suspense, useCallback, useState } from "react";
import {
  Accordion,
  Avatar,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { usePlayer } from "../hooks/usePlayer";
import { useAuth } from "../hooks/useAuth";
import { useStandings } from "../hooks/useStandings";
import { useGame } from "../hooks/useGame";
import { useSkipRace } from "../hooks/useSkipRace";
import { BigNumber } from "./BigNumber";
import { DuckRace } from "./DuckRace";
import classes from "./Results.module.css";

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
    <Group gap="xs" wrap="nowrap">
      <Avatar name={name} color="initials" size={24} />
      <Text span fw={600} truncate>
        {name}
      </Text>
      {isMe && (
        <Badge size="xs" variant="light">
          You
        </Badge>
      )}
    </Group>
  );
}

function parseTime(iso: string | null) {
  return iso ? Date.parse(iso) : null;
}

function formatDate(iso: string | null) {
  return new Date(iso ?? Date.now()).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Rank({ rank }: { rank: number }) {
  return <Text span>{MEDALS[rank] ?? rank}</Text>;
}

function useIsMe() {
  const { playerId } = useAuth();
  return (id: string) => id === playerId;
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
  const isMe = useIsMe();
  if (results.length === 0) {
    return (
      <Text fw={600} c="dimmed" ta="center">
        Nobody guessed this round 🦗
      </Text>
    );
  }
  return (
    <Table.ScrollContainer minWidth={380}>
      <Table verticalSpacing="xs" className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40}>#</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th ta="right">Guess</Table.Th>
            <Table.Th ta="right">Off by</Table.Th>
            <Table.Th ta="right">Points</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {results.map((r) => (
            <Table.Tr key={r.playerId} data-me={isMe(r.playerId) || undefined}>
              <Table.Td>
                <Rank rank={r.rank} />
              </Table.Td>
              <Table.Td>
                <PlayerName playerId={r.playerId} />
              </Table.Td>
              <Table.Td ta="right">{r.guess}</Table.Td>
              <Table.Td ta="right" c="dimmed">
                {r.distance}
              </Table.Td>
              <Table.Td ta="right" fw={700}>
                {formatPoints(r.points)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function TotalsTable({ gameId }: { gameId: string }) {
  const { totals } = useStandings({ gameId });
  const isMe = useIsMe();
  if (totals.length === 0) {
    return null;
  }
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table verticalSpacing="xs" className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40}>#</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th ta="right">Total</Table.Th>
            <Table.Th ta="right">Won</Table.Th>
            <Table.Th ta="right">Played</Table.Th>
            <Table.Th ta="right">Avg</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {totals.map((total, index) => (
            <Table.Tr
              key={total.playerId}
              data-me={isMe(total.playerId) || undefined}
            >
              <Table.Td>
                <Rank rank={index + 1} />
              </Table.Td>
              <Table.Td>
                <PlayerName playerId={total.playerId} />
              </Table.Td>
              <Table.Td ta="right" fw={700}>
                {formatPoints(total.totalPoints)}
              </Table.Td>
              <Table.Td ta="right">{total.roundsWon}</Table.Td>
              <Table.Td ta="right">{total.roundsPlayed}</Table.Td>
              <Table.Td ta="right" c="dimmed">
                {formatPoints(total.averagePoints)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card p="md" w="100%" className={classes.fadeIn}>
      <Title order={4} mb="xs">
        {title}
      </Title>
      {children}
    </Card>
  );
}

/**
 * Shown after each round: the answer counts up, then a quick duck race decides
 * the placings and the podium pops up, then the tables appear.
 */
export function RoundOverResults({
  gameId,
  roundId,
}: {
  gameId: string;
  roundId: string;
}) {
  const { rounds, totals } = useStandings({ gameId });
  const { currentRound, isMine, serverOffsetMs } = useGame({ gameId });
  const skipRace = useSkipRace({ gameId });
  const [raceDone, setRaceDone] = useState(false);
  const onFinished = useCallback(() => setRaceDone(true), []);
  const reduced = useReducedMotion();
  const round = rounds.find((r) => r.roundId === roundId);
  if (!round) {
    return <Loader />;
  }
  const showTables = raceDone || reduced || round.results.length === 0;
  return (
    <Stack align="center" gap="xl" w="100%">
      <Card p="xl" w="100%" className={classes.answerCard}>
        <Stack align="center" gap="xs">
          <Text size="sm" fw={700} tt="uppercase" className={classes.eyebrow}>
            The answer was
          </Text>
          <BigNumber value={round.answer} fw={800} className={classes.answer} />
          <Title order={2} ta="center" fz="h4" fw={600} c="dimmed">
            {round.question}
          </Title>
        </Stack>
      </Card>
      {round.results.length === 0 ? (
        <Text fw={600} c="dimmed">
          Nobody guessed this round 🦗
        </Text>
      ) : (
        <DuckRace
          mode="round"
          title={`Round ${round.position + 1}`}
          subtitle={`${round.question} (answer: ${round.answer}) · ${formatDate(currentRound.finishedAt)}`}
          seed={round.roundId}
          originMs={parseTime(currentRound.finishedAt)}
          serverOffsetMs={serverOffsetMs}
          skipped={currentRound.raceSkipped}
          onSkip={isMine ? () => skipRace() : undefined}
          onFinished={onFinished}
          entries={round.results.map((r) => ({
            playerId: r.playerId,
            points: r.points,
            rank: r.rank,
            podiumValue: r.guess,
            podiumCaption:
              r.distance === 0 ? "Spot on!" : `off by ${r.distance}`,
          }))}
        />
      )}
      {showTables && (
        <>
          <Section title="This round">
            <RoundResultsTable results={round.results} />
          </Section>
          {/* The server withholds totals when they would spoil the finale. */}
          {totals.length > 0 && rounds.length > 1 && (
            <Section title="Running total">
              <TotalsTable gameId={gameId} />
            </Section>
          )}
        </>
      )}
    </Stack>
  );
}

/** Overall results: a duck race to build suspense, then the podium. */
export function FinalResults({ gameId }: { gameId: string }) {
  const { rounds, totals } = useStandings({ gameId });
  const game = useGame({ gameId });
  const skipRace = useSkipRace({ gameId });
  const reduced = useReducedMotion();
  const [raceDone, setRaceDone] = useState(false);
  const onFinished = useCallback(() => setRaceDone(true), []);
  const done = raceDone || reduced || totals.length === 0;

  return (
    <Stack align="center" gap="xl" w="100%">
      <Stack align="center" gap={4}>
        <Title ta="center">Final results</Title>
        <Text c="dimmed" ta="center">
          {rounds.length} round{rounds.length === 1 ? "" : "s"} played
        </Text>
      </Stack>
      {totals.length === 0 ? (
        <Text c="dimmed">Nobody played 🦗</Text>
      ) : (
        <DuckRace
          mode="final"
          title="🏆 Grand final"
          subtitle={formatDate(game.finishedAt)}
          seed={gameId}
          originMs={parseTime(game.finishedAt)}
          serverOffsetMs={game.serverOffsetMs}
          skipped={game.raceSkipped}
          onSkip={game.isMine ? () => skipRace() : undefined}
          onFinished={onFinished}
          entries={totals.map((total) => ({
            playerId: total.playerId,
            points: total.totalPoints,
            // Ranks are by total points, so equal totals share a place.
            rank:
              1 +
              totals.filter((o) => o.totalPoints > total.totalPoints).length,
            podiumValue: total.totalPoints,
            podiumCaption: `${total.roundsWon} round${total.roundsWon === 1 ? "" : "s"} won`,
          }))}
        />
      )}
      {done && (
        <>
          <Section title="Leaderboard">
            <TotalsTable gameId={gameId} />
          </Section>
          <Section title="Round by round">
            <Accordion
              variant="separated"
              classNames={{ item: classes.accordionItem }}
            >
              {rounds.map((round) => (
                <Accordion.Item key={round.roundId} value={round.roundId}>
                  <Accordion.Control>
                    {round.position + 1}. {round.question} &mdash;{" "}
                    <Text span fw={700}>
                      {round.answer}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <RoundResultsTable results={round.results} />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Section>
        </>
      )}
    </Stack>
  );
}
