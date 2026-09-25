/**
 * OTTv2 Core Game Engine
 * Headless, zero-dependency, pure logic module for 9x9 Rock-Paper-Scissors board game.
 */

import {
  BOARD_SIZE,
  COLS,
  ROWS,
  PIECE_TYPES,
  PLAYERS,
  TARGET_SQUARES,
  BEATS,
  GAME_STATUS,
  DEFAULT_SETTINGS,
  DIRECTIONS,
  DEFAULT_STARTING_POSITIONS
} from './constants.js';

export class GameEngine {
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.status = GAME_STATUS.WAITING;
    this.currentPlayer = PLAYERS.P1;
    this.turnNumber = 1;
    this.board = {}; // Tọa độ (vd: "a1") -> Piece object
    this.pieces = []; // Danh sách tất cả quân cờ
    this.remainingPieces = {
      [PLAYERS.P1]: { [PIECE_TYPES.ROCK]: 5, [PIECE_TYPES.PAPER]: 5, [PIECE_TYPES.SCISSORS]: 5 },
      [PLAYERS.P2]: { [PIECE_TYPES.ROCK]: 5, [PIECE_TYPES.PAPER]: 5, [PIECE_TYPES.SCISSORS]: 5 }
    };
    this.timers = {
      [PLAYERS.P1]: this.settings.playerTime,
      [PLAYERS.P2]: this.settings.playerTime,
      lastMoveTimestamp: null
    };
    this.history = [];
    this.stateHistory = []; // Dùng cho Threefold repetition
    this.halfmoveClock = 0; // Đếm số nước đi không có ăn quân (Fifty-move rule)
    this.result = null; // { winner, reason, details }
  }

  /**
   * Chuyển đổi tọa độ chuỗi (vd "a1") sang { col: 0, row: 0 } (0-indexed)
   */
  static posToCoord(pos) {
    if (!pos || pos.length < 2) return null;
    const colStr = pos[0].toLowerCase();
    const rowStr = pos.slice(1);
    const col = COLS.indexOf(colStr);
    const row = parseInt(rowStr, 10) - 1;
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE || isNaN(row)) {
      return null;
    }
    return { col, row };
  }

  /**
   * Chuyển đổi { col, row } sang tọa độ chuỗi (vd "a1")
   */
  static coordToPos(col, row) {
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null;
    return `${COLS[col]}${row + 1}`;
  }

  /**
   * Khởi tạo trận đấu và xếp quân
   */
  initGame() {
    this.status = GAME_STATUS.PLAYING;
    this.currentPlayer = PLAYERS.P1;
    this.turnNumber = 1;
    this.board = {};
    this.pieces = [];
    this.history = [];
    this.stateHistory = [];
    this.halfmoveClock = 0;
    this.result = null;

    this.remainingPieces = {
      [PLAYERS.P1]: { [PIECE_TYPES.ROCK]: 0, [PIECE_TYPES.PAPER]: 0, [PIECE_TYPES.SCISSORS]: 0 },
      [PLAYERS.P2]: { [PIECE_TYPES.ROCK]: 0, [PIECE_TYPES.PAPER]: 0, [PIECE_TYPES.SCISSORS]: 0 }
    };

    this.timers = {
      [PLAYERS.P1]: this.settings.playerTime,
      [PLAYERS.P2]: this.settings.playerTime,
      lastMoveTimestamp: Date.now()
    };

    // Đặt quân cho P1
    DEFAULT_STARTING_POSITIONS.P1.forEach((item, index) => {
      const piece = {
        id: `P1_${item.type}_${index + 1}`,
        player: PLAYERS.P1,
        type: item.type,
        position: item.pos,
        alive: true
      };
      this.board[item.pos] = piece;
      this.pieces.push(piece);
      this.remainingPieces[PLAYERS.P1][item.type]++;
    });

    // Đặt quân cho P2
    DEFAULT_STARTING_POSITIONS.P2.forEach((item, index) => {
      const piece = {
        id: `P2_${item.type}_${index + 1}`,
        player: PLAYERS.P2,
        type: item.type,
        position: item.pos,
        alive: true
      };
      this.board[item.pos] = piece;
      this.pieces.push(piece);
      this.remainingPieces[PLAYERS.P2][item.type]++;
    });

    this.recordBoardState();
  }

  /**
   * Tạo chuỗi băm trạng thái để kiểm tra Threefold Repetition
   */
  getBoardHash() {
    const sortedPieces = this.pieces
      .filter(p => p.alive)
      .map(p => `${p.id}:${p.position}`)
      .sort()
      .join('|');
    return `${this.currentPlayer}-${sortedPieces}`;
  }

  recordBoardState() {
    const hash = this.getBoardHash();
    this.stateHistory.push(hash);
  }

  /**
   * Lấy danh sách nước đi hợp lệ của một quân cờ tại vị trí `pos`
   */
  getLegalMoves(pos) {
    const piece = this.board[pos];
    if (!piece || !piece.alive) return [];

    const coord = GameEngine.posToCoord(pos);
    if (!coord) return [];

    const legalMoves = [];

    // Kiểm tra 8 hướng
    for (const [dc, dr] of DIRECTIONS) {
      const targetCol = coord.col + dc;
      const targetRow = coord.row + dr;

      // Không ra ngoài bàn cờ
      if (targetCol < 0 || targetCol >= BOARD_SIZE || targetRow < 0 || targetRow >= BOARD_SIZE) {
        continue;
      }

      const targetPos = GameEngine.coordToPos(targetCol, targetRow);
      const targetPiece = this.board[targetPos];

      if (!targetPiece) {
        // Ô trống: hoàn toàn hợp lệ
        legalMoves.push(targetPos);
      } else {
        // Có quân trên ô đích:
        if (targetPiece.player === piece.player) {
          // Không được đi vào quân cùng phe
          continue;
        }

        // Là quân đối phương: Áp dụng luật ăn quân Oẳn Tù Tì
        if (BEATS[piece.type] === targetPiece.type) {
          // Quân ta ăn được quân địch (ROCK ăn SCISSORS, SCISSORS ăn PAPER, PAPER ăn ROCK)
          legalMoves.push(targetPos);
        }
        // Trường hợp cùng loại (targetPiece.type === piece.type): Chặn đường, không ăn được
        // Trường hợp quân ta bị khắc chế (BEATS[targetPiece.type] === piece.type): Cấm tự sát
      }
    }

    return legalMoves;
  }

  /**
   * Kiểm tra tính hợp lệ của một nước đi
   */
  validateMove(playerId, from, to) {
    if (this.status !== GAME_STATUS.PLAYING) {
      return { valid: false, reason: 'Trận đấu chưa bắt đầu hoặc đã kết thúc' };
    }

    if (this.currentPlayer !== playerId) {
      return { valid: false, reason: 'Chưa tới lượt của bạn' };
    }

    const piece = this.board[from];
    if (!piece || !piece.alive) {
      return { valid: false, reason: 'Không tìm thấy quân cờ tại ô xuất phát' };
    }

    if (piece.player !== playerId) {
      return { valid: false, reason: 'Bạn chỉ có thể di chuyển quân của mình' };
    }

    const legalMoves = this.getLegalMoves(from);
    if (!legalMoves.includes(to)) {
      const targetPiece = this.board[to];
      if (targetPiece && targetPiece.player === playerId) {
        return { valid: false, reason: 'Không thể đi vào ô chứa quân cùng phe' };
      }
      if (targetPiece && targetPiece.type === piece.type) {
        return { valid: false, reason: 'Hai quân cùng loại không thể ăn nhau, chỉ đứng chặn đường' };
      }
      if (targetPiece && BEATS[targetPiece.type] === piece.type) {
        return { valid: false, reason: 'Luật cấm tự sát: Không được đi vào quân khắc chế bạn' };
      }
      return { valid: false, reason: 'Nước đi không hợp lệ' };
    }

    return { valid: true };
  }

  /**
   * Thực hiện nước đi
   */
  makeMove(playerId, from, to) {
    const validation = this.validateMove(playerId, from, to);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const piece = this.board[from];
    const targetPiece = this.board[to];
    let captured = null;

    // Xử lý ăn quân
    if (targetPiece) {
      captured = { ...targetPiece };
      targetPiece.alive = false;
      this.remainingPieces[targetPiece.player][targetPiece.type]--;
      this.halfmoveClock = 0; // Reset 50-move rule khi có ăn quân
    } else {
      this.halfmoveClock++;
    }

    // Di chuyển quân
    delete this.board[from];
    piece.position = to;
    this.board[to] = piece;

    // Ghi nhận lịch sử
    const moveRecord = {
      moveNumber: this.history.length + 1,
      playerId,
      pieceId: piece.id,
      pieceType: piece.type,
      from,
      to,
      capturedPiece: captured ? { id: captured.id, type: captured.type, player: captured.player } : null,
      timestamp: Date.now()
    };
    this.history.push(moveRecord);

    // Kiểm tra điều kiện thắng
    const winResult = this.checkWinCondition(playerId, to);
    if (winResult) {
      this.status = GAME_STATUS.FINISHED;
      this.result = winResult;
      return { success: true, move: moveRecord, gameOver: true, result: winResult };
    }

    // Chuyển lượt
    this.currentPlayer = (this.currentPlayer === PLAYERS.P1) ? PLAYERS.P2 : PLAYERS.P1;
    this.turnNumber++;
    this.recordBoardState();

    // Kiểm tra điều kiện hòa
    const drawResult = this.checkDrawCondition();
    if (drawResult) {
      this.status = GAME_STATUS.FINISHED;
      this.result = drawResult;
      return { success: true, move: moveRecord, gameOver: true, result: drawResult };
    }

    // Kiểm tra Stalemate sau khi chuyển lượt
    if (this.isStalemate(this.currentPlayer)) {
      this.status = GAME_STATUS.FINISHED;
      this.result = {
        winner: null,
        reason: 'STALEMATE',
        details: `Người chơi ${this.currentPlayer} không còn nước đi hợp lệ nào (Hòa cờ)`
      };
      return { success: true, move: moveRecord, gameOver: true, result: this.result };
    }

    return { success: true, move: moveRecord, gameOver: false };
  }

  /**
   * Kiểm tra điều kiện thắng sau nước đi
   */
  checkWinCondition(playerId, targetPos) {
    const opponent = (playerId === PLAYERS.P1) ? PLAYERS.P2 : PLAYERS.P1;

    // WIN CONDITION 1: Ăn hết toàn bộ quân của đối phương
    const opponentTotalPieces = (this.remainingPieces[opponent][PIECE_TYPES.ROCK] || 0) +
                                (this.remainingPieces[opponent][PIECE_TYPES.PAPER] || 0) +
                                (this.remainingPieces[opponent][PIECE_TYPES.SCISSORS] || 0);
    if (opponentTotalPieces === 0) {
      return {
        winner: playerId,
        reason: 'ELIMINATED_ALL',
        details: `Người chơi ${playerId} thắng vì đã ăn sạch toàn bộ quân cờ của đối phương!`
      };
    }

    // WIN CONDITION 2: Ăn hết 1 loại quân của đối phương (Đấm, Lá hoặc Kéo)
    for (const type of [PIECE_TYPES.ROCK, PIECE_TYPES.PAPER, PIECE_TYPES.SCISSORS]) {
      if (this.remainingPieces[opponent][type] === 0) {
        return {
          winner: playerId,
          reason: 'ELIMINATED_TYPE',
          details: `Người chơi ${playerId} thắng vì đã ăn sạch toàn bộ quân ${type} của đối phương!`
        };
      }
    }

    // WIN CONDITION 3: Đưa quân vào ô đích (i9 cho P1, a1 cho P2)
    if (targetPos === TARGET_SQUARES[playerId]) {
      return {
        winner: playerId,
        reason: 'REACHED_TARGET',
        details: `Người chơi ${playerId} thắng vì đã đưa quân thành công vào ô đích ${TARGET_SQUARES[playerId]}!`
      };
    }

    return null;
  }

  /**
   * Kiểm tra điều kiện hòa
   */
  checkDrawCondition() {
    // 1. Fifty-move rule (50 nước liên tục không có ăn quân)
    if (this.settings.enableFiftyMoveRule && this.halfmoveClock >= 100) {
      // 100 half-moves = 50 full turns
      return {
        winner: null,
        reason: 'FIFTY_MOVE_RULE',
        details: 'Hòa cờ theo luật 50 nước đi liên tiếp không có quân nào bị ăn'
      };
    }

    // 2. Threefold Repetition (Lặp lại cùng trạng thái 3 lần)
    if (this.settings.enableThreefoldRepetition) {
      const currentHash = this.getBoardHash();
      const count = this.stateHistory.filter(h => h === currentHash).length;
      if (count >= 3) {
        return {
          winner: null,
          reason: 'THREEFOLD_REPETITION',
          details: 'Hòa cờ: Trạng thái bàn cờ đã lặp lại 3 lần'
        };
      }
    }

    return null;
  }

  /**
   * Kiểm tra xem người chơi có bị hết nước đi hợp lệ không (Stalemate)
   */
  isStalemate(playerId) {
    const playerPieces = this.pieces.filter(p => p.alive && p.player === playerId);
    for (const piece of playerPieces) {
      const moves = this.getLegalMoves(piece.position);
      if (moves.length > 0) return false;
    }
    return true;
  }

  /**
   * Người chơi đầu hàng
   */
  resign(playerId) {
    if (this.status !== GAME_STATUS.PLAYING) return false;
    const opponent = (playerId === PLAYERS.P1) ? PLAYERS.P2 : PLAYERS.P1;
    this.status = GAME_STATUS.FINISHED;
    this.result = {
      winner: opponent,
      reason: 'RESIGNATION',
      details: `Người chơi ${playerId} đã đầu hàng. ${opponent} giành chiến thắng!`
    };
    return this.result;
  }

  /**
   * Hết thời gian
   */
  handleTimeout(playerId) {
    if (this.status !== GAME_STATUS.PLAYING) return false;
    const opponent = (playerId === PLAYERS.P1) ? PLAYERS.P2 : PLAYERS.P1;
    this.status = GAME_STATUS.FINISHED;
    this.result = {
      winner: opponent,
      reason: 'TIMEOUT',
      details: `Người chơi ${playerId} đã hết thời gian. ${opponent} giành chiến thắng!`
    };
    return this.result;
  }

  /**
   * Lấy snapshot trạng thái game để đồng bộ qua mạng hoặc lưu trữ
   */
  getState() {
    return {
      status: this.status,
      currentPlayer: this.currentPlayer,
      turnNumber: this.turnNumber,
      board: { ...this.board },
      pieces: this.pieces.map(p => ({ ...p })),
      remainingPieces: {
        [PLAYERS.P1]: { ...this.remainingPieces[PLAYERS.P1] },
        [PLAYERS.P2]: { ...this.remainingPieces[PLAYERS.P2] }
      },
      timers: { ...this.timers },
      history: [...this.history],
      halfmoveClock: this.halfmoveClock,
      result: this.result ? { ...this.result } : null,
      settings: { ...this.settings }
    };
  }

  /**
   * Nạp lại trạng thái từ snapshot (phục vụ Reconnect / Sync)
   */
  loadState(state) {
    this.status = state.status;
    this.currentPlayer = state.currentPlayer;
    this.turnNumber = state.turnNumber;
    this.board = { ...state.board };
    this.pieces = state.pieces.map(p => ({ ...p }));
    this.remainingPieces = {
      [PLAYERS.P1]: { ...state.remainingPieces[PLAYERS.P1] },
      [PLAYERS.P2]: { ...state.remainingPieces[PLAYERS.P2] }
    };
    this.timers = { ...state.timers };
    this.history = [...state.history];
    this.halfmoveClock = state.halfmoveClock || 0;
    this.result = state.result ? { ...state.result } : null;
    if (state.settings) {
      this.settings = { ...this.settings, ...state.settings };
    }
  }
}
