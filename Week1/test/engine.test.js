import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/GameEngine.js';
import { PIECE_TYPES, PLAYERS, TARGET_SQUARES, GAME_STATUS } from '../js/constants.js';

test('1. Bàn cờ khởi tạo đủ 30 quân (15 quân P1, 15 quân P2: mỗi bên 5 Đấm, 5 Lá, 5 Kéo)', () => {
  const game = new GameEngine();
  game.initGame();

  assert.equal(game.pieces.length, 30);
  assert.equal(game.pieces.filter(p => p.player === PLAYERS.P1).length, 15);
  assert.equal(game.pieces.filter(p => p.player === PLAYERS.P2).length, 15);

  assert.equal(game.remainingPieces[PLAYERS.P1][PIECE_TYPES.ROCK], 5);
  assert.equal(game.remainingPieces[PLAYERS.P1][PIECE_TYPES.PAPER], 5);
  assert.equal(game.remainingPieces[PLAYERS.P1][PIECE_TYPES.SCISSORS], 5);

  assert.equal(game.remainingPieces[PLAYERS.P2][PIECE_TYPES.ROCK], 5);
  assert.equal(game.remainingPieces[PLAYERS.P2][PIECE_TYPES.PAPER], 5);
  assert.equal(game.remainingPieces[PLAYERS.P2][PIECE_TYPES.SCISSORS], 5);
});

test('2. ROCK ăn SCISSORS', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P2_S', player: PLAYERS.P2, type: PIECE_TYPES.SCISSORS, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);
  game.remainingPieces[PLAYERS.P2][PIECE_TYPES.SCISSORS] = 1;

  const legalMoves = game.getLegalMoves('e4');
  assert.ok(legalMoves.includes('e5'), 'ROCK phải có nước đi hợp lệ vào ô SCISSORS của đối thủ');

  const moveResult = game.makeMove(PLAYERS.P1, 'e4', 'e5');
  assert.equal(moveResult.success, true);
  assert.equal(game.board['e5'].id, 'P1_R');
  assert.equal(game.remainingPieces[PLAYERS.P2][PIECE_TYPES.SCISSORS], 0);
});

test('3. SCISSORS ăn PAPER', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_S', player: PLAYERS.P1, type: PIECE_TYPES.SCISSORS, position: 'e4', alive: true },
    'e5': { id: 'P2_P', player: PLAYERS.P2, type: PIECE_TYPES.PAPER, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e4');
  assert.ok(legalMoves.includes('e5'));
});

test('4. PAPER ăn ROCK', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_P', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'e4', alive: true },
    'e5': { id: 'P2_R', player: PLAYERS.P2, type: PIECE_TYPES.ROCK, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e4');
  assert.ok(legalMoves.includes('e5'));
});

test('5. ROCK không ăn ROCK (chỉ chặn đường)', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P2_R', player: PLAYERS.P2, type: PIECE_TYPES.ROCK, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e4');
  assert.equal(legalMoves.includes('e5'), false, 'ROCK không được phép ăn ROCK');
});

test('6. PAPER không ăn PAPER & SCISSORS không ăn SCISSORS', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.board = {
    'e4': { id: 'P1_P', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'e4', alive: true },
    'e5': { id: 'P2_P', player: PLAYERS.P2, type: PIECE_TYPES.PAPER, position: 'e5', alive: true },
    'f4': { id: 'P1_S', player: PLAYERS.P1, type: PIECE_TYPES.SCISSORS, position: 'f4', alive: true },
    'f5': { id: 'P2_S', player: PLAYERS.P2, type: PIECE_TYPES.SCISSORS, position: 'f5', alive: true }
  };
  game.pieces = Object.values(game.board);

  assert.equal(game.getLegalMoves('e4').includes('e5'), false);
  assert.equal(game.getLegalMoves('f4').includes('f5'), false);
});

test('7. Luật cấm tự sát: ROCK không được đi vào ô PAPER', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P2_P', player: PLAYERS.P2, type: PIECE_TYPES.PAPER, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e4');
  assert.equal(legalMoves.includes('e5'), false, 'Cấm tự sát: ROCK không được vào ô PAPER');

  const validation = game.validateMove(PLAYERS.P1, 'e4', 'e5');
  assert.equal(validation.valid, false);
});

