/**
 * OTTv2 Main Application Controller
 * Quản lý Sảnh (Lobby), Xác thực / Chế độ Khách (Auth), Phòng chờ (Waiting Room), 
 * Trận đấu (Game Arena), Đồng bộ qua playhtml.fun và Đấu trường Pro Tournament.
 */

import { GameEngine } from './GameEngine.js';
import { GameBoardRenderer } from './GameBoardRenderer.js';
import { MultiplayerManager } from './multiplayer.js';
import { GameTimer } from './timer.js';
import { SettingsManager } from './settingsManager.js';
import { sound } from './audio.js';
import { PLAYERS, GAME_STATUS, PIECE_TYPES } from './constants.js';
import { auth, USER_ROLES } from './authManager.js';

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

  async init() {
    this.cacheDOMElements();
    await auth.init();
    this.updateUserAuthUI();
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

      // Header Auth & Actions
      userProfileBadge: document.getElementById('user-profile-badge'),
      userRoleIcon: document.getElementById('user-role-icon'),
      userDisplayName: document.getElementById('user-display-name'),
      userRolePill: document.getElementById('user-role-pill'),
      btnOpenLogin: document.getElementById('btn-open-login'),
      btnLogout: document.getElementById('btn-logout'),
      btnToggleSound: document.getElementById('btn-toggle-sound'),
      btnHelp: document.getElementById('btn-help'),

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
      btnProTournament: document.getElementById('btn-pro-tournament'),

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
      btnOfferDraw: document.getElementById('btn-offer-draw'),
      btnResign: document.getElementById('btn-resign'),
      btnRematch: document.getElementById('btn-rematch'),
      btnExitLobby: document.getElementById('btn-exit-lobby'),

      // Modals
      resultModal: document.getElementById('result-modal'),
      resultTrophy: document.getElementById('result-trophy'),
      resultTitle: document.getElementById('result-title'),
      resultDesc: document.getElementById('result-desc'),
      btnModalRematch: document.getElementById('btn-modal-rematch'),
      btnModalExit: document.getElementById('btn-modal-exit'),

      rulesModal: document.getElementById('rules-modal'),
      btnCloseRules: document.getElementById('btn-close-rules'),

      // Auth Modal
      loginModal: document.getElementById('login-modal'),
      loginForm: document.getElementById('login-form'),
      loginUsername: document.getElementById('login-username'),
      loginPassword: document.getElementById('login-password'),
      btnPlayAsGuest: document.getElementById('btn-play-as-guest'),
      btnCloseLogin: document.getElementById('btn-close-login'),
      quickAccBtns: document.querySelectorAll('.quick-acc-btn'),

      // Draw Offer Modal
      drawOfferModal: document.getElementById('draw-offer-modal'),
      drawOfferDesc: document.getElementById('draw-offer-desc'),
      btnAcceptDraw: document.getElementById('btn-accept-draw'),
      btnDeclineDraw: document.getElementById('btn-decline-draw'),

      // Pro Tournament Modal
      tournamentModal: document.getElementById('tournament-modal'),
      tournamentModalBody: document.getElementById('tournament-modal-body'),
      btnCloseTournament: document.getElementById('btn-close-tournament'),

      // Toast
      toast: document.getElementById('toast')
    };
  }

  updateUserAuthUI() {
    const user = auth.getCurrentUser();
    if (this.dom.userDisplayName) {
      this.dom.userDisplayName.textContent = user.displayName;
    }

    if (this.dom.userRolePill) {
      if (user.role === USER_ROLES.PRO_PLAYER) {
        this.dom.userRoleIcon.textContent = '👑';
        this.dom.userRolePill.className = 'role-pill role-pro';
        this.dom.userRolePill.textContent = `PRO (${user.rating})`;
      } else if (user.role === USER_ROLES.PLAYER) {
        this.dom.userRoleIcon.textContent = '🎮';
        this.dom.userRolePill.className = 'role-pill role-player';
        this.dom.userRolePill.textContent = `PLAYER (${user.rating})`;
      } else {
        this.dom.userRoleIcon.textContent = '👤';
        this.dom.userRolePill.className = 'role-pill role-guest';
        this.dom.userRolePill.textContent = 'GUEST';
      }
    }

    if (auth.isGuest()) {
      if (this.dom.btnOpenLogin) this.dom.btnOpenLogin.style.display = 'inline-flex';
      if (this.dom.btnLogout) this.dom.btnLogout.style.display = 'none';
    } else {
      if (this.dom.btnOpenLogin) this.dom.btnOpenLogin.style.display = 'none';
      if (this.dom.btnLogout) this.dom.btnLogout.style.display = 'inline-flex';
    }
  }

  initTimer() {
    this.timer = new GameTimer({
      onTick: ({ timers }) => {
        this.dom.p1Clock.textContent = GameTimer.formatTime(timers[PLAYERS.P1]);
        this.dom.p2Clock.textContent = GameTimer.formatTime(timers[PLAYERS.P2]);
      },
      onTimeout: (timedOutPlayer) => {
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
          // Nếu ván mới hoặc tiếp tục chơi, đóng modal kết quả và modal cầu hòa
          this.closeModal(this.dom.resultModal);
          this.closeModal(this.dom.drawOfferModal);
          this.timer.setTimers(this.engine.timers, this.engine.settings.moveTime);
          this.timer.start(this.engine.currentPlayer);
        }
      },
      // Lắng nghe cập nhật lời mời hòa cờ
      onDrawOffer: (drawOffer) => {
        this.handleDrawOffer(drawOffer);
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

    // Đề nghị hòa cờ (Offer Draw)
    this.dom.btnOfferDraw.addEventListener('click', () => {
      if (this.engine.status !== GAME_STATUS.PLAYING) return;
      if (this.mode === 'ONLINE' && this.multiplayer) {
        this.multiplayer.sendDrawOffer();
        this.showToast('Đã gửi lời mời hòa cờ tới đối thủ. Vui lòng chờ phản hồi...');
      } else {
        this.dom.drawOfferDesc.textContent = 'Hai bên người chơi có đồng ý hòa cờ và kết thúc ván này không?';
        this.openModal(this.dom.drawOfferModal);
      }
    });

    // Đồng ý / Từ chối lời mời hòa
    this.dom.btnAcceptDraw.addEventListener('click', () => {
      this.closeModal(this.dom.drawOfferModal);
      const result = this.engine.agreeDraw();
      this.timer.stop();
      this.showGameOverModal(result);
      if (this.mode === 'ONLINE' && this.multiplayer) {
        this.multiplayer.respondDrawOffer(true, this.engine.getState());
      }
    });

    this.dom.btnDeclineDraw.addEventListener('click', () => {
      this.closeModal(this.dom.drawOfferModal);
      if (this.mode === 'ONLINE' && this.multiplayer) {
        this.multiplayer.respondDrawOffer(false);
      }
      this.showToast('Bạn đã từ chối lời mời hòa cờ.');
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

    // Chơi lại ván mới (Rematch)
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

    // Đăng nhập / Đăng xuất / Khách
    this.dom.btnOpenLogin.addEventListener('click', () => this.openModal(this.dom.loginModal));
    this.dom.btnCloseLogin.addEventListener('click', () => this.closeModal(this.dom.loginModal));
    this.dom.btnLogout.addEventListener('click', () => {
      auth.logout();
      this.updateUserAuthUI();
      this.showToast('Đã đăng xuất! Chuyển sang chế độ Khách (Guest).');
    });

    this.dom.btnPlayAsGuest.addEventListener('click', () => {
      auth.setGuest();
      this.updateUserAuthUI();
      this.closeModal(this.dom.loginModal);
      this.showToast('Tiếp tục với tư cách Khách (Guest).');
    });

    this.dom.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = this.dom.loginUsername.value;
      const password = this.dom.loginPassword.value;
      const res = auth.login(username, password);
      if (res.success) {
        this.updateUserAuthUI();
        this.closeModal(this.dom.loginModal);
        this.showToast(`Đăng nhập thành công! Chào mừng ${res.user.displayName}`);
      } else {
        this.showToast(res.error);
      }
    });

    // Nút chọn nhanh tài khoản demo
    this.dom.quickAccBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.loginUsername.value = btn.dataset.user;
        this.dom.loginPassword.value = btn.dataset.pass;
      });
    });

    // Banner & Modal Đấu trường Pro Tournament
    this.dom.btnProTournament.addEventListener('click', () => this.handleProTournamentClick());
    this.dom.btnCloseTournament.addEventListener('click', () => this.closeModal(this.dom.tournamentModal));
  }

  handleProTournamentClick() {
    const user = auth.getCurrentUser();
    const body = this.dom.tournamentModalBody;

    if (auth.isGuest()) {
      body.innerHTML = `
        <div style="margin-bottom: 0.75rem; color: #f59e0b; font-weight: 700;">
          ⚠️ BẠN ĐANG Ở CHẾ ĐỘ KHÁCH (GUEST)
        </div>
        <p>
          Đấu Trường Chuyên Nghiệp (Pro Championship) là giải đấu có hệ thống ELO và xếp hạng nghiêm ngặt, chỉ dành riêng cho các tuyển thủ chuyên nghiệp (Role: <strong>Pro Player</strong>).
        </p>
        <p style="margin-top: 0.5rem; color: #94a3b8;">
          Vui lòng đăng nhập bằng tài khoản Pro Player để có thể ghi danh tham gia giải đấu.
        </p>
        <div style="margin-top: 1rem; text-align: center;">
          <button id="btn-login-from-tourney" class="btn btn-primary">🔑 Đăng nhập tài khoản Pro</button>
        </div>
      `;
      setTimeout(() => {
        const btnLoginTourney = document.getElementById('btn-login-from-tourney');
        if (btnLoginTourney) {
          btnLoginTourney.addEventListener('click', () => {
            this.closeModal(this.dom.tournamentModal);
            this.openModal(this.dom.loginModal);
          });
        }
      }, 50);
    } else if (user.role === USER_ROLES.PLAYER) {
      body.innerHTML = `
        <div style="margin-bottom: 0.75rem; color: #38bdf8; font-weight: 700;">
          🔒 CHƯA ĐẠT ĐIỀU KIỆN PRO LEAGUE
        </div>
        <p>
          Chào <strong>${user.displayName}</strong>! Cấp bậc hiện tại của bạn là <strong>Kỳ thủ Nghiệp dư (Player)</strong> với Rating: <strong>${user.rating} ELO</strong>.
        </p>
        <p style="margin-top: 0.5rem; color: #94a3b8;">
          Hệ thống Pro Championship yêu cầu cấp bậc tuyển thủ chuyên nghiệp (<strong>Role: Pro Player</strong> với Rating tối thiểu từ <strong>2400 ELO</strong>).
        </p>
        <p style="margin-top: 0.5rem; color: #cbd5e1;">
          💡 <em>Mẹo: Hãy tiếp tục rèn luyện ở các phòng đấu thường để nâng cao hệ số chiến thuật!</em>
        </p>
      `;
    } else if (user.role === USER_ROLES.PRO_PLAYER) {
      body.innerHTML = `
        <div style="margin-bottom: 0.75rem; color: #fbbf24; font-weight: 700;">
          ⭐ XÁC NHẬN ĐẠI KIỆN TƯỚNG PRO PLAYER
        </div>
        <p>
          Chào mừng tuyển thủ <strong>${user.displayName}</strong> (${user.title})!
        </p>
        <p style="margin-top: 0.5rem;">
          Hệ số ELO hiện tại của bạn: <strong style="color: #fbbf24; font-size: 1.15rem;">${user.rating} ELO</strong> (Đủ điều kiện hạt giống hàng đầu).
        </p>
        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 0.85rem; margin-top: 0.85rem; font-size: 0.88rem; color: #fde68a; line-height: 1.6;">
          🚀 <strong>TÍNH NĂNG ĐANG PHÁT TRIỂN (SẮP RA MẮT):</strong><br>
          Hệ thống chia bảng đấu vòng tròn (Round Robin) và nhánh thắng - nhánh thua (Double Elimination) Bo3/Bo5 dành cho 8 Pro Player đang được phát triển theo lộ trình bài tập lớn tuần tiếp theo. Tài khoản của bạn đã được lưu vào danh sách chờ giải đấu!
        </div>
      `;
    }

    this.openModal(this.dom.tournamentModal);
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
    const user = auth.getCurrentUser();

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
      p1: { name: user.displayName, role: user.role, rating: user.rating, ready: false, present: true },
      p2: { name: 'Người chơi 2', role: 'guest', rating: 1000, ready: false, present: false }
    });

    const ok = await this.multiplayer.createRoom(roomCode, settings, user);
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

    const user = auth.getCurrentUser();

    this.mode = 'ONLINE';
    this.myPlayerRole = PLAYERS.P2;
    this.isReady = false;

    this.engine = new GameEngine();
    this.renderer.setView(PLAYERS.P2);

    this.switchScreen('WAITING');
    this.dom.waitingRoomCode.textContent = code;
    this.updateWaitingRoomUI({
      roomCode: code,
      p1: { name: 'Người chơi 1', role: 'guest', rating: 1000, ready: false, present: true },
      p2: { name: user.displayName, role: user.role, rating: user.rating, ready: false, present: true }
    });

    const ok = await this.multiplayer.joinRoom(code, user);
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

    // Cập nhật tên và role slot P1
    const p1NameEl = this.dom.slotP1.querySelector('.slot-name');
    if (p1NameEl) {
      const p1RoleTag = (p1.role === USER_ROLES.PRO_PLAYER) ? ' [PRO ⭐]' : '';
      p1NameEl.textContent = `${p1.name || 'Người chơi 1'}${p1RoleTag} (Chủ phòng)`;
    }

    // Cập nhật tên và role slot P2
    const p2NameEl = this.dom.slotP2.querySelector('.slot-name');
    if (p2NameEl) {
      const p2RoleTag = (p2.role === USER_ROLES.PRO_PLAYER) ? ' [PRO ⭐]' : '';
      p2NameEl.textContent = `${p2.name || 'Người chơi 2'}${p2RoleTag}`;
    }

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

  handleDrawOffer(drawOffer) {
    if (!drawOffer) return;
    if (drawOffer.status === 'PENDING') {
      if (drawOffer.from !== this.myPlayerRole) {
        sound.playMove();
        const opponentName = (drawOffer.from === PLAYERS.P1) ? 'Người chơi 1 (Xanh)' : 'Người chơi 2 (Đỏ)';
        this.dom.drawOfferDesc.textContent = `Đối thủ [${opponentName}] vừa gửi lời mời HÒA CỜ ván này. Bạn có đồng ý chia điểm không?`;
        this.openModal(this.dom.drawOfferModal);
      }
    } else if (drawOffer.status === 'DECLINED') {
      if (drawOffer.from !== this.myPlayerRole) {
        this.showToast('Đối thủ đã từ chối lời mời hòa cờ!');
      }
    } else if (drawOffer.status === 'ACCEPTED') {
      this.closeModal(this.dom.drawOfferModal);
      this.showToast('Hai bên đã đồng ý hòa cờ!');
    }
  }

  startCountdownAndLaunchGame(roomData) {
    if (this.countdownActive) return;
    this.countdownActive = true;

    this.dom.waitingCountdownBox.style.display = 'block';
    let count = 3;
    this.dom.waitingCountdownBox.textContent = `🚀 Cả hai đã sẵn sàng! Bắt đầu sau ${count}...`;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.waitingCountdownBox.textContent = `🚀 Cả hai đã sẵn sàng! Bắt đầu sau ${count}...`;
        sound.playMove();
      } else {
        clearInterval(interval);
        this.countdownActive = false;
        this.dom.waitingCountdownBox.style.display = 'none';

        // Vào trận đấu đồng bộ
        if (roomData.gameState) {
          this.engine.loadState(roomData.gameState);
        } else {
          this.engine.initGame();
        }

        const p1 = roomData.p1 || {};
        const p2 = roomData.p2 || {};
        const p1Title = this.dom.p1Card.querySelector('.player-title');
        const p2Title = this.dom.p2Card.querySelector('.player-title');
        if (p1Title) p1Title.textContent = p1.name || 'Người chơi 1';
        if (p2Title) p2Title.textContent = p2.name || 'Người chơi 2';

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
    const user = auth.getCurrentUser();

    this.mode = 'LOCAL';
    this.myPlayerRole = PLAYERS.P1;
    this.engine = new GameEngine(settings);
    this.engine.initGame();

    this.renderer.setView(PLAYERS.P1);
    this.switchScreen('GAME');

    const p1Title = this.dom.p1Card.querySelector('.player-title');
    const p2Title = this.dom.p2Card.querySelector('.player-title');
    if (p1Title) p1Title.textContent = `${user.displayName} (P1)`;
    if (p2Title) p2Title.textContent = 'Người chơi 2 (P2)';

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

    this.closeModal(this.dom.resultModal);
    this.closeModal(this.dom.drawOfferModal);

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
    this.closeModal(this.dom.resultModal);
    this.closeModal(this.dom.drawOfferModal);
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

        if (moveRes.gameOver) {
          this.timer.stop();
        } else {
          this.timer.switchPlayer(this.engine.currentPlayer);
        }

        // Đồng bộ lên mạng
        if (this.mode === 'ONLINE' && this.multiplayer) {
          this.multiplayer.sendMove(this.engine.getState(), moveRes.move);
        }

        this.updateGameUI();

        // Kiểm tra kết thúc ván đấu
        if (moveRes.gameOver) {
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

    // Click vào ô trống hoặc ô không hợp lệ: bỏ chọn
    if (this.renderer.selectedPos) {
      this.renderer.clearSelection();
      this.renderBoard();
    }
  }

  updateGameUI() {
    this.renderBoard();
    this.updateCounters();
    this.updateTurnBanner();
    this.updateHistoryList();
  }

  renderBoard() {
    this.renderer.render(this.engine.board);
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
    if (this.engine.status === GAME_STATUS.FINISHED) {
      if (this.engine.result && !this.engine.result.winner) {
        this.dom.turnDot.className = 'turn-dot';
        this.dom.turnDot.style.background = '#f59e0b';
        this.dom.turnText.textContent = 'Trận đấu kết thúc: HÒA CỜ 🤝';
        this.dom.p1Card.classList.remove('active-turn');
        this.dom.p2Card.classList.remove('active-turn');
        return;
      }
      if (this.engine.result && this.engine.result.winner) {
        const w = this.engine.result.winner;
        this.dom.turnDot.className = `turn-dot ${w === PLAYERS.P1 ? 'p1' : 'p2'}`;
        this.dom.turnText.textContent = `Trận đấu kết thúc: ${w === PLAYERS.P1 ? 'Người chơi 1 thắng 🏆' : 'Người chơi 2 thắng 🏆'}`;
        this.dom.p1Card.classList.toggle('active-turn', w === PLAYERS.P1);
        this.dom.p2Card.classList.toggle('active-turn', w === PLAYERS.P2);
        return;
      }
    }

    const isP1 = (this.engine.currentPlayer === PLAYERS.P1);
    this.dom.turnDot.style.background = '';
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

    if (result.winner) {
      sound.playWin();
      const isWinner = (this.mode === 'LOCAL') 
        ? true 
        : (result.winner === this.myPlayerRole);

      this.dom.resultTrophy.textContent = isWinner ? '🏆' : '💀';
      this.dom.resultTitle.textContent = `${result.winner} CHIẾN THẮNG!`;
      this.dom.resultTitle.style.color = (result.winner === PLAYERS.P1) ? '#38bdf8' : '#fb7185';
    } else {
      sound.playMove();
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
