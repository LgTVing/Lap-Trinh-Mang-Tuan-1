/**
 * OTTv2 Constants & Configuration Defaults
 */

export const BOARD_SIZE = 9;
export const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
export const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const PIECE_TYPES = {
  ROCK: 'ROCK',
  PAPER: 'PAPER',
  SCISSORS: 'SCISSORS'
};

export const PLAYERS = {
  P1: 'P1', // Đi trước, xuất phát hàng 1-3, mục tiêu i9
  P2: 'P2'  // Đi sau, xuất phát hàng 7-9, mục tiêu a1
};

export const TARGET_SQUARES = {
  P1: 'i9',
  P2: 'a1'
};

// Quan hệ ăn quân: Kẻ thắng -> Kẻ thua
export const BEATS = {
  [PIECE_TYPES.ROCK]: PIECE_TYPES.SCISSORS,
  [PIECE_TYPES.SCISSORS]: PIECE_TYPES.PAPER,
  [PIECE_TYPES.PAPER]: PIECE_TYPES.ROCK
};

export const GAME_STATUS = {
  WAITING: 'WAITING',
  READY: 'READY',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
};

export const DEFAULT_SETTINGS = {
  boardSize: 9,
  piecesPerType: 5,
  playerTime: 600, // 10 phút (giây)
  moveTime: null,  // Không giới hạn mỗi nước
  enableThreefoldRepetition: true,
  enableFiftyMoveRule: true,
  disconnectGracePeriod: 60,
  allowResign: true,
  allowRematch: true
};

// 8 hướng di chuyển quanh 1 ô (dx, dy)
export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Layout ban đầu cân đối: 5 Rock, 5 Paper, 5 Scissors mỗi bên
export const DEFAULT_STARTING_POSITIONS = {
  P1: [
    // Hàng 1 (5 quân)
    { pos: 'a1', type: PIECE_TYPES.ROCK },
    { pos: 'c1', type: PIECE_TYPES.PAPER },
    { pos: 'e1', type: PIECE_TYPES.SCISSORS },
    { pos: 'g1', type: PIECE_TYPES.ROCK },
    { pos: 'i1', type: PIECE_TYPES.PAPER },
    // Hàng 2 (5 quân)
    { pos: 'b2', type: PIECE_TYPES.SCISSORS },
    { pos: 'd2', type: PIECE_TYPES.ROCK },
    { pos: 'e2', type: PIECE_TYPES.ROCK },
    { pos: 'f2', type: PIECE_TYPES.PAPER },
    { pos: 'h2', type: PIECE_TYPES.SCISSORS },
    // Hàng 3 (5 quân)
    { pos: 'a3', type: PIECE_TYPES.PAPER },
    { pos: 'c3', type: PIECE_TYPES.SCISSORS },
    { pos: 'e3', type: PIECE_TYPES.PAPER },
    { pos: 'g3', type: PIECE_TYPES.SCISSORS },
    { pos: 'i3', type: PIECE_TYPES.ROCK }
  ],
  P2: [
    // Hàng 9 (5 quân)
    { pos: 'i9', type: PIECE_TYPES.ROCK },
    { pos: 'g9', type: PIECE_TYPES.PAPER },
    { pos: 'e9', type: PIECE_TYPES.SCISSORS },
    { pos: 'c9', type: PIECE_TYPES.ROCK },
    { pos: 'a9', type: PIECE_TYPES.PAPER },
    // Hàng 8 (5 quân)
    { pos: 'h8', type: PIECE_TYPES.SCISSORS },
    { pos: 'f8', type: PIECE_TYPES.ROCK },
    { pos: 'e8', type: PIECE_TYPES.ROCK },
    { pos: 'd8', type: PIECE_TYPES.PAPER },
    { pos: 'b8', type: PIECE_TYPES.SCISSORS },
    // Hàng 7 (5 quân)
    { pos: 'i7', type: PIECE_TYPES.PAPER },
    { pos: 'g7', type: PIECE_TYPES.SCISSORS },
    { pos: 'e7', type: PIECE_TYPES.PAPER },
    { pos: 'c7', type: PIECE_TYPES.SCISSORS },
    { pos: 'a7', type: PIECE_TYPES.ROCK }
  ]
};