test('8. Quân cờ chỉ di chuyển 1 ô theo 8 hướng quanh nó', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e5': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e5');
  assert.equal(legalMoves.length, 8);
  const expected = ['d4', 'd5', 'd6', 'e4', 'e6', 'f4', 'f5', 'f6'];
  for (const exp of expected) {
    assert.ok(legalMoves.includes(exp), `Phải chứa ô ${exp}`);
  }
});

test('9. Không đi ra ngoài bàn cờ', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.board = {
    'a1': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'a1', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('a1');
  // Góc a1 chỉ có 3 ô kế cận: a2, b1, b2
  assert.equal(legalMoves.length, 3);
  assert.deepEqual(legalMoves.sort(), ['a2', 'b1', 'b2'].sort());
});

test('10. Không đi vào quân cùng phe', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.board = {
    'e4': { id: 'P1_R1', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P1_R2', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);

  const legalMoves = game.getLegalMoves('e4');
  assert.equal(legalMoves.includes('e5'), false);
});

test('11. Chỉ đúng player mới được đi', () => {
  const game = new GameEngine();
  game.initGame();
  game.currentPlayer = PLAYERS.P1;

  // P2 cố tình đi khi lượt là P1
  const validation = game.validateMove(PLAYERS.P2, 'e7', 'e6');
  assert.equal(validation.valid, false);
});

test('12. Không được đi khi game đã kết thúc', () => {
  const game = new GameEngine();
  game.initGame();
  game.status = GAME_STATUS.FINISHED;

  const validation = game.validateMove(PLAYERS.P1, 'a3', 'a4');
  assert.equal(validation.valid, false);
});

test('13. Ăn hết một loại quân của đối phương => Thắng ngay lập tức', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P2_S', player: PLAYERS.P2, type: PIECE_TYPES.SCISSORS, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);
  // Đối thủ chỉ còn duy nhất 1 SCISSORS này
  game.remainingPieces[PLAYERS.P2] = {
    [PIECE_TYPES.ROCK]: 5,
    [PIECE_TYPES.PAPER]: 5,
    [PIECE_TYPES.SCISSORS]: 1
  };

  const moveRes = game.makeMove(PLAYERS.P1, 'e4', 'e5');
  assert.equal(moveRes.gameOver, true);
  assert.equal(moveRes.result.winner, PLAYERS.P1);
  assert.equal(moveRes.result.reason, 'ELIMINATED_TYPE');
});

test('13b. Ăn hết sạch toàn bộ 100% quân cờ của đối thủ => Thắng ngay lập tức (ELIMINATED_ALL)', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e5': { id: 'P2_S', player: PLAYERS.P2, type: PIECE_TYPES.SCISSORS, position: 'e5', alive: true }
  };
  game.pieces = Object.values(game.board);
  // Đối thủ chỉ còn duy nhất 1 quân cờ này trên toàn bàn cờ
  game.remainingPieces[PLAYERS.P2] = {
    [PIECE_TYPES.ROCK]: 0,
    [PIECE_TYPES.PAPER]: 0,
    [PIECE_TYPES.SCISSORS]: 1
  };

  const moveRes = game.makeMove(PLAYERS.P1, 'e4', 'e5');
  assert.equal(moveRes.gameOver, true);
  assert.equal(moveRes.result.winner, PLAYERS.P1);
  assert.equal(moveRes.result.reason, 'ELIMINATED_ALL');
});

test('14. Đưa quân vào ô đích => Thắng ngay lập tức (P1 vào i9, P2 vào a1)', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'h8': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'h8', alive: true }
  };
  game.pieces = Object.values(game.board);
  game.remainingPieces[PLAYERS.P2] = { [PIECE_TYPES.ROCK]: 5, [PIECE_TYPES.PAPER]: 5, [PIECE_TYPES.SCISSORS]: 5 };

  const moveRes = game.makeMove(PLAYERS.P1, 'h8', 'i9');
  assert.equal(moveRes.gameOver, true);
  assert.equal(moveRes.result.winner, PLAYERS.P1);
  assert.equal(moveRes.result.reason, 'REACHED_TARGET');
});

