/**
 * OTTv2 Main Application Controller
 * Quản lý Sảnh (Lobby), Phòng chờ (Waiting Room), Trận đấu (Game Arena) và đồng bộ qua playhtml.fun.
 */

import { GameEngine } from './GameEngine.js';
import { GameBoardRenderer } from './GameBoardRenderer.js';
import { MultiplayerManager } from './multiplayer.js';
import { GameTimer } from './timer.js';
import { SettingsManager } from './settingsManager.js';
import { sound } from './audio.js';
import { PLAYERS, GAME_STATUS, PIECE_TYPES } from './constants.js';

class OTTApp {
  constructor() {
    this.engine = new GameEngine();
    this.multiplayer = null;
    this.timer = null;
    this.renderer = null;

    // Chế độ chơi: 'ONLINE' hoặc 'LOCAL'
    this.mode = 'LOCAL';
    this.myPlayerRole = PLAYERS.P1; // 'P1' hoặc 'P2'
    this.isReady = false;

    // DOM Elements
    this.dom = {};
  }

  init() {
    this.cacheDOMElements();
    this.initTimer();
    this.initRenderer();
    this.initMultiplayer();
    this.bindEvents();
    this.loadInitialSettings();
  }

  cacheDOMElements() {
    this.dom = {
      // Screens
      lobbyScreen: document.getElementById('lobby-screen'),
      waitingScreen: document.getElementById('waiting-screen'),
      gameScreen: document.getElementById('game-screen'),

      // Lobby Controls
      presetPills: document.querySelectorAll('.preset-pill'),
      timeSelect: document.getElementById('time-control-select'),
      moveTimeSelect: document.getElementById('move-time-select'),
      threefoldCheck: document.getElementById('threefold-check'),
      fiftyMoveCheck: document.getElementById('fifty-move-check'),
      btnCreateRoom: document.getElementById('btn-create-room'),
      joinRoomInput: document.getElementById('join-room-input'),
      btnJoinRoom: document.getElementById('btn-join-room'),
      btnLocalPlay: document.getElementById('btn-local-play'),

      // Waiting Room Elements
      waitingRoomCodeBox: document.getElementById('waiting-room-code-box'),
      waitingRoomCode: document.getElementById('waiting-room-code'),
      waitingCountdownBox: document.getElementById('waiting-countdown-box'),
      slotP1: document.getElementById('slot-p1'),
      slotP2: document.getElementById('slot-p2'),
      p1StatusPill: document.getElementById('p1-status-pill'),
      p2StatusPill: document.getElementById('p2-status-pill'),
      p1ReadyBadge: document.getElementById('p1-ready-badge'),
      p2ReadyBadge: document.getElementById('p2-ready-badge'),
      btnP1Ready: document.getElementById('btn-p1-ready'),
      btnP2Ready: document.getElementById('btn-p2-ready'),
      btnCancelWaiting: document.getElementById('btn-cancel-waiting'),

      // Game Screen Elements
      boardContainer: document.getElementById('board-container'),
      roomCodeDisplay: document.getElementById('room-code-display'),
      connectionStatus: document.getElementById('connection-status'),
      turnBanner: document.getElementById('turn-banner'),
      turnDot: document.getElementById('turn-dot'),
      turnText: document.getElementById('turn-text'),

      // Clocks
      p1Clock: document.getElementById('p1-clock'),
      p2Clock: document.getElementById('p2-clock'),
      p1Card: document.getElementById('p1-card'),
      p2Card: document.getElementById('p2-card'),

      // Counters
      p1RockCount: document.getElementById('p1-rock-count'),
      p1PaperCount: document.getElementById('p1-paper-count'),
      p1ScissorsCount: document.getElementById('p1-scissors-count'),
      p2RockCount: document.getElementById('p2-rock-count'),
      p2PaperCount: document.getElementById('p2-paper-count'),
      p2ScissorsCount: document.getElementById('p2-scissors-count'),

      // History & Actions
      historyList: document.getElementById('history-list'),
      btnResign: document.getElementById('btn-resign'),
      btnRematch: document.getElementById('btn-rematch'),
      btnExitLobby: document.getElementById('btn-exit-lobby'),
      btnToggleSound: document.getElementById('btn-toggle-sound'),
      btnHelp: document.getElementById('btn-help'),

      // Modals
      resultModal: document.getElementById('result-modal'),
      resultTrophy: document.getElementById('result-trophy'),
      resultTitle: document.getElementById('result-title'),
      resultDesc: document.getElementById('result-desc'),
      btnModalRematch: document.getElementById('btn-modal-rematch'),
      btnModalExit: document.getElementById('btn-modal-exit'),

      rulesModal: document.getElementById('rules-modal'),
      btnCloseRules: document.getElementById('btn-close-rules'),

      // Toast
      toast: document.getElementById('toast')
    };
  }

