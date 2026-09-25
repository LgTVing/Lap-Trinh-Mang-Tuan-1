/**
 * Tournament Manager - OTTv2 Pro Championship
 * Quản lý giải đấu 8 Pro Player trên 4 bàn thi đấu đồng thời.
 * Hỗ trợ phân quyền chặt chẽ (Pro Player, Khán giả Guest/Player, Quản trị viên Admin)
 * và đồng bộ Real-time qua playhtml.fun.
 */

import { GameEngine } from './GameEngine.js';
import { PLAYERS, GAME_STATUS, PIECE_TYPES } from './constants.js';

let playhtmlModule = null;
async function loadPlayhtml() {
  if (playhtmlModule) return playhtmlModule;
  try {
    const mod = await import('https://unpkg.com/playhtml');
    playhtmlModule = mod.playhtml;
    return playhtmlModule;
  } catch (err) {
    console.warn('Không thể tải CDN playhtml cho giải đấu, chạy chế độ Offline State:', err);
    return null;
  }
}

// Cấu hình cố định 4 bàn đấu cho 8 Pro Player
export const TOURNAMENT_TABLES_CONFIG = [
  {
    id: 1,
    name: 'Bàn 1: Siêu Kinh Điển',
    p1: { username: 'pro_faker', name: 'Lee Sang-hyeok (Faker)', rating: 2850, title: 'Huyền thoại Bất tử' },
    p2: { username: 'pro_magnus', name: 'Magnus Carlsen', rating: 2882, title: 'Đại kiện tướng Thế giới' }
  },
  {
    id: 2,
    name: 'Bàn 2: Bậc Thầy Chiến Thuật',
    p1: { username: 'pro_hikaru', name: 'Hikaru Nakamura', rating: 2835, title: 'Bậc thầy Cờ chớp' },
    p2: { username: 'pro_viper', name: 'TheViper (AoE)', rating: 2680, title: 'Chiến thuật gia Đỉnh cao' }
  },
  {
    id: 3,
    name: 'Bàn 3: Thần Tốc Quyết Đấu',
    p1: { username: 'pro_s1mple', name: 's1mple (CS:GO)', rating: 2720, title: 'Xạ thủ Tối thượng' },
    p2: { username: 'pro_flash', name: 'Lee Young-ho (Flash)', rating: 2890, title: 'Thần Rồng Tối cao' }
  },
  {
    id: 4,
    name: 'Bàn 4: Kỳ Phùng Địch Thủ',
    p1: { username: 'pro_chovy', name: 'Jeong Ji-hoon (Chovy)', rating: 2760, title: 'Vua Đi Đường' },
    p2: { username: 'pro_dendi', name: 'Danil Ishutin (Dendi)', rating: 2610, title: 'Thần Kéo Trái Tim' }
  }
];

export class TournamentManager {
  constructor({ onTournamentUpdate, onToast }) {
    this.onTournamentUpdate = onTournamentUpdate || (() => {});
    this.onToast = onToast || (() => {});

    this.channel = null;
    this.engines = {}; // id (1-4) -> GameEngine
    this.tournamentState = this.createInitialTournamentState();
    this.isConnected = false;
    this.autoSimInterval = null;

    // Danh sách tuyển thủ đã xác thực mã giải đấu để được quyền di chuyển quân
    this.verifiedProPlayers = new Set();
    TOURNAMENT_TABLES_CONFIG.forEach(cfg => {
      this.verifiedProPlayers.add(cfg.p1.username.toLowerCase());
      this.verifiedProPlayers.add(cfg.p2.username.toLowerCase());
    });
  }

  static generateTournamentCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PRO-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  createInitialTournamentState(customCode = null) {
    const tables = {};
    TOURNAMENT_TABLES_CONFIG.forEach(cfg => {
      const engine = new GameEngine({ playerTime: 900 }); // 15 phút cho giải đấu
      engine.initGame();
      this.engines[cfg.id] = engine;

      tables[cfg.id] = {
        id: cfg.id,
        name: cfg.name,
        p1: { ...cfg.p1, playerRole: PLAYERS.P1 },
        p2: { ...cfg.p2, playerRole: PLAYERS.P2 },
        status: GAME_STATUS.PLAYING,
        gameState: engine.getState(),
        lastMove: null,
        result: null
      };
    });

    return {
      tournamentCode: customCode || 'PRO-8899',
      active: true,
      round: 1,
      allFinished: false,
      tables,
      updatedAt: Date.now()
    };
  }

