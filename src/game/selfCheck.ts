import * as assert from 'node:assert/strict';

import { applyResolveRound, createGameState, setVotes, startRound } from './rules';
import { deterministicShuffle } from './rng';
import { QuestionCard } from './types';

function makeCard(id: string): QuestionCard {
  return {
    id,
    prompt: `Question ${id}`,
    options: [
      { id: `${id}-true`, label: 'true', isTruth: true },
      { id: `${id}-false`, label: 'false', isTruth: false },
    ],
  };
}

function runSelfCheck(): void {
  const questions = [makeCard('q1'), makeCard('q2'), makeCard('q3')];

  const base = createGameState({
    gameId: 'g1',
    seed: 'ABCD',
    players: [
      { id: 'p1', name: 'A', role: 'HOST' },
      { id: 'p2', name: 'B', role: 'GUEST' },
    ],
    questions,
    startingCapital: 10,
    winTarget: 2,
  });

  const withRound = startRound(base, {
    card: questions[0],
    stakeByPlayer: { p1: 3, p2: 4 },
  });

  const withVotes = setVotes(withRound, [
    { playerId: 'p1', optionId: 'q1-true' },
    { playerId: 'p2', optionId: 'q1-false' },
  ]);

  const resolved = applyResolveRound(withVotes);

  assert.equal(resolved.players[0].capital, 10, 'bonne réponse => capital inchangé');
  assert.equal(resolved.players[1].capital, 6, 'mauvaise réponse => perte de mise');
  assert.ok(resolved.players.every((p) => p.capital >= 0), 'capital jamais négatif');

  const setEndState = applyResolveRound(
    setVotes(
      startRound(resolved, { card: questions[1], stakeByPlayer: { p1: 1, p2: 6 } }),
      [
        { playerId: 'p1', optionId: 'q2-true' },
        { playerId: 'p2', optionId: 'q2-false' },
      ]
    )
  );

  assert.equal(setEndState.phase, 'SET_END', 'fin de set quand capital atteint 0');
  assert.equal(setEndState.players[0].setsWon, 1, 'setsWon incrémenté pour le gagnant');

  const matchEndState = applyResolveRound(
    setVotes(
      startRound({ ...setEndState, phase: 'AUTHOR' }, { card: questions[2], stakeByPlayer: { p1: 1, p2: 10 } }),
      [
        { playerId: 'p1', optionId: 'q3-true' },
        { playerId: 'p2', optionId: 'q3-false' },
      ]
    )
  );

  assert.equal(matchEndState.phase, 'MATCH_END', 'match fini à 2 sets gagnants');

  const s1 = deterministicShuffle(['a', 'b', 'c', 'd'], 'GAME-CODE');
  const s2 = deterministicShuffle(['a', 'b', 'c', 'd'], 'GAME-CODE');
  assert.deepEqual(s1, s2, 'shuffle déterministe avec même seed');
}

runSelfCheck();