  initTimer() {
    this.timer = new GameTimer({
      onTick: ({ timers, currentPlayer }) => {
        this.dom.p1Clock.textContent = GameTimer.formatTime(timers[PLAYERS.P1]);
        this.dom.p2Clock.textContent = GameTimer.formatTime(timers[PLAYERS.P2]);
      },
      onTimeout: (timedOutPlayer, type) => {
        const result = this.engine.handleTimeout(timedOutPlayer);
        this.showGameOverModal(result);
        if (this.mode === 'ONLINE' && this.multiplayer) {
          this.multiplayer.sendMove(this.engine.getState(), null);
        }
      }
    });
  }

  initRenderer() {
    this.renderer = new GameBoardRenderer(this.dom.boardContainer, {
      onSquareClick: (pos) => this.handleSquareClick(pos)
    });
  }

  initMultiplayer() {
    this.multiplayer = new MultiplayerManager({
      // Lắng nghe cập nhật phòng chờ
      onRoomUpdate: (roomData) => {
        this.handleRoomUpdate(roomData);
      },
      // Lắng nghe cập nhật nước đi trận đấu
      onGameUpdate: (newGameState, lastMove) => {
        if (!newGameState) return;
        this.engine.loadState(newGameState);

        if (lastMove) {
          this.renderer.setLastMove(lastMove);
          if (lastMove.capturedPiece) {
            sound.playCapture();
          } else {
            sound.playMove();
          }
        }

        this.updateGameUI();

        // Kiểm tra kết thúc trận
        if (this.engine.status === GAME_STATUS.FINISHED && this.engine.result) {
          this.timer.stop();
          this.showGameOverModal(this.engine.result);
        } else if (this.engine.status === GAME_STATUS.PLAYING) {
          this.timer.setTimers(this.engine.timers, this.engine.settings.moveTime);
          this.timer.start(this.engine.currentPlayer);
        }
      },
      onError: (msg) => {
        this.showToast(msg);
      }
    });
  }

  loadInitialSettings() {
    const settings = SettingsManager.getSettings();
    if (this.dom.timeSelect) this.dom.timeSelect.value = settings.playerTime;
    if (this.dom.moveTimeSelect) this.dom.moveTimeSelect.value = settings.moveTime || '';
    if (this.dom.threefoldCheck) this.dom.threefoldCheck.checked = settings.enableThreefoldRepetition;
    if (this.dom.fiftyMoveCheck) this.dom.fiftyMoveCheck.checked = settings.enableFiftyMoveRule;
  }