  /**
   * Admin bấm tạo giải đấu -> Sinh mã mới và làm mới 4 bàn
   */
  createTournament(isAdmin) {
    if (!isAdmin) {
      return { success: false, error: 'Chỉ có tài khoản Admin (Ban Tổ Chức) mới có quyền tạo giải đấu!' };
    }
    const newCode = TournamentManager.generateTournamentCode();
    this.tournamentState = this.createInitialTournamentState(newCode);
    this.verifiedProPlayers.clear(); // Tuyển thủ cần nhập mã mới để vào đánh
    this.broadcastTournamentState();
    return { success: true, tournamentCode: newCode };
  }

  /**
   * Tuyển thủ Pro Player nhập mã giải đấu để mở khóa quyền thi đấu
   */
  verifyProPlayerCode(username, inputCode) {
    const assignment = this.getPlayerAssignment(username);
    if (!assignment) {
      return { success: false, error: 'Tài khoản của bạn không thuộc danh sách 8 Tuyển thủ Pro Player!' };
    }
    const clean = (inputCode || '').trim().toUpperCase();
    const currentCode = (this.tournamentState.tournamentCode || 'PRO-8899').toUpperCase();
    if (clean === currentCode) {
      this.verifiedProPlayers.add(username.trim().toLowerCase());
      return { success: true, tableId: assignment.tableId, role: assignment.role };
    }
    return { success: false, error: `Mã giải đấu không chính xác! Vui lòng nhập đúng mã giải do Admin cấp.` };
  }

  isProPlayerVerified(username) {
    if (!username) return false;
    return this.verifiedProPlayers.has(username.trim().toLowerCase());
  }

  /**
   * Kiểm tra mã giải đấu khi tuyển thủ hoặc viewer nhập vào
   */
  validateTournamentCode(inputCode) {
    if (!this.tournamentState || !this.tournamentState.tournamentCode) {
      return { valid: false, error: 'Chưa có giải đấu nào được kích hoạt!' };
    }
    const clean = (inputCode || '').trim().toUpperCase();
    if (clean === this.tournamentState.tournamentCode.toUpperCase()) {
      return { valid: true, tournamentCode: this.tournamentState.tournamentCode };
    }
    return { valid: false, error: `Mã giải đấu không chính xác! (Mã đúng định dạng PRO-XXXX)` };
  }

  async init() {
    await this.connectPlayhtml();
  }

  async connectPlayhtml() {
    const playhtml = await loadPlayhtml();
    if (!playhtml) return;

    try {
      await playhtml.init({
        room: 'ottv2_tournament_pro_league_v1',
        cursors: false
      });

      const defaultPayload = {
        dataStr: JSON.stringify(this.tournamentState)
      };

      this.channel = playhtml.createPageData('tournament_channel', defaultPayload);

      const current = this.channel.getData();
      if (current && current.dataStr) {
        try {
          const parsed = JSON.parse(current.dataStr);
          this.applyIncomingTournamentState(parsed);
        } catch (e) {}
      }

      this.channel.onUpdate((val) => {
        if (val && val.dataStr) {
          try {
            const parsed = JSON.parse(val.dataStr);
            this.applyIncomingTournamentState(parsed);
          } catch (e) {
            console.warn('Lỗi phân tích gói tin giải đấu:', e);
          }
        }
      });

      this.isConnected = true;
    } catch (e) {
      console.warn('Không thể kết nối phòng giải đấu playhtml:', e);
    }
  }

  broadcastTournamentState() {
    this.tournamentState.updatedAt = Date.now();
    this.checkAllFinished();

    if (this.channel) {
      try {
        this.channel.setData({
          dataStr: JSON.stringify(this.tournamentState)
        });
      } catch (e) {
        console.warn('Lỗi broadcast tournament state:', e);
      }
    }

    this.onTournamentUpdate(this.tournamentState);
  }

