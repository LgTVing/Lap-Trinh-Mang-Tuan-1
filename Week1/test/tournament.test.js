import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TournamentManager, TOURNAMENT_TABLES_CONFIG } from '../js/tournamentManager.js';
import { PLAYERS, GAME_STATUS } from '../js/constants.js';

test('T1. Giải đấu khởi tạo đúng 4 bàn cho 8 Pro Player', () => {
  const manager = new TournamentManager({});
  assert.equal(Object.keys(manager.tournamentState.tables).length, 4);
  assert.equal(manager.tournamentState.tables[1].p1.username, 'pro_faker');
  assert.equal(manager.tournamentState.tables[1].p2.username, 'pro_magnus');
  assert.equal(manager.tournamentState.tables[2].p1.username, 'pro_hikaru');
  assert.equal(manager.tournamentState.tables[2].p2.username, 'pro_viper');
  assert.equal(manager.tournamentState.tables[3].p1.username, 'pro_s1mple');
  assert.equal(manager.tournamentState.tables[3].p2.username, 'pro_flash');
  assert.equal(manager.tournamentState.tables[4].p1.username, 'pro_chovy');
  assert.equal(manager.tournamentState.tables[4].p2.username, 'pro_dendi');
});

test('T2. Phân quyền tuyển thủ: Chỉ pro player đúng bàn mới được phân công', () => {
  const manager = new TournamentManager({});

  // Pro player đúng bàn
  const fakerAss = manager.getPlayerAssignment('pro_faker');
  assert.equal(fakerAss.tableId, 1);
  assert.equal(fakerAss.role, PLAYERS.P1);

  const magnusAss = manager.getPlayerAssignment('pro_magnus');
  assert.equal(magnusAss.tableId, 1);
  assert.equal(magnusAss.role, PLAYERS.P2);

  const hikaruAss = manager.getPlayerAssignment('pro_hikaru');
  assert.equal(hikaruAss.tableId, 2);
  assert.equal(hikaruAss.role, PLAYERS.P1);

  // Khán giả (Guest hoặc Player thường) không có bàn thi đấu
  assert.equal(manager.getPlayerAssignment('player_nam'), null);
  assert.equal(manager.getPlayerAssignment('guest'), null);
  assert.equal(manager.getPlayerAssignment('admin'), null);
});

test('T3. Khán giả và Player thường chỉ được xem, không được di chuyển quân ở bất kỳ bàn nào', () => {
  const manager = new TournamentManager({});

  const checkGuest = manager.canMakeMove('guest', 1);
  assert.equal(checkGuest.allowed, false);
  assert.match(checkGuest.reason, /Khán giả/);

  const checkPlayer = manager.canMakeMove('player_nam', 1);
  assert.equal(checkPlayer.allowed, false);
  assert.match(checkPlayer.reason, /Khán giả/);
});

test('T4. Pro player chỉ được đi tại bàn của mình, không được can thiệp bàn khác', () => {
  const manager = new TournamentManager({});

  // Faker đi tại Bàn 2 (Hikaru vs TheViper) => Bị từ chối
  const checkWrongTable = manager.canMakeMove('pro_faker', 2);
  assert.equal(checkWrongTable.allowed, false);
  assert.match(checkWrongTable.reason, /Bàn 1/);

  // Faker đi tại Bàn 1 lượt đầu (P1) => Được phép
  const checkRightTable = manager.canMakeMove('pro_faker', 1);
  assert.equal(checkRightTable.allowed, true);
  assert.equal(checkRightTable.role, PLAYERS.P1);

  // Magnus ở Bàn 1 nhưng là P2 (chưa tới lượt) => Bị từ chối
  const checkWrongTurn = manager.canMakeMove('pro_magnus', 1);
  assert.equal(checkWrongTurn.allowed, false);
  assert.match(checkWrongTurn.reason, /Chưa tới lượt/);
});

test('T5. Thực hiện nước đi và cập nhật trạng thái bàn đấu độc lập', () => {
  const manager = new TournamentManager({});

  // Faker đi a3 -> a4 tại Bàn 1
  const moveRes = manager.makeMove('pro_faker', 1, 'a3', 'a4');
  assert.equal(moveRes.success, true);
  assert.equal(manager.tournamentState.tables[1].gameState.currentPlayer, PLAYERS.P2);

  // Các bàn khác (2, 3, 4) vẫn giữ nguyên trạng thái ban đầu
  assert.equal(manager.tournamentState.tables[2].gameState.currentPlayer, PLAYERS.P1);
  assert.equal(manager.tournamentState.tables[3].gameState.currentPlayer, PLAYERS.P1);
  assert.equal(manager.tournamentState.tables[4].gameState.currentPlayer, PLAYERS.P1);
});

test('T6. Khóa ván đấu khi cả 4 bàn hoàn thành và chỉ Admin mới có quyền restart', () => {
  const manager = new TournamentManager({});

  // Kết thúc cả 4 bàn bằng đầu hàng hoặc hòa
  manager.resign('pro_faker', 1);
  manager.resign('pro_hikaru', 2);
  manager.resign('pro_s1mple', 3);
  manager.resign('pro_chovy', 4);

  const summary = manager.getStatusSummary();
  assert.equal(summary.finishedCount, 4);
  assert.equal(summary.allFinished, true);

  // Tuyển thủ không được đi tiếp khi cả 4 bàn đã kết thúc
  const moveAfterFinish = manager.canMakeMove('pro_magnus', 1);
  assert.equal(moveAfterFinish.allowed, false);

  // Người dùng thường không thể restart
  const restartNonAdmin = manager.restartTournament(false);
  assert.equal(restartNonAdmin.success, false);

  // Admin restart thành công, cả 4 bàn trở lại PLAYING
  const restartAdmin = manager.restartTournament(true);
  assert.equal(restartAdmin.success, true);
  assert.equal(manager.tournamentState.allFinished, false);
  assert.equal(manager.tournamentState.tables[1].status, GAME_STATUS.PLAYING);
  assert.equal(manager.tournamentState.tables[4].status, GAME_STATUS.PLAYING);
});

test('T7. Admin tạo giải đấu sinh mã ngẫu nhiên và kiểm tra quyền Tuyển thủ / Viewer', () => {
  const manager = new TournamentManager({});

  // Người dùng thường không thể tạo giải
  const createByNonAdmin = manager.createTournament(false);
  assert.equal(createByNonAdmin.success, false);

  // Admin tạo giải đấu mới
  const createByAdmin = manager.createTournament(true);
  assert.equal(createByAdmin.success, true);
  assert.match(createByAdmin.tournamentCode, /^PRO-[A-Z0-9]{4}$/);
  assert.equal(manager.tournamentState.tournamentCode, createByAdmin.tournamentCode);

  // Kiểm tra mã giải đấu hợp lệ
  const validCheck = manager.validateTournamentCode(createByAdmin.tournamentCode);
  assert.equal(validCheck.valid, true);

  // Kiểm tra mã giải đấu sai
  const invalidCheck = manager.validateTournamentCode('WRONG-CODE');
  assert.equal(invalidCheck.valid, false);

  // Pro player được phép đánh tại bàn của mình
  const fakerMoveCheck = manager.canMakeMove('pro_faker', 1);
  assert.equal(fakerMoveCheck.allowed, true);

  // Viewer / Khán giả không được phép đánh
  const viewerMoveCheck = manager.canMakeMove('guest', 1);
  assert.equal(viewerMoveCheck.allowed, false);
  assert.match(viewerMoveCheck.reason, /Khán giả|Viewer/i);
});
