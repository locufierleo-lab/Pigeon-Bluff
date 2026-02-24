import {
    applyRedistribution,
    applyResolveRound,
    createGameState,
    resolveRedistribution,
    setVotes,
    startRound,
} from './rules';
import { CreateGameInput, GameState, Vote } from './types';

export type GameAction =
  | { type: 'START_ROUND'; payload: { stakeByPlayer: Record<string, number> } }
  | { type: 'SET_VOTES'; payload: { votes: Vote[] } }
  | { type: 'RESOLVE_ROUND' }
  | {
      type: 'APPLY_REDISTRIBUTION';
      payload: {
        byPlayerId: string;
        amount: number;
        distributionMap: Record<string, number>;
      };
    }
  | { type: 'RESOLVE_REDISTRIBUTION' }
  | { type: 'ADVANCE_AFTER_SET_END' }
  | { type: 'RESET_MATCH'; payload: CreateGameInput };

export function createInitialGameState(input: CreateGameInput): GameState {
  return createGameState(input);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state, action.payload);
    case 'SET_VOTES':
      return setVotes(state, action.payload.votes);
    case 'RESOLVE_ROUND':
      return applyResolveRound(state);
    case 'APPLY_REDISTRIBUTION':
      return applyRedistribution(state, action.payload);
    case 'RESOLVE_REDISTRIBUTION':
      return resolveRedistribution(state);
    case 'ADVANCE_AFTER_SET_END':
      return state.phase === 'SET_END' ? { ...state, phase: 'AUTHOR' } : state;
    case 'RESET_MATCH':
      return createGameState(action.payload);
    default:
      return state;
  }
}