import { CreateGameInput, GameState, Vote } from './types';
import {
  applyRedistribution,
  applyResolveRound,
  createGameState,
  resolveRedistribution,
  setVotes,
  startRound,
} from './rules';

export type GameAction =
  | { type: 'START_ROUND'; seq: number; payload: { stakeByPlayer: Record<string, number> } }
  | { type: 'SET_VOTES'; seq: number; payload: { votes: Vote[] } }
  | { type: 'RESOLVE_ROUND'; seq: number }
  | {
      type: 'APPLY_REDISTRIBUTION';
      seq: number;
      payload: {
        byPlayerId: string;
        amount: number;
        distributionMap: Record<string, number>;
      };
    }
  | { type: 'RESOLVE_REDISTRIBUTION'; seq: number }
  | { type: 'ADVANCE_AFTER_SET_END'; seq: number }
  | { type: 'RESET_MATCH'; seq: number; payload: CreateGameInput };

export function createInitialGameState(input: CreateGameInput): GameState {
  return {
    ...createGameState(input),
    lastSeq: 0,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const lastSeq = state.lastSeq ?? 0;
  if (action.seq !== lastSeq + 1) {
    return state;
  }

  let nextState: GameState;

  switch (action.type) {
    case 'START_ROUND':
      nextState = startRound(state, action.payload);
      break;
    case 'SET_VOTES':
      nextState = setVotes(state, action.payload.votes);
      break;
    case 'RESOLVE_ROUND':
      nextState = applyResolveRound(state);
      break;
    case 'APPLY_REDISTRIBUTION':
      nextState = applyRedistribution(state, action.payload);
      break;
    case 'RESOLVE_REDISTRIBUTION':
      nextState = resolveRedistribution(state);
      break;
    case 'ADVANCE_AFTER_SET_END':
      nextState = state.phase === 'SET_END' ? { ...state, phase: 'AUTHOR' } : state;
      break;
    case 'RESET_MATCH':
      nextState = createGameState(action.payload);
      break;
    default:
      return state;
  }

  return {
    ...nextState,
    lastSeq: lastSeq + 1,
  };
}