  applyIncomingTournamentState(remoteState) {
    if (!remoteState || !remoteState.tables) return;
    this.tournamentState = remoteState;

    // Đồng bộ lại GameEngine nội bộ cho cả 4 bàn
    Object.keys(remoteState.tables).forEach(tableId => {
      const t = remoteState.tables[tableId];
      if (t && t.gameState && this.engines[tableId]) {
        this.engines[tableId].loadState(t.gameState);
      }
    });

    this.onTournamentUpdate(this.tournamentState);
  }

  checkAllFinished() {
    const tables = Object.values(this.tournamentState.tables);
    const finishedCount = tables.filter(t => t.status === GAME_STATUS.FINISHED).length;
    this.tournamentState.allFinished = (finishedCount === tables.length);
    return this.tournamentState.allFinished;
  }

  /**
   * Lấy thông tin bàn đấu của một pro player theo username
   * Trả về { tableId, role: 'P1'|'P2', opponent } hoặc null nếu không phải tuyển thủ
   */
  getPlayerAssignment(username) {
    if (!username) return null;
    const cleanUser = username.trim().toLowerCase();

    for (const cfg of TOURNAMENT_TABLES_CONFIG) {
      if (cfg.p1.username.toLowerCase() === cleanUser) {
        return { tableId: cfg.id, role: PLAYERS.P1, opponent: cfg.p2, playerInfo: cfg.p1 };
      }
      if (cfg.p2.username.toLowerCase() === cleanUser) {
        return { tableId: cfg.id, role: PLAYERS.P2, opponent: cfg.p1, playerInfo: cfg.p2 };
      }
    }
    return null;
  }

  /**
   * Kiểm tra quyền thực hiện nước đi tại bàn `tableId` của `username`
   */
  canMakeMove(username, tableId) {
    if (this.tournamentState.allFinished) return { allowed: false, reason: 'Tất cả các bàn đã kết thúc ván đấu!' };

    const table = this.tournamentState.tables[tableId];
    if (!table) return { allowed: false, reason: 'Bàn đấu không tồn tại!' };
    if (table.status === GAME_STATUS.FINISHED) return { allowed: false, reason: 'Bàn đấu này đã kết thúc!' };

    const assignment = this.getPlayerAssignment(username);
    if (!assignment) {
      return { allowed: false, reason: 'Chế độ Khán giả (Spectator): Bạn chỉ được phép theo dõi, không được can thiệp vào ván đấu!' };
    }

    const cleanUser = username.trim().toLowerCase();
    if (!this.verifiedProPlayers.has(cleanUser)) {
      return { allowed: false, reason: 'Tuyển thủ cần nhập đúng mã giải đấu để được cấp quyền thi đấu!' };
    }

    if (assignment.tableId !== Number(tableId)) {
      return { allowed: false, reason: `Bạn được phân công thi đấu tại Bàn ${assignment.tableId}, không được can thiệp Bàn ${tableId}!` };
    }

    const engine = this.engines[tableId];
    if (!engine) return { allowed: false, reason: 'Lỗi động cơ bàn đấu!' };

    if (engine.currentPlayer !== assignment.role) {
      return { allowed: false, reason: 'Chưa tới lượt đi của bạn!' };
    }

    return { allowed: true, role: assignment.role };
  }

  /**
   * Tuyển thủ thực hiện nước đi
   */
  makeMove(username, tableId, from, to) {
    const check = this.canMakeMove(username, tableId);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    const engine = this.engines[tableId];
    const moveRes = engine.makeMove(check.role, from, to);

    if (moveRes.success) {
      const table = this.tournamentState.tables[tableId];
      table.gameState = engine.getState();
      table.lastMove = moveRes.move;

      if (moveRes.gameOver) {
        table.status = GAME_STATUS.FINISHED;
        table.result = moveRes.result;
      }

      this.broadcastTournamentState();
      return { success: true, move: moveRes.move, gameOver: moveRes.gameOver, result: moveRes.result };
    }

    return { success: false, error: moveRes.error };
  }

