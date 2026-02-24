export type Role = 'HOST' | 'GUEST';

export type Phase =
  | 'SETUP'
  | 'AUTHOR'
  | 'SCAN_PACK'
  | 'VOTE'
  | 'SCAN_VOTE'
  | 'RESULTS'
  | 'SET_END'
  | 'MATCH_END';

export type QuestionOption = {
  id: string;
  label: string;
  isTruth: boolean;
};

export type QuestionCard = {
  id: string;
  prompt: string;
  options: QuestionOption[];
};

export type Vote = {
  playerId: string;
  optionId: string;
};

export type RedistributionState = {
  byPlayerId: string;
  amount: number;
  distributionMap: Record<string, number>;
  resolved: boolean;
};

export type RoundState = {
  roundId: string;
  card?: QuestionCard;
  stakeByPlayer: Record<string, number>;
  votes: Vote[];
  resolved: boolean;
  redistribution?: RedistributionState;
};

export type Player = {
  id: string;
  name: string;
  role: Role;
  capital: number;
  setsWon: number;
  redistributionUsedInSet: boolean;
};

export type GameState = {
  version: 1;
  gameId: string;
  phase: Phase;
  seed: string;
  players: [Player, Player];
  config: {
    startingCapital: number;
    winTarget: number;
  };
  currentSet: number;
  currentRound: RoundState;
  history: RoundState[];
  remainingDeck: QuestionCard[];
};

export type CreateGameInput = {
  gameId: string;
  seed: string;
  players: [
    { id: string; name: string; role: Role },
    { id: string; name: string; role: Role }
  ];
  questions: QuestionCard[];
  startingCapital?: number;
  capitalInitial?: number;
  winTarget?: number;
};