import { expect, test } from "vitest";
import { cardName, dealKlondike, drawKlondike, moveKlondike, validKlondike } from "./klondike";
import { fireVortex, launchVortex, newVortex, positionVortex, rotateVortex, stepVortex, validVortex } from "./vortex";
import { advanceQuiz, answerQuiz, chooseQuizBonus, newQuiz, quizQuestions, startQuizBonus, validQuiz } from "./iQuiz";

test("Klondike keeps a complete deck through dealing, drawing and recycling", () => {
  let state = dealKlondike(123, 3);
  expect(state).toEqual(dealKlondike(123, 3));
  expect(state.columns.map(pile => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(validKlondike(state)).toBe(true);
  for (let i = 0; i < 9; i++) { state = drawKlondike(state); expect(validKlondike(state)).toBe(true); }
  expect(state.stock).toHaveLength(24);
  expect(state.waste).toHaveLength(0);
  const corrupt = structuredClone(state);
  corrupt.stock[0].id = corrupt.stock[1].id;
  expect(validKlondike(corrupt)).toBe(false);
  expect(cardName(13)).toBe("红桃A");
});

test("Klondike rejects illegal stacks and reveals the card beneath a legal move", () => {
  const state = dealKlondike(9);
  // Arrange a complete deck with a hidden card under black 7, to move onto red 8.
  const hidden = { id: 12, up: false }, seven = { id: 6, up: true }, eight = { id: 20, up: true };
  const cards = [...state.stock, ...state.columns.flat()];
  state.columns = [[hidden, seven], [eight], [], [], [], [], []];
  state.stock = cards.filter(card => ![12, 6, 20].includes(card.id)).map(card => ({ ...card, up: false }));
  expect(validKlondike(state)).toBe(true);
  expect(moveKlondike(state, { pile: 6, index: 1 }, 8)).toBe(state); // Empty columns need a king.
  const next = moveKlondike(state, { pile: 6, index: 1 }, 7);
  expect(next.columns[0]).toEqual([{ id: 12, up: true }]);
  expect(next.columns[1].map(card => card.id)).toEqual([20, 6]);
  expect(validKlondike(next)).toBe(true);
  expect(state.columns[0][0].up).toBe(false); // Undo has an unmodified snapshot.
});

test("Klondike rewards waste-to-foundation and never charges for waste-to-tableau", () => {
  for (const id of [0, 12]) {
    const state = dealKlondike(1);
    state.columns = [[], [], [], [], [], [], []];
    state.stock = Array.from({ length: 52 }, (_, id) => ({ id, up: false })).filter(card => card.id !== id);
    state.waste = [{ id, up: true }];
    const next = moveKlondike(state, { pile: 1, index: 0 }, id === 0 ? 2 : 6);
    expect(next.bank).toBe(id === 0 ? 53 : 48);
    expect(validKlondike(next)).toBe(true);
  }
});

test("Vortex catches and loses balls, clamps suspended time and advances cleared levels", () => {
  let state = launchVortex(newVortex());
  expect(validVortex(state)).toBe(true);
  state = { ...state, balls: [{ x: 0, y: 111, vx: 0, vy: 100 }] };
  const caught = stepVortex(state, 0.03);
  expect(caught.balls[0].vy).toBeLessThan(0);
  const missed = stepVortex({ ...state, paddle: -Math.PI / 2, balls: [{ x: 0, y: 126, vx: 0, vy: 100 }] }, 0.03);
  expect(missed).toMatchObject({ lives: 2, phase: "ready", balls: [] });
  expect(stepVortex(state, 600).time).toBeCloseTo(0.05);
  const cleared = stepVortex({ ...state, bricks: [] }, 0.01);
  expect(cleared.phase).toBe("cleared");
  expect(launchVortex(cleared)).toMatchObject({ level: 2, phase: "ready", score: state.score });
  expect(rotateVortex(state, 3).paddle).not.toBe(state.paddle);
});

test("Vortex brick hits and laser power change the real board and score", () => {
  let state = launchVortex(newVortex());
  state = { ...state, bricks: [{ id: 0, ring: 0, sector: 0, hits: 1 }], balls: [{ x: 49, y: 0, vx: -100, vy: 0 }] };
  const next = stepVortex(state, 0.03);
  expect(next.bricks).toHaveLength(0);
  expect(next.score).toBe(25);
  expect(next.phase).toBe("cleared");
  expect(fireVortex({ ...state, paddle: 0, laserUntil: 5 }).bricks).toHaveLength(0);
  expect(validVortex({ ...next, balls: [{ x: NaN, y: 0, vx: 0, vy: 0 }] })).toBe(false);
});

const tracks = [
  { id: "1", title: "First", artist: "A", album: "One" },
  { id: "2", title: "Second", artist: "B", album: "Two" },
  { id: "3", title: "Third", artist: "C", album: "Three" },
];
test("iQuiz generates repeatable questions only from the supplied library", () => {
  const questions = quizQuestions("library", tracks, 47);
  expect(questions).toEqual(quizQuestions("library", tracks, 47));
  expect(questions).toHaveLength(8);
  expect(questions.every(question => question.answers.length >= 2 && question.answers[question.correct])).toBe(true);
  expect(quizQuestions("library", [], 1)).toEqual([]);
  expect(JSON.stringify(quizQuestions("library", [{ id: "4", title: "Other account" }], 47))).not.toContain("First");
});

test("iQuiz ends at three strikes and music-library rounds lead to wagering bonuses", () => {
  let state = newQuiz("music", tracks, 12);
  for (let i = 0; i < 3; i++) state = advanceQuiz(answerQuiz(state, -1), tracks);
  expect(state).toMatchObject({ phase: "result", strikes: 3 });
  state = newQuiz("library", tracks, 12);
  while (state.phase === "question") state = advanceQuiz(answerQuiz(state, state.questions[state.index].correct), tracks);
  expect(state).toMatchObject({ phase: "bonus", score: 80 });
  state = startQuizBonus(state, tracks, 25);
  expect(state).toMatchObject({ phase: "question", bonus: true, wager: 25 });
  expect(validQuiz(state)).toBe(true);
  expect(answerQuiz(state, state.questions[0].correct).score).toBe(105);
  expect(validQuiz({ ...state, questions: [{ prompt: "bad", answers: ["one"], correct: 0 }] })).toBe(false);
});


test("Trivia deals ten questions; both bonuses complete five rounds without mixing library metadata", () => {
  let trivia = newQuiz("movies", tracks, 4);
  expect(trivia.questions).toHaveLength(10);
  for (let i = 0; i < 10; i++) {
    expect(validQuiz(trivia)).toBe(true);
    trivia = advanceQuiz(answerQuiz(trivia, trivia.questions[trivia.index].correct), tracks);
  }
  expect(trivia.phase).toBe("result");
  let quiz = newQuiz("library", tracks, 47);
  for (let round = 1; round <= 5; round++) {
    while (quiz.phase === "question") quiz = advanceQuiz(answerQuiz(quiz, quiz.questions[quiz.index].correct), tracks);
    expect(quiz).toMatchObject({ round, phase: "bonus" });
    const mode = round % 2 ? "match" : "lightning";
    quiz = chooseQuizBonus(quiz, mode);
    expect(quiz.phase).toBe("wager");
    quiz = startQuizBonus(quiz, tracks, 10);
    expect(quiz.bonusKind).toBe(mode);
    while (quiz.phase === "question" && quiz.bonus) {
      expect(validQuiz(quiz)).toBe(true);
      const correct = quiz.questions[quiz.index].correct;
      quiz = advanceQuiz(answerQuiz(quiz, mode === "lightning" && correct === 1 ? -1 : correct), tracks);
    }
  }
  expect(quiz.phase).toBe("result");
  const matching = startQuizBonus(chooseQuizBonus({ ...newQuiz("library", tracks, 7), phase: "bonus" }, "match"), tracks, 50);
  expect(matching.questions.length).toBeLessThanOrEqual(2);
  expect(matching.questions.every(q => q.answers.length === 2)).toBe(true);
  expect(startQuizBonus({ ...matching, phase: "wager" }, [], 10).bonus).toBe(false);
});

test("Lightning rewards only a true press, skips false neutrally and penalizes the other two cases", () => {
  const base = { ...newQuiz("library", tracks, 1), score: 100, bonus: true, bonusKind: "lightning" as const, wager: 25 };
  const truth = { ...base, questions: [{ prompt: "True", answers: ["正确", "错误"], correct: 0 }] };
  const falsehood = { ...base, questions: [{ prompt: "False", answers: ["正确", "错误"], correct: 1 }] };
  expect(answerQuiz(truth, 0).score).toBe(125);
  expect(answerQuiz(truth, -1).score).toBe(75);
  expect(answerQuiz(falsehood, 0).score).toBe(75);
  expect(answerQuiz(falsehood, -1).score).toBe(100);
  expect(answerQuiz(falsehood, -1).strikes).toBe(0);
});

test("Vortex sticky catches travel with the paddle and release without spending a life", () => {
  const state = { ...launchVortex(newVortex()), stickyUntil: 15, balls: [{ x: 0, y: 111, vx: 0, vy: 100 }] };
  const caught = stepVortex(state, 0.03);
  expect(caught.balls[0].caught).toBeTypeOf("number");
  const positioned = positionVortex(caught, -Math.PI / 2);
  expect(positioned.paddle).toBeCloseTo(Math.PI * 1.5);
  expect(positioned.balls[0].y).toBeLessThan(0);
  expect(caught.paddle).toBeCloseTo(Math.PI / 2);
  const rotated = rotateVortex(caught, 6);
  expect(rotated.balls[0].x).not.toBeCloseTo(caught.balls[0].x);
  expect(stepVortex(rotated, 0.05).balls[0]).toEqual(rotated.balls[0]);
  const released = fireVortex(rotated);
  expect(released.balls[0].caught).toBeUndefined();
  expect(released.lives).toBe(3);
  expect(validVortex(JSON.parse(JSON.stringify(released)))).toBe(true);
});

test("Vortex bombs chain without breaking steel; laser respects armor and clears immediately", () => {
  const state = { ...launchVortex(newVortex(4)), paddle: 0, laserUntil: 10,
    bricks: [{ id: 0, ring: 0, sector: 0, hits: 1, kind: "bomb" as const },
      { id: 1, ring: 0, sector: 1, hits: 1, kind: "bomb" as const },
      { id: 2, ring: 0, sector: 2, hits: 1 },
      { id: 13, ring: 1, sector: 1, hits: 1, kind: "steel" as const }],
  };
  const next = fireVortex(state);
  expect(next.bricks).toEqual([{ id: 13, ring: 1, sector: 1, hits: 1, kind: "steel" }]);
  expect(next).toMatchObject({ score: 75, phase: "cleared" });
  expect(state.bricks).toHaveLength(4);
  const armored = { ...state, bricks: [{ id: 0, ring: 0, sector: 0, hits: 2 }] };
  expect(fireVortex(armored)).toMatchObject({ score: 10, phase: "playing", bricks: [{ hits: 1 }] });
  expect(fireVortex(fireVortex(armored))).toMatchObject({ score: 35, phase: "cleared" });
});

test("Vortex powerups alter real catches and motion, expire and reset after a miss", () => {
  const base = { ...launchVortex(newVortex()), balls: [{ x: 0, y: 105, vx: 0, vy: -100 }] };
  const collect = (kind: typeof base.drops[number]["kind"]) => stepVortex({ ...base,
    drops: [{ kind, angle: Math.PI / 2, radius: 112 }] }, 0.01);
  expect(collect("narrow").narrowUntil).toBeGreaterThan(10);
  expect(collect("triple").tripleUntil).toBeGreaterThan(10);
  expect(collect("power").powerUntil).toBeGreaterThan(10);
  const fast = stepVortex({ ...base, fastUntil: 10 }, 0.03), slow = stepVortex({ ...base, slowUntil: 10 }, 0.03);
  expect(fast.balls[0].y).toBeLessThan(slow.balls[0].y);
  expect(stepVortex({ ...base, fastUntil: 0 }, 0.03).balls).toEqual(stepVortex(base, 0.03).balls);
  const angle = base.paddle + Math.PI * 2 / 3;
  const ball = { x: Math.cos(angle) * 111, y: Math.sin(angle) * 111, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100 };
  expect(stepVortex({ ...base, tripleUntil: 10, balls: [ball] }, 0.03).balls[0].vx).toBeGreaterThan(0);
  const missed = stepVortex({ ...base, stickyUntil: 5, fastUntil: 5, paddle: -Math.PI / 2,
    balls: [{ x: 0, y: 126, vx: 0, vy: 100 }] }, 0.03);
  expect(missed).toMatchObject({ phase: "ready", lives: 2, stickyUntil: 0, fastUntil: 0 });
});
