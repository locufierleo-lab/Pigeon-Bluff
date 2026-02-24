import { createInitialGameState, gameReducer } from "./store";
import type { CreateGameInput, QuestionCard } from "./types";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error("❌ " + msg);
}

const questions: QuestionCard[] = [
  {
    id: "q1",
    prompt: "Test",
    options: [
      { id: "a", label: "A", isTruth: true },
      { id: "b", label: "B", isTruth: false },
    ],
  },
];

const input: CreateGameInput = {
  gameId: "game1",
  seed: "SAME-SEED",
  players: [
    { id: "p1", name: "P1", role: "HOST" },
    { id: "p2", name: "P2", role: "GUEST" },
  ],
  questions,
  startingCapital: 5,
  winTarget: 2,
};

function runOnce() {
  let s = createInitialGameState(input);

  // start round avec mises
  s = gameReducer(s, { type: "START_ROUND", payload: { stakeByPlayer: { p1: 2, p2: 3 } } });

  // votes: p1 bon, p2 mauvais
  s = gameReducer(s, { type: "SET_VOTES", payload: { votes: [
    { playerId: "p1", optionId: "a" },
    { playerId: "p2", optionId: "b" },
  ] }});

  // resolve
  s = gameReducer(s, { type: "RESOLVE_ROUND" });

  return s;
}

const s1 = runOnce();
const s2 = runOnce();

assert(JSON.stringify(s1) === JSON.stringify(s2), "Même seed + mêmes actions => mêmes états");
assert(s1.players[0].capital === 5, "Bonne réponse: capital inchangé (p1)");
assert(s1.players[1].capital === 2, "Mauvaise réponse: capital diminue (p2) 5-3=2");

console.log("✅ selfCheck OK (determinisme + règles de base)");