  bindEvents() {
    // Preset selection
    this.dom.presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.dom.presetPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const presetKey = pill.dataset.preset;
        const presets = SettingsManager.getPresets();
        const p = presets[presetKey];
        if (p) {
          this.dom.timeSelect.value = p.playerTime;
          this.dom.moveTimeSelect.value = p.moveTime || '';
          this.dom.threefoldCheck.checked = p.enableThreefoldRepetition;
          this.dom.fiftyMoveCheck.checked = p.enableFiftyMoveRule;
        }
      });
    });

    // Tạo phòng Online -> Vào phòng chờ
    this.dom.btnCreateRoom.addEventListener('click', () => this.handleCreateRoom());

    // Tham gia phòng Online -> Vào phòng chờ
    this.dom.btnJoinRoom.addEventListener('click', () => this.handleJoinRoom());

    // Nút Sẵn sàng ở phòng chờ
    this.dom.btnP1Ready.addEventListener('click', () => {
      if (this.myPlayerRole === 'P1') {
        this.toggleReady();
      }
    });

    this.dom.btnP2Ready.addEventListener('click', () => {
      if (this.myPlayerRole === 'P2') {
        this.toggleReady();
      }
    });

    // Hủy / Rời phòng chờ
    this.dom.btnCancelWaiting.addEventListener('click', () => this.exitToLobby());

    // Chơi 2 người trên cùng máy (Offline)
    this.dom.btnLocalPlay.addEventListener('click', () => this.startLocalGame());

    // Sao chép mã phòng
    const copyCode = (code) => {
      if (code) {
        navigator.clipboard.writeText(code);
        this.showToast(`Đã sao chép mã phòng: ${code}`);
      }
    };
    this.dom.waitingRoomCodeBox.addEventListener('click', () => {
      copyCode(this.dom.waitingRoomCode.textContent);
    });
    this.dom.roomCodeDisplay.addEventListener('click', () => {
      copyCode(this.dom.roomCodeDisplay.dataset.code);
    });

    // Đầu hàng (Resign)
    this.dom.btnResign.addEventListener('click', () => {
      if (this.engine.status !== GAME_STATUS.PLAYING) return;
      if (confirm('Bạn có chắc chắn muốn đầu hàng không?')) {
        const playerToResign = (this.mode === 'ONLINE') ? this.myPlayerRole : this.engine.currentPlayer;
        const result = this.engine.resign(playerToResign);
        this.timer.stop();
        this.showGameOverModal(result);
        if (this.mode === 'ONLINE' && this.multiplayer) {
          this.multiplayer.sendResign(this.engine.getState());
        }
      }
    });

    // Chơi lại (Rematch)
    this.dom.btnRematch.addEventListener('click', () => this.restartGame());
    this.dom.btnModalRematch.addEventListener('click', () => {
      this.closeModal(this.dom.resultModal);
      this.restartGame();
    });

    // Thoát về sảnh
    this.dom.btnExitLobby.addEventListener('click', () => this.exitToLobby());
    this.dom.btnModalExit.addEventListener('click', () => {
      this.closeModal(this.dom.resultModal);
      this.exitToLobby();
    });

    // Bật/tắt âm thanh
    this.dom.btnToggleSound.addEventListener('click', () => {
      sound.muted = !sound.muted;
      this.dom.btnToggleSound.textContent = sound.muted ? '🔇' : '🔊';
      this.showToast(sound.muted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
    });

    // Luật chơi
    this.dom.btnHelp.addEventListener('click', () => this.openModal(this.dom.rulesModal));
    this.dom.btnCloseRules.addEventListener('click', () => this.closeModal(this.dom.rulesModal));
  }

  getCurrentSettingsFromUI() {
    const playerTime = parseInt(this.dom.timeSelect.value, 10) || 600;
    const moveTimeVal = this.dom.moveTimeSelect.value;
    const moveTime = moveTimeVal ? parseInt(moveTimeVal, 10) : null;
    const enableThreefold = this.dom.threefoldCheck.checked;
    const enableFifty = this.dom.fiftyMoveCheck.checked;

    const current = {
      playerTime,
      moveTime,
      enableThreefoldRepetition: enableThreefold,
      enableFiftyMoveRule: enableFifty
    };

    SettingsManager.saveSettings(current);
    return current;
  }

  /**
   * Tạo phòng Online: Ngồi vào phòng chờ và chờ Người chơi 2
   */
  async handleCreateRoom() {
    const settings = this.getCurrentSettingsFromUI();
    const roomCode = MultiplayerManager.generateRoomCode();

    this.mode = 'ONLINE';
    this.myPlayerRole = PLAYERS.P1;
    this.isReady = false;

    this.engine = new GameEngine(settings);
    this.renderer.setView(PLAYERS.P1);

    // Chuyển sang màn hình phòng chờ
    this.switchScreen('WAITING');
    this.dom.waitingRoomCode.textContent = roomCode;
    this.updateWaitingRoomUI({
      roomCode,
      p1: { ready: false, present: true },
      p2: { ready: false, present: false }
    });

    const ok = await this.multiplayer.createRoom(roomCode, settings);
    if (ok) {
      this.showToast(`Phòng ${roomCode} đã tạo! Đang chờ Người chơi 2...`);
    } else {
      this.showToast('Không thể kết nối phòng mạng!');
    }
  }

  /**
   * Tham gia phòng Online: Ngồi vào phòng chờ cùng Người chơi 1
   */
  async handleJoinRoom() {
    const code = this.dom.joinRoomInput.value.trim().toUpperCase();
    if (!code || code.length < 4) {
      this.showToast('Vui lòng nhập mã phòng hợp lệ!');
      return;
    }

    this.mode = 'ONLINE';
    this.myPlayerRole = PLAYERS.P2;
    this.isReady = false;

    this.engine = new GameEngine();
    this.renderer.setView(PLAYERS.P2);

    this.switchScreen('WAITING');
    this.dom.waitingRoomCode.textContent = code;
    this.updateWaitingRoomUI({
      roomCode: code,
      p1: { ready: false, present: true },
      p2: { ready: false, present: true }
    });

    const ok = await this.multiplayer.joinRoom(code);
    if (ok) {
      this.showToast(`Đã tham gia phòng ${code}! Hãy nhấn Sẵn sàng.`);
    } else {
      this.showToast('Không thể kết nối vào phòng!');
    }
  }

  /**
   * Toggle trạng thái Sẵn sàng của người chơi hiện tại
   */
  toggleReady() {
    this.isReady = !this.isReady;
    sound.playMove();
    this.multiplayer.setReady(this.isReady);
  }

  /**
   * Cập nhật giao diện phòng chờ khi có sự kiện từ mạng
   */
  handleRoomUpdate(roomData) {
    if (!roomData) return;

    this.updateWaitingRoomUI(roomData);

    // Khi cả 2 người chơi cùng sẵn sàng
    if (roomData.p1?.ready && roomData.p2?.ready) {
      // Nếu là Host (P1) và game chưa bắt đầu, phát lệnh khởi động
      if (this.multiplayer.isHost && roomData.phase === 'WAITING') {
        this.engine = new GameEngine(roomData.settings || this.engine.settings);
        this.engine.initGame();
        this.multiplayer.startGame(this.engine.getState());
      }

      // Đếm ngược 3 giây vào trận
      this.startCountdownAndLaunchGame(roomData);
    }
  }

  updateWaitingRoomUI(roomData) {
    const p1 = roomData.p1 || {};
    const p2 = roomData.p2 || {};

    // Cập nhật P1
    if (p1.present) {
      this.dom.p1StatusPill.className = 'slot-status-pill status-present';
      this.dom.p1StatusPill.textContent = '🟢 Đã trong phòng';
    } else {
      this.dom.p1StatusPill.className = 'slot-status-pill status-waiting';
      this.dom.p1StatusPill.textContent = '⏳ Đang chờ...';
    }

    if (p1.ready) {
      this.dom.p1ReadyBadge.className = 'slot-ready-status ready';
      this.dom.p1ReadyBadge.textContent = '✅ ĐÃ SẴN SÀNG';
      this.dom.slotP1.classList.add('is-ready');
    } else {
      this.dom.p1ReadyBadge.className = 'slot-ready-status not-ready';
      this.dom.p1ReadyBadge.textContent = 'Chưa sẵn sàng';
      this.dom.slotP1.classList.remove('is-ready');
    }

    // Cập nhật P2
    if (p2.present) {
      this.dom.p2StatusPill.className = 'slot-status-pill status-present';
      this.dom.p2StatusPill.textContent = '🟢 Đã tham gia phòng';
      this.dom.btnP2Ready.disabled = (this.myPlayerRole !== 'P2');
    } else {
      this.dom.p2StatusPill.className = 'slot-status-pill status-waiting';
      this.dom.p2StatusPill.textContent = '⏳ Đang chờ đối thủ...';
      this.dom.btnP2Ready.disabled = true;
    }

    if (p2.ready) {
      this.dom.p2ReadyBadge.className = 'slot-ready-status ready';
      this.dom.p2ReadyBadge.textContent = '✅ ĐÃ SẴN SÀNG';
      this.dom.slotP2.classList.add('is-ready');
    } else {
      this.dom.p2ReadyBadge.className = 'slot-ready-status not-ready';
      this.dom.p2ReadyBadge.textContent = 'Chưa sẵn sàng';
      this.dom.slotP2.classList.remove('is-ready');
    }

    // Cập nhật text nút bấm của bản thân
    if (this.myPlayerRole === 'P1') {
      this.dom.btnP1Ready.disabled = false;
      this.dom.btnP1Ready.textContent = p1.ready ? '❌ Hủy Sẵn sàng' : '✅ Tôi đã Sẵn sàng';
      this.dom.btnP2Ready.disabled = true;
    } else if (this.myPlayerRole === 'P2') {
      this.dom.btnP1Ready.disabled = true;
      this.dom.btnP2Ready.disabled = !p2.present;
      this.dom.btnP2Ready.textContent = p2.ready ? '❌ Hủy Sẵn sàng' : '✅ Tôi đã Sẵn sàng';
    }
  }

  startCountdownAndLaunchGame(roomData) {
    if (this.dom.waitingCountdownBox.style.display !== 'none') return; // Tránh chạy 2 lần
    this.dom.waitingCountdownBox.style.display = 'block';

    let count = 3;
    this.dom.waitingCountdownBox.textContent = `🚀 Cả hai đã sẵn sàng! Bắt đầu sau ${count}...`;
    sound.playMove();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.waitingCountdownBox.textContent = `🚀 Cả hai đã sẵn sàng! Bắt đầu sau ${count}...`;
        sound.playMove();
      } else {
        clearInterval(interval);
        this.dom.waitingCountdownBox.style.display = 'none';

        // Vào trận đấu đồng bộ
        if (roomData.gameState) {
          this.engine.loadState(roomData.gameState);
        } else {
          this.engine.initGame();
        }

        this.dom.roomCodeDisplay.textContent = `Phòng: ${roomData.roomCode || this.dom.waitingRoomCode.textContent} 📋`;
        this.dom.roomCodeDisplay.dataset.code = roomData.roomCode || this.dom.waitingRoomCode.textContent;
        this.dom.connectionStatus.textContent = `🟢 Trực tuyến (${this.myPlayerRole === 'P1' ? 'P1 - Xanh' : 'P2 - Đỏ'})`;

        this.switchScreen('GAME');
        this.timer.setTimers(this.engine.timers, this.engine.settings.moveTime);
        this.timer.start(PLAYERS.P1);
        this.updateGameUI();
      }
    }, 1000);
  }

  startLocalGame() {
    const settings = this.getCurrentSettingsFromUI();
    this.mode = 'LOCAL';
    this.myPlayerRole = PLAYERS.P1;
    this.engine = new GameEngine(settings);
    this.engine.initGame();

    this.renderer.setView(PLAYERS.P1);
    this.switchScreen('GAME');

    this.dom.roomCodeDisplay.textContent = 'Chơi 2 người trên cùng máy';
    this.dom.roomCodeDisplay.dataset.code = '';
    this.dom.connectionStatus.textContent = '💻 Cục bộ (Offline)';

    this.timer.setTimers(this.engine.timers, settings.moveTime);
    this.timer.start(PLAYERS.P1);

    this.showToast('Bắt đầu ván đấu! Lượt đầu tiên: Người chơi 1');
    this.updateGameUI();
  }

  restartGame() {
    const currentSettings = this.engine.settings;
    this.engine = new GameEngine(currentSettings);
    this.engine.initGame();
    this.renderer.clearSelection();
    this.renderer.setLastMove(null);

    this.timer.setTimers(this.engine.timers, currentSettings.moveTime);
    this.timer.start(PLAYERS.P1);

    if (this.mode === 'ONLINE' && this.multiplayer) {
      this.multiplayer.sendRematch(this.engine.getState());
    }

    this.updateGameUI();
    this.showToast('Ván mới đã bắt đầu!');
  }

  exitToLobby() {
    this.timer.stop();
    if (this.multiplayer) {
      this.multiplayer.disconnect();
    }
    this.switchScreen('LOBBY');
  }

  switchScreen(screenName) {
    this.dom.lobbyScreen.style.display = (screenName === 'LOBBY') ? 'grid' : 'none';
    this.dom.waitingScreen.style.display = (screenName === 'WAITING') ? 'flex' : 'none';
    this.dom.gameScreen.style.display = (screenName === 'GAME') ? 'grid' : 'none';
  }

  handleSquareClick(pos) {
    if (this.engine.status !== GAME_STATUS.PLAYING) return;

    // Kiểm tra lượt chơi nếu đang ở chế độ Online
    if (this.mode === 'ONLINE' && this.engine.currentPlayer !== this.myPlayerRole) {
      sound.playInvalid();
      this.showToast('Chưa tới lượt của bạn!');
      return;
    }

    const clickedPiece = this.engine.board[pos];
    const isCurrentPlayerPiece = clickedPiece && clickedPiece.player === this.engine.currentPlayer;

    // Nếu đang có quân được chọn và click vào ô đích hợp lệ
    if (this.renderer.selectedPos && this.renderer.legalMoves.includes(pos)) {
      const from = this.renderer.selectedPos;
      const to = pos;
      const targetPiece = this.engine.board[to];

      // Thực hiện nước đi trên GameEngine
      const moveRes = this.engine.makeMove(this.engine.currentPlayer, from, to);

      if (moveRes.success) {
        if (targetPiece) {
          sound.playCapture();
        } else {
          sound.playMove();
        }

        this.renderer.clearSelection();
        this.renderer.setLastMove(moveRes.move);

        // Chuyển đồng hồ sang người tiếp theo
        this.timer.switchPlayer(this.engine.currentPlayer);

        // Đồng bộ lên mạng
        if (this.mode === 'ONLINE' && this.multiplayer) {
          this.multiplayer.sendMove(this.engine.getState(), moveRes.move);
        }

        this.updateGameUI();

        // Kiểm tra kết thúc ván đấu
        if (moveRes.gameOver) {
          this.timer.stop();
          this.showGameOverModal(moveRes.result);
        }
      } else {
        sound.playInvalid();
        this.showToast(moveRes.error || 'Nước đi không hợp lệ!');
      }
      return;
    }

    // Chọn một quân cờ của mình
    if (isCurrentPlayerPiece) {
      const legalMoves = this.engine.getLegalMoves(pos);
      this.renderer.setSelected(pos, legalMoves);
      sound.playMove();
      this.renderBoard();
      return;
    }

    // Click vào chỗ trống hoặc quân không đi được: Hủy chọn
    this.renderer.clearSelection();
    this.renderBoard();
  }

  updateGameUI() {
    this.renderBoard();
    this.updateCounters();
    this.updateTurnBanner();
    this.updateHistoryList();
  }

  renderBoard() {
    const isMyTurn = (this.mode === 'LOCAL') 
      ? true 
      : (this.engine.currentPlayer === this.myPlayerRole);

    this.renderer.render(
      this.engine.board,
      (this.mode === 'LOCAL') ? this.engine.currentPlayer : this.myPlayerRole,
      isMyTurn
    );
  }

  updateCounters() {
    const p1Rem = this.engine.remainingPieces[PLAYERS.P1];
    const p2Rem = this.engine.remainingPieces[PLAYERS.P2];

    this.dom.p1RockCount.textContent = p1Rem[PIECE_TYPES.ROCK] || 0;
    this.dom.p1PaperCount.textContent = p1Rem[PIECE_TYPES.PAPER] || 0;
    this.dom.p1ScissorsCount.textContent = p1Rem[PIECE_TYPES.SCISSORS] || 0;

    this.dom.p2RockCount.textContent = p2Rem[PIECE_TYPES.ROCK] || 0;
    this.dom.p2PaperCount.textContent = p2Rem[PIECE_TYPES.PAPER] || 0;
    this.dom.p2ScissorsCount.textContent = p2Rem[PIECE_TYPES.SCISSORS] || 0;
  }

  updateTurnBanner() {
    const isP1 = (this.engine.currentPlayer === PLAYERS.P1);
    this.dom.turnDot.className = `turn-dot ${isP1 ? 'p1' : 'p2'}`;
    this.dom.turnText.textContent = isP1 ? 'Lượt: Người chơi 1 (Xanh)' : 'Lượt: Người chơi 2 (Đỏ)';

    this.dom.p1Card.classList.toggle('active-turn', isP1);
    this.dom.p2Card.classList.toggle('active-turn', !isP1);
  }

  updateHistoryList() {
    this.dom.historyList.innerHTML = '';
    this.engine.history.forEach((h) => {
      const item = document.createElement('div');
      item.className = `history-item ${h.playerId === PLAYERS.P1 ? 'p1-move' : 'p2-move'}`;

      const icon = GameBoardRenderer.getPieceIcon(h.pieceType);
      const capText = h.capturedPiece ? ` x ${GameBoardRenderer.getPieceIcon(h.capturedPiece.type)}` : '';

      item.innerHTML = `
        <span class="history-step">#${h.moveNumber} [${h.playerId}]</span>
        <span class="history-notation">${icon} ${h.from} → ${h.to}${capText}</span>
      `;
      this.dom.historyList.appendChild(item);
    });
    this.dom.historyList.scrollTop = this.dom.historyList.scrollHeight;
  }

  showGameOverModal(result) {
    if (!result) return;
    sound.playWin();

    if (result.winner) {
      const isWinner = (this.mode === 'LOCAL') 
        ? true 
        : (result.winner === this.myPlayerRole);

      this.dom.resultTrophy.textContent = isWinner ? '🏆' : '💀';
      this.dom.resultTitle.textContent = `${result.winner} CHIẾN THẮNG!`;
      this.dom.resultTitle.style.color = (result.winner === PLAYERS.P1) ? '#38bdf8' : '#fb7185';
    } else {
      this.dom.resultTrophy.textContent = '🤝';
      this.dom.resultTitle.textContent = 'HÒA CỜ!';
      this.dom.resultTitle.style.color = '#f59e0b';
    }

    this.dom.resultDesc.textContent = result.details || result.reason;
    this.openModal(this.dom.resultModal);
  }

  openModal(modalEl) {
    if (modalEl) modalEl.classList.add('open');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('open');
  }

  showToast(message) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('show');
    setTimeout(() => {
      this.dom.toast.classList.remove('show');
    }, 3000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new OTTApp();
  app.init();
});