  /**
   * Tuyển thủ đầu hàng tại bàn của mình
   */
  resign(username, tableId) {
    const assignment = this.getPlayerAssignment(username);
    if (!assignment || assignment.tableId !== Number(tableId)) {
      return { success: false, error: 'Bạn không có quyền đầu hàng ở bàn đấu này!' };
    }

    const engine = this.engines[tableId];
    if (!engine || engine.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'Bàn đấu không trong trạng thái thi đấu!' };
    }

    const result = engine.resign(assignment.role);
    const table = this.tournamentState.tables[tableId];
    table.status = GAME_STATUS.FINISHED;
    table.gameState = engine.getState();
    table.result = result;

    this.broadcastTournamentState();
    return { success: true, result };
  }

  /**
   * Hai bên thỏa thuận hòa tại bàn
   */
  agreeDraw(tableId) {
    const engine = this.engines[tableId];
    if (!engine || engine.status !== GAME_STATUS.PLAYING) return { success: false };

    const result = engine.agreeDraw('AGREEMENT');
    const table = this.tournamentState.tables[tableId];
    table.status = GAME_STATUS.FINISHED;
    table.gameState = engine.getState();
    table.result = result;

    this.broadcastTournamentState();
    return { success: true, result };
  }

  /**
   * Quản trị viên (Admin) khởi động lại vòng đấu mới cho tất cả 4 bàn
   */
  restartTournament(isAdmin) {
    if (!isAdmin) {
      return { success: false, error: 'Chỉ có tài khoản Ban Tổ Chức (Admin) mới có quyền khởi động lại vòng đấu!' };
    }

    const currentCode = this.tournamentState.tournamentCode || 'PRO-8899';
    this.tournamentState = this.createInitialTournamentState(currentCode);
    this.broadcastTournamentState();
    return { success: true, tournamentCode: currentCode };
  }

  /**
   * Mô phỏng 1 nước đi ngẫu nhiên hợp lệ cho bàn `tableId` (Hỗ trợ demo khi chỉ có 1 người test)
   */
  simulateStep(tableId) {
    const engine = this.engines[tableId];
    const table = this.tournamentState.tables[tableId];
    if (!engine || !table || table.status !== GAME_STATUS.PLAYING) return false;

    const legalMoves = engine.getAllLegalMoves(engine.currentPlayer);
    if (legalMoves.length === 0) return false;

    // Ưu tiên nước ăn quân nếu có
    const captureMove = legalMoves.find(m => engine.board[m.to]);
    const chosen = captureMove || legalMoves[Math.floor(Math.random() * legalMoves.length)];

    const moveRes = engine.makeMove(engine.currentPlayer, chosen.from, chosen.to);
    if (moveRes.success) {
      table.gameState = engine.getState();
      table.lastMove = moveRes.move;
      if (moveRes.gameOver) {
        table.status = GAME_STATUS.FINISHED;
        table.result = moveRes.result;
      }
      this.broadcastTournamentState();
      return true;
    }
    return false;
  }

  /**
   * Bật/Tắt mô phỏng tự động cho các bàn đấu khác
   */
  toggleAutoSimulation(active) {
    if (this.autoSimInterval) {
      clearInterval(this.autoSimInterval);
      this.autoSimInterval = null;
    }

    if (active) {
      this.autoSimInterval = setInterval(() => {
        if (this.tournamentState.allFinished) {
          clearInterval(this.autoSimInterval);
          this.autoSimInterval = null;
          return;
        }

        // Chọn 1 bàn ngẫu nhiên đang PLAYING để đi 1 nước
        const activeTables = Object.values(this.tournamentState.tables).filter(t => t.status === GAME_STATUS.PLAYING);
        if (activeTables.length > 0) {
          const tableToMove = activeTables[Math.floor(Math.random() * activeTables.length)];
          this.simulateStep(tableToMove.id);
        }
      }, 1800);
    }
  }

  getStatusSummary() {
    const tables = Object.values(this.tournamentState.tables);
    const finishedCount = tables.filter(t => t.status === GAME_STATUS.FINISHED).length;
    return {
      finishedCount,
      totalCount: tables.length,
      allFinished: finishedCount === tables.length,
      round: this.tournamentState.round
    };
  }
}
