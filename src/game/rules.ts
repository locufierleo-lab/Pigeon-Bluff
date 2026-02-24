import { createSeededRandom, deterministicShuffle, mulberry32, seedFromString } from './rng';
import { CreateGameInput, GameState, Player, QuestionCard, RoundState, Vote } from './types';

export { createSeededRandom, mulberry32, seedFromString };
export const hashStringToInt = seedFromString;
export const shuffleDeterministic = deterministicShuffle;

export function createRoundId(gameId: string, currentSet: number, historyLength: number): string {
  return `${gameId}:${currentSet}:${historyLength + 1}`;
}

export function createGameState(input: CreateGameInput): GameState {
  const startingCapital = clampStartingCapital(input.startingCapital ?? input.capitalInitial ?? 10);
  const winTarget = Math.max(1, input.winTarget ?? 2);

  const players: [Player, Player] = [
    {
      ...input.players[0],
      capital: startingCapital,
      setsWon: 0,
      redistributionUsedInSet: false,
    },
    {
      ...input.players[1],
      capital: startingCapital,
      setsWon: 0,
      redistributionUsedInSet: false,
    },
  ];

  return {
    version: 1,
    gameId: input.gameId,
    phase: 'AUTHOR',
    seed: input.seed,
    players,
    config: {
      startingCapital,
      winTarget,
    },
    currentSet: 1,
    currentRound: {
      roundId: createRoundId(input.gameId, 1, 0),
      stakeByPlayer: {},
      votes: [],
      resolved: false,
    },
    history: [],
    remainingDeck: deterministicShuffle(input.questions, input.seed),
  };
}

export function startRound(
  gs: GameState,
  payload: { card?: QuestionCard; stakeByPlayer: Record<string, number> }
): GameState {
  if (gs.phase === 'MATCH_END') {
    return gs;
  }

  const normalizedStakeByPlayer = Object.fromEntries(
    gs.players.map((player) => [
      player.id,
      normalizeStake(payload.stakeByPlayer[player.id], player.capital),
    ])
  );

  return {
    ...gs,
    phase: 'VOTE',
    currentRound: {
      roundId: createRoundId(gs.gameId, gs.currentSet, gs.history.length),
      card: payload.card ?? gs.remainingDeck[0],
      stakeByPlayer: normalizedStakeByPlayer,
      votes: [],
      resolved: false,
    },
    remainingDeck: payload.card ? gs.remainingDeck : gs.remainingDeck.slice(1),
  };
}

export function setVotes(gs: GameState, votes: Vote[]): GameState {
  if (gs.phase !== 'VOTE' && gs.phase !== 'SCAN_VOTE') {
    return gs;
  }

  return {
    ...gs,
    phase: 'RESULTS',
    currentRound: {
      ...gs.currentRound,
      votes,
    },
  };
}

export function applyResolveRound(gs: GameState): GameState {
  const players = gs.players.map((player) => {
    const vote = gs.currentRound.votes.find((v) => v.playerId === player.id);
    const stake = normalizeStake(gs.currentRound.stakeByPlayer[player.id], player.capital);
    const votedOption = gs.currentRound.card?.options.find((opt) => opt.id === vote?.optionId);

    if (!votedOption?.isTruth) {
      return {
        ...player,
        capital: Math.max(0, player.capital - stake),
      };
    }

    return player;
  }) as [Player, Player];

  const resolvedRound: RoundState = {
    ...gs.currentRound,
    resolved: true,
  };

  const loser = players.find((p) => p.capital <= 0);
  if (!loser) {
    return {
      ...gs,
      players,
      phase: 'AUTHOR',
      currentRound: {
        roundId: createRoundId(gs.gameId, gs.currentSet, gs.history.length + 1),
        stakeByPlayer: {},
        votes: [],
        resolved: false,
      },
      history: [...gs.history, resolvedRound],
    };
  }

  const winner = players.find((p) => p.id !== loser.id);
  if (!winner) {
    return gs;
  }

  const updatedPlayers = players.map((p) => {
    const setsWon = p.id === winner.id ? p.setsWon + 1 : p.setsWon;
    return {
      ...p,
      setsWon,
      capital: gs.config.startingCapital,
      redistributionUsedInSet: false,
    };
  }) as [Player, Player];

  const matchEnded = updatedPlayers.some((p) => p.setsWon >= gs.config.winTarget);

  return {
    ...gs,
    players: updatedPlayers,
    phase: matchEnded ? 'MATCH_END' : 'SET_END',
    currentSet: matchEnded ? gs.currentSet : gs.currentSet + 1,
    currentRound: {
      roundId: createRoundId(gs.gameId, gs.currentSet + 1, gs.history.length + 1),
      stakeByPlayer: {},
      votes: [],
      resolved: false,
    },
    history: [...gs.history, resolvedRound],
  };
}

export function applyRedistribution(
  gs: GameState,
  input: {
    byPlayerId: string;
    amount: number;
    distributionMap: Record<string, number>;
  }
): GameState {
  const player = gs.players.find((p) => p.id === input.byPlayerId);
  if (!player || player.redistributionUsedInSet) {
    return gs;
  }

  return {
    ...gs,
    players: gs.players.map((p) =>
      p.id === input.byPlayerId ? { ...p, redistributionUsedInSet: true } : p
    ) as [Player, Player],
    currentRound: {
      ...gs.currentRound,
      redistribution: {
        ...input,
        resolved: false,
      },
    },
  };
}

export function resolveRedistribution(gs: GameState): GameState {
  if (!gs.currentRound.redistribution) {
    return gs;
  }

  return {
    ...gs,
    currentRound: {
      ...gs.currentRound,
      redistribution: {
        ...gs.currentRound.redistribution,
        resolved: true,
      },
    },
  };
}

function clampStartingCapital(value: number): number {
  return Math.max(3, Math.min(15, Math.floor(value)));
}

function normalizeStake(value: number | undefined, capital: number): number {
  if (capital <= 0) {
    return 0;
  }

  const stake = Number.isFinite(value) ? Math.floor(value as number) : 1;
  return Math.max(1, Math.min(stake, capital));
}