test('15. Resign (Đầu hàng) => Đối thủ thắng', () => {
  const game = new GameEngine();
  game.initGame();

  const res = game.resign(PLAYERS.P1);
  assert.equal(game.status, GAME_STATUS.FINISHED);
  assert.equal(res.winner, PLAYERS.P2);
  assert.equal(res.reason, 'RESIGNATION');
});

test('16. Timeout => Đối thủ thắng', () => {
  const game = new GameEngine();
  game.initGame();

  const res = game.handleTimeout(PLAYERS.P2);
  assert.equal(game.status, GAME_STATUS.FINISHED);
  assert.equal(res.winner, PLAYERS.P1);
  assert.equal(res.reason, 'TIMEOUT');
});

test('17. Threefold Repetition => Hòa cờ', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  game.board = {
    'e4': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'e4', alive: true },
    'e6': { id: 'P2_R', player: PLAYERS.P2, type: PIECE_TYPES.ROCK, position: 'e6', alive: true }
  };
  game.pieces = Object.values(game.board);
  game.recordBoardState();

  // Nước 1: P1 e4 -> d4, P2 e6 -> d6
  game.makeMove(PLAYERS.P1, 'e4', 'd4');
  game.makeMove(PLAYERS.P2, 'e6', 'd6');
  // Nước 2: P1 d4 -> e4, P2 d6 -> e6 (Lần 2)
  game.makeMove(PLAYERS.P1, 'd4', 'e4');
  game.makeMove(PLAYERS.P2, 'd6', 'e6');
  // Nước 3: P1 e4 -> d4, P2 e6 -> d6
  game.makeMove(PLAYERS.P1, 'e4', 'd4');
  game.makeMove(PLAYERS.P2, 'e6', 'd6');
  // Nước 4: P1 d4 -> e4, P2 d6 -> e6 (Lần 3: Trạng thái ban đầu lặp lại lần 3)
  game.makeMove(PLAYERS.P1, 'd4', 'e4');
  const res = game.makeMove(PLAYERS.P2, 'd6', 'e6');
  assert.equal(res.gameOver, true);
  assert.equal(res.result.reason, 'THREEFOLD_REPETITION');
});

test('18. Stalemate (Không còn nước đi hợp lệ) => Hòa cờ', () => {
  const game = new GameEngine();
  game.status = GAME_STATUS.PLAYING;
  game.currentPlayer = PLAYERS.P1;
  // Xếp thế cờ mà P2 ở góc và bị bao vây hoàn toàn bởi quân khắc chế nó
  game.board = {
    'i1': { id: 'P1_R', player: PLAYERS.P1, type: PIECE_TYPES.ROCK, position: 'i1', alive: true },
    'a9': { id: 'P2_R', player: PLAYERS.P2, type: PIECE_TYPES.ROCK, position: 'a9', alive: true },
    'a8': { id: 'P1_P1', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'a8', alive: true },
    'b9': { id: 'P1_P2', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'b9', alive: true },
    'b8': { id: 'P1_P3', player: PLAYERS.P1, type: PIECE_TYPES.PAPER, position: 'b8', alive: true }
  };
  game.pieces = Object.values(game.board);

  // P1 đi một nước bất kỳ không chạm tới P2
  const moveRes = game.makeMove(PLAYERS.P1, 'i1', 'h1');
  assert.equal(moveRes.gameOver, true);
  assert.equal(moveRes.result.reason, 'STALEMATE');
});

test('19. State Serialization & Deserialization không làm mất dữ liệu', () => {
  const game = new GameEngine();
  game.initGame();
  game.makeMove(PLAYERS.P1, 'a3', 'a4');

  const snapshot = game.getState();
  const game2 = new GameEngine();
  game2.loadState(snapshot);

  assert.equal(game2.currentPlayer, PLAYERS.P2);
  assert.equal(game2.turnNumber, 2);
  assert.equal(game2.board['a4'].id, game.board['a4'].id);
  assert.equal(game2.pieces.length, 30);
});
