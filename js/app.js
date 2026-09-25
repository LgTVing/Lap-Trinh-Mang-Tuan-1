/**
 * OTTv2 Main Application Controller
 * Quản lý Sảnh (Lobby), Xác thực (Auth), Phòng chờ (Waiting Room), Trận đấu 1v1 (Game Arena),
 * và Đấu trường Giải đấu Pro Championship 8 Pro Player trên 4 Bàn (Tournament Arena).
 */

import { GameEngine } from './GameEngine.js';
import { GameBoardRenderer } from './GameBoardRenderer.js';
import { MultiplayerManager } from './multiplayer.js';
import { TournamentManager, TOURNAMENT_TABLES_CONFIG } from './tournamentManager.js';
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

    // Chế độ chơi 1v1: 'ONLINE' hoặc 'LOCAL'
    this.mode = 'LOCAL';
    this.myPlayerRole = PLAYERS.P1; // 'P1' hoặc 'P2'
    this.isReady = false;

    // Quản lý giải đấu Tournament
    this.tournament = null;
    this.currentTourneyTableId = 1;
    this.tourneyViewMode = 'grid'; // 'grid' (2x2) hoặc 'single' (1 bàn)
    this.tourneyMiniRenderers = {};
    this.tourneySingleRenderer = null;

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
    await this.initTournament();
    this.bindEvents();
    this.loadInitialSettings();
  }

  cacheDOMElements() {
    this.dom = {
      // Screens
      lobbyScreen: document.getElementById('lobby-screen'),
      waitingScreen: document.getElementById('waiting-screen'),
      gameScreen: document.getElementById('game-screen'),
      tournamentScreen: document.getElementById('tournament-screen'),

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

      // Clocks & Counters 1v1
      p1Clock: document.getElementById('p1-clock'),
      p2Clock: document.getElementById('p2-clock'),
      p1Card: document.getElementById('p1-card'),
      p2Card: document.getElementById('p2-card'),
      p1RockCount: document.getElementById('p1-rock-count'),
      p1PaperCount: document.getElementById('p1-paper-count'),
      p1ScissorsCount: document.getElementById('p1-scissors-count'),
      p2RockCount: document.getElementById('p2-rock-count'),
      p2PaperCount: document.getElementById('p2-paper-count'),
      p2ScissorsCount: document.getElementById('p2-scissors-count'),

      // History & Actions 1v1
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

      // Tournament Elements
      tourneyUserRoleLabel: document.getElementById('tourney-user-role-label'),
      tourneyGlobalStatus: document.getElementById('tourney-global-status'),
      tourneyViewSwitcher: document.getElementById('tourney-view-switcher'),
      btnTourneyViewGrid: document.getElementById('btn-tourney-view-grid'),
      btnTourneyTabs: document.querySelectorAll('.btn-tourney-tab'),
      tourneyAdminControls: document.getElementById('tourney-admin-controls'),
      btnTourneyAdminRestart: document.getElementById('btn-tourney-admin-restart'),
      btnTourneyAdminSim: document.getElementById('btn-tourney-admin-sim'),
      btnTourneyExit: document.getElementById('btn-tourney-exit'),
      tourneyGridView: document.getElementById('tourney-grid-view'),
      tourneySingleView: document.getElementById('tourney-single-view'),
      btnBackToGrid: document.getElementById('btn-back-to-grid'),
      tourneySingleTitle: document.getElementById('tourney-single-title'),
      tourneySingleStatus: document.getElementById('tourney-single-status'),
      tourneySingleBoardContainer: document.getElementById('tourney-single-board-container'),
      tourneyP1Card: document.getElementById('tourney-p1-card'),
      tourneyP2Card: document.getElementById('tourney-p2-card'),
      tourneyP1Name: document.getElementById('tourney-p1-name'),
      tourneyP2Name: document.getElementById('tourney-p2-name'),
      tourneyP1Clock: document.getElementById('tourney-p1-clock'),
      tourneyP2Clock: document.getElementById('tourney-p2-clock'),
      tourneyP1Rock: document.getElementById('tourney-p1-rock'),
      tourneyP1Paper: document.getElementById('tourney-p1-paper'),
      tourneyP1Scissors: document.getElementById('tourney-p1-scissors'),
      tourneyP2Rock: document.getElementById('tourney-p2-rock'),
      tourneyP2Paper: document.getElementById('tourney-p2-paper'),
      tourneyP2Scissors: document.getElementById('tourney-p2-scissors'),
      tourneySingleTurnBanner: document.getElementById('tourney-single-turn-banner'),
      tourneySingleTurnDot: document.getElementById('tourney-single-turn-dot'),
      tourneySingleTurnText: document.getElementById('tourney-single-turn-text'),
      tourneyPlayerControls: document.getElementById('tourney-player-controls'),
      btnTourneyDraw: document.getElementById('btn-tourney-draw'),
      btnTourneyResign: document.getElementById('btn-tourney-resign'),
      tourneySpectatorNotice: document.getElementById('tourney-spectator-notice'),
      tourneyTableFinishedBox: document.getElementById('tourney-table-finished-box'),
      tourneyRoundFinishedBox: document.getElementById('tourney-round-finished-box'),
      btnTourneyFinishRestart: document.getElementById('btn-tourney-finish-restart'),
      btnTourneyFinishExit: document.getElementById('btn-tourney-finish-exit'),

      // Tournament Code Elements
      tourneyCodeInput: document.getElementById('tourney-code-input'),
      btnProJoinTournament: document.getElementById('btn-pro-join-tournament'),
      btnViewTournament: document.getElementById('btn-view-tournament'),
      proPlayerInputBox: document.getElementById('pro-player-input-box'),
      btnAdminCreateTourney: document.getElementById('btn-admin-create-tourney'),
      lobbyTourneyCodeBadge: document.getElementById('lobby-tourney-code-badge'),
      lobbyTourneyCodeText: document.getElementById('lobby-tourney-code-text'),
      tourneyCodePill: document.getElementById('tourney-code-pill'),
      tourneyDisplayCode: document.getElementById('tourney-display-code'),
      btnTourneyAdminNewCode: document.getElementById('btn-tourney-admin-new-code'),

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
      } else if (user.role === USER_ROLES.ADMIN) {
        this.dom.userRoleIcon.textContent = '⚡';
        this.dom.userRolePill.className = 'role-pill role-pro';
        this.dom.userRolePill.style.background = 'linear-gradient(135deg, #ef4444, #f59e0b)';
        this.dom.userRolePill.textContent = 'ADMIN';
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
      if (this.dom.proPlayerInputBox) this.dom.proPlayerInputBox.style.display = 'none';
      if (this.dom.btnViewTournament) {
        this.dom.btnViewTournament.textContent = '👁️ Xem Trực Tiếp 4 Bàn (Khán Giả)';
        this.dom.btnViewTournament.className = 'btn btn-gold';
      }
    } else {
      if (this.dom.btnOpenLogin) this.dom.btnOpenLogin.style.display = 'none';
      if (this.dom.btnLogout) this.dom.btnLogout.style.display = 'inline-flex';

      if (auth.isProPlayer()) {
        if (this.dom.proPlayerInputBox) this.dom.proPlayerInputBox.style.display = 'flex';
        if (this.dom.btnViewTournament) {
          this.dom.btnViewTournament.textContent = '👁️ Xem Với Tư Cách Khán Giả';
          this.dom.btnViewTournament.className = 'btn btn-secondary';
        }
      } else if (auth.isAdmin()) {
        if (this.dom.proPlayerInputBox) this.dom.proPlayerInputBox.style.display = 'none';
        if (this.dom.btnViewTournament) {
          this.dom.btnViewTournament.textContent = '⚡ Vào Quản Trị Giải Đấu';
          this.dom.btnViewTournament.className = 'btn btn-gold';
        }
      } else {
        if (this.dom.proPlayerInputBox) this.dom.proPlayerInputBox.style.display = 'none';
        if (this.dom.btnViewTournament) {
          this.dom.btnViewTournament.textContent = '👁️ Xem Trực Tiếp 4 Bàn (Khán Giả)';
          this.dom.btnViewTournament.className = 'btn btn-gold';
        }
      }
    }

    if (this.dom.btnAdminCreateTourney) {
      this.dom.btnAdminCreateTourney.style.display = auth.isAdmin() ? 'block' : 'none';
    }
    if (this.dom.btnTourneyAdminNewCode) {
      this.dom.btnTourneyAdminNewCode.style.display = auth.isAdmin() ? 'inline-flex' : 'none';
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
      onRoomUpdate: (roomData) => {
        this.handleRoomUpdate(roomData);
      },
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

        if (this.engine.status === GAME_STATUS.FINISHED && this.engine.result) {
          this.timer.stop();
          this.showGameOverModal(this.engine.result);
        } else if (this.engine.status === GAME_STATUS.PLAYING) {
          this.closeModal(this.dom.resultModal);
          this.closeModal(this.dom.drawOfferModal);
          this.timer.setTimers(this.engine.timers, this.engine.settings.moveTime);
          this.timer.start(this.engine.currentPlayer);
        }
      },
      onDrawOffer: (drawOffer) => {
        this.handleDrawOffer(drawOffer);
      },
      onError: (msg) => {
        this.showToast(msg);
      }
    });
  }

  async initTournament() {
    this.tournament = new TournamentManager({
      onTournamentUpdate: (tourneyState) => {
        this.renderTournamentUI(tourneyState);
      },
      onToast: (msg) => this.showToast(msg)
    });
    await this.tournament.init();
  }

  loadInitialSettings() {
    const settings = SettingsManager.getSettings();
    if (this.dom.timeSelect) this.dom.timeSelect.value = settings.playerTime;
    if (this.dom.moveTimeSelect) this.dom.moveTimeSelect.value = settings.moveTime || '';
    if (this.dom.threefoldCheck) this.dom.threefoldCheck.checked = settings.enableThreefoldRepetition;
    if (this.dom.fiftyMoveCheck) this.dom.fiftyMoveCheck.checked = settings.enableFiftyMoveRule;
  }

  bindEvents() {
    // Presets
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

    // 1v1 Online & Offline
    this.dom.btnCreateRoom.addEventListener('click', () => this.handleCreateRoom());
    this.dom.btnJoinRoom.addEventListener('click', () => this.handleJoinRoom());
    this.dom.btnP1Ready.addEventListener('click', () => { if (this.myPlayerRole === 'P1') this.toggleReady(); });
    this.dom.btnP2Ready.addEventListener('click', () => { if (this.myPlayerRole === 'P2') this.toggleReady(); });
    this.dom.btnCancelWaiting.addEventListener('click', () => this.exitToLobby());
    this.dom.btnLocalPlay.addEventListener('click', () => this.startLocalGame());

    // Copy room code
    const copyCode = (code) => {
      if (code) {
        navigator.clipboard.writeText(code);
        this.showToast(`Đã sao chép mã phòng: ${code}`);
      }
    };
    this.dom.waitingRoomCodeBox.addEventListener('click', () => copyCode(this.dom.waitingRoomCode.textContent));
    this.dom.roomCodeDisplay.addEventListener('click', () => copyCode(this.dom.roomCodeDisplay.dataset.code));

    // Offer Draw & Resign (1v1)
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

    this.dom.btnRematch.addEventListener('click', () => this.restartGame());
    this.dom.btnModalRematch.addEventListener('click', () => {
      this.closeModal(this.dom.resultModal);
      this.restartGame();
    });

    this.dom.btnExitLobby.addEventListener('click', () => this.exitToLobby());
    this.dom.btnModalExit.addEventListener('click', () => {
      this.closeModal(this.dom.resultModal);
      this.exitToLobby();
    });

    // Sound & Help
    this.dom.btnToggleSound.addEventListener('click', () => {
      sound.muted = !sound.muted;
      this.dom.btnToggleSound.textContent = sound.muted ? '🔇' : '🔊';
      this.showToast(sound.muted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
    });
    this.dom.btnHelp.addEventListener('click', () => this.openModal(this.dom.rulesModal));
    this.dom.btnCloseRules.addEventListener('click', () => this.closeModal(this.dom.rulesModal));

    // Auth
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

    this.dom.quickAccBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.loginUsername.value = btn.dataset.user;
        this.dom.loginPassword.value = btn.dataset.pass;
      });
    });

    // Copy mã giải đấu
    const copyTourneyCode = () => {
      const code = this.tournament.tournamentState.tournamentCode || 'PRO-8899';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          this.showToast(`📋 Đã sao chép mã giải đấu: ${code}`);
        }).catch(() => {
          this.showToast(`Mã giải đấu: ${code}`);
        });
      } else {
        this.showToast(`Mã giải đấu: ${code}`);
      }
    };

    if (this.dom.lobbyTourneyCodeBadge) {
      this.dom.lobbyTourneyCodeBadge.addEventListener('click', copyTourneyCode);
    }
    if (this.dom.tourneyCodePill) {
      this.dom.tourneyCodePill.addEventListener('click', copyTourneyCode);
    }

    // Admin tạo giải đấu mới (sinh mã) từ Lobby
    if (this.dom.btnAdminCreateTourney) {
      this.dom.btnAdminCreateTourney.addEventListener('click', () => {
        const res = this.tournament.createTournament(auth.isAdmin());
        if (res.success) {
          this.showToast(`🎉 Đã tạo giải đấu mới! Mã giải: ${res.tournamentCode}`);
          if (this.dom.tourneyCodeInput) this.dom.tourneyCodeInput.value = res.tournamentCode;
          this.enterTournament();
        } else {
          this.showToast(res.error || 'Lỗi tạo giải đấu');
        }
      });
    }

    // Admin sinh mã mới từ trong phòng đấu
    if (this.dom.btnTourneyAdminNewCode) {
      this.dom.btnTourneyAdminNewCode.addEventListener('click', () => {
        const res = this.tournament.createTournament(auth.isAdmin());
        if (res.success) {
          this.showToast(`🎉 Đã sinh mã giải mới: ${res.tournamentCode}! 4 bàn đấu đã làm mới.`);
        } else {
          this.showToast(res.error || 'Lỗi tạo mã mới');
        }
      });
    }

    // Nút Xem Trực Tiếp dành cho Khán giả (ai cũng vào xem được tự do không cần mã)
    if (this.dom.btnViewTournament) {
      this.dom.btnViewTournament.addEventListener('click', () => {
        this.enterTournament(false);
      });
    }

    // Nút Tuyển thủ nhập mã để vào thi đấu bàn của mình
    if (this.dom.btnProJoinTournament) {
      this.dom.btnProJoinTournament.addEventListener('click', () => {
        const user = auth.getCurrentUser();
        if (!auth.isProPlayer()) {
          this.showToast('Chỉ tài khoản Tuyển thủ (Pro Player) mới có quyền tham gia thi đấu!');
          return;
        }

        const inputCode = (this.dom.tourneyCodeInput?.value || '').trim().toUpperCase();
        if (!inputCode) {
          this.showToast('Vui lòng nhập mã giải đấu do Ban Tổ Chức cấp!');
          return;
        }

        const res = this.tournament.verifyProPlayerCode(user.username, inputCode);
        if (res.success) {
          this.showToast(`👑 Xác thực thành công! Tuyển thủ ${user.displayName} vào Bàn ${res.tableId}.`);
          this.enterTournament(true);
        } else {
          this.showToast(res.error);
        }
      });
    }

    if (this.dom.btnProTournament) {
      this.dom.btnProTournament.addEventListener('click', () => {
        this.enterTournament(auth.isProPlayer());
      });
    }
    this.dom.btnTourneyExit.addEventListener('click', () => this.exitTournament());

    // Switch view in tournament (Khán giả & Admin xem 4 bàn hoặc từng bàn)
    this.dom.btnTourneyViewGrid.addEventListener('click', () => this.setTourneyView('grid'));
    this.dom.btnBackToGrid.addEventListener('click', () => this.setTourneyView('grid'));

    this.dom.btnTourneyTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tableId = parseInt(tab.dataset.table, 10);
        this.setTourneyView('single', tableId);
      });
    });

    // Zoom buttons in cards
    document.querySelectorAll('.btn-zoom-table').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tableId = parseInt(btn.dataset.table, 10);
        this.setTourneyView('single', tableId);
      });
    });

    // Admin Controls
    this.dom.btnTourneyAdminRestart.addEventListener('click', () => {
      this.tournament.restartTournament(auth.isAdmin());
      this.showToast('🔄 Ban Tổ Chức (Admin) đã khởi động lại toàn bộ 4 bàn đấu!');
    });

    this.dom.btnTourneyFinishRestart.addEventListener('click', () => {
      this.tournament.restartTournament(auth.isAdmin());
      this.showToast('🔄 Ban Tổ Chức (Admin) đã khởi động lại vòng đấu mới!');
    });

    if (this.dom.btnTourneyFinishExit) {
      this.dom.btnTourneyFinishExit.addEventListener('click', () => {
        this.tournament.toggleAutoSimulation(false);
        this.switchScreen('LOBBY');
        this.showToast('Bạn đã rời giải đấu về sảnh chính.');
      });
    }

    let autoSim = false;
    this.dom.btnTourneyAdminSim.addEventListener('click', () => {
      autoSim = !autoSim;
      this.tournament.toggleAutoSimulation(autoSim);
      this.dom.btnTourneyAdminSim.textContent = autoSim ? '⏹️ Dừng Tự Động' : '⚡ Tự Động Đấu (Demo)';
      this.showToast(autoSim ? 'Bắt đầu mô phỏng tự động nước đi các bàn...' : 'Đã dừng mô phỏng');
    });

    // Player Actions in Tournament Single Table
    this.dom.btnTourneyResign.addEventListener('click', () => {
      const user = auth.getCurrentUser();
      if (confirm('Bạn có chắc chắn muốn đầu hàng tại bàn này không?')) {
        const res = this.tournament.resign(user.username, this.currentTourneyTableId);
        if (res.success) {
          this.showToast('Bạn đã đầu hàng. Trận đấu tại bàn này đã kết thúc!');
        } else {
          this.showToast(res.error || 'Lỗi thao tác đầu hàng');
        }
      }
    });

    this.dom.btnTourneyDraw.addEventListener('click', () => {
      if (confirm('Hai bên tuyển thủ có đồng ý hòa cờ tại bàn này không?')) {
        const res = this.tournament.agreeDraw(this.currentTourneyTableId);
        if (res.success) {
          this.showToast('Hai bên đã đồng ý hòa cờ tại bàn đấu này!');
        }
      }
    });
  }

  // =========================================================================
  // TOURNAMENT LOGIC & RENDERING
  // =========================================================================

  enterTournament(asCompetitor = false) {
    const user = auth.getCurrentUser();
    this.switchScreen('TOURNAMENT');

    if (asCompetitor && auth.isProPlayer()) {
      // Tuyển thủ Pro Player: Chỉ xem và chơi đúng bàn đấu được chia!
      const assignment = this.tournament.getPlayerAssignment(user.username);
      if (assignment) {
        this.currentTourneyTableId = assignment.tableId;
        this.dom.tourneyUserRoleLabel.textContent = `👑 Tuyển thủ: ${user.displayName} | Bàn thi đấu: BÀN ${assignment.tableId} (${assignment.role})`;
        this.dom.tourneyViewSwitcher.style.display = 'none'; // Không cho tuyển thủ xem bàn khác
        this.dom.tourneyAdminControls.style.display = 'none';
        this.dom.btnBackToGrid.style.display = 'none';
        this.setTourneyView('single', assignment.tableId);
        this.showToast(`Chào mừng ${user.displayName}! Bạn đang thi đấu tại Bàn ${assignment.tableId}`);
      }
    } else if (auth.isAdmin()) {
      // Ban Tổ Chức (Admin): Có quyền xem toàn bộ 4 bàn và điều khiển restart
      this.dom.tourneyUserRoleLabel.textContent = `⚡ Quản Trị Viên: ${user.displayName} (Ban Tổ Chức)`;
      this.dom.tourneyViewSwitcher.style.display = 'flex';
      this.dom.tourneyAdminControls.style.display = 'flex';
      this.dom.btnBackToGrid.style.display = 'inline-flex';
      this.setTourneyView('grid');
      this.showToast('Đang ở chế độ Quản trị viên (Admin BTC)!');
    } else {
      // Khán giả (Guest hoặc Player thường hoặc Pro Player xem trực tiếp): Được xem 4 bàn cùng lúc hoặc từng bàn
      this.dom.tourneyUserRoleLabel.textContent = `👁️ Chế độ: Khán giả xem trực tiếp (${user.displayName})`;
      this.dom.tourneyViewSwitcher.style.display = 'flex';
      this.dom.tourneyAdminControls.style.display = 'none';
      this.dom.btnBackToGrid.style.display = 'inline-flex';
      this.setTourneyView('grid');
      this.showToast('Bạn đang xem giải đấu với tư cách Khán giả (Chỉ xem).');
    }

    this.renderTournamentUI(this.tournament.tournamentState);
  }

  exitTournament() {
    const user = auth.getCurrentUser();
    if (auth.isProPlayer()) {
      if (!this.tournament.tournamentState.allFinished) {
        this.showToast('🛑 Giải đấu đang diễn ra! Tuyển thủ chỉ được rời phòng khi cả 4 phòng đã thi đấu xong.');
        return;
      }
    }
    this.tournament.toggleAutoSimulation(false);
    this.switchScreen('LOBBY');
  }

  setTourneyView(mode, tableId = 1) {
    this.tourneyViewMode = mode;
    if (tableId) this.currentTourneyTableId = tableId;

    if (mode === 'grid') {
      this.dom.tourneyGridView.style.display = 'grid';
      this.dom.tourneySingleView.style.display = 'none';
      this.dom.btnTourneyViewGrid.classList.add('active');
      this.dom.btnTourneyTabs.forEach(t => t.classList.remove('active'));
    } else {
      this.dom.tourneyGridView.style.display = 'none';
      this.dom.tourneySingleView.style.display = 'flex';
      this.dom.btnTourneyViewGrid.classList.remove('active');
      this.dom.btnTourneyTabs.forEach(t => {
        t.classList.toggle('active', parseInt(t.dataset.table, 10) === this.currentTourneyTableId);
      });
    }

    this.renderTournamentUI(this.tournament.tournamentState);
  }

  renderTournamentUI(tourneyState) {
    if (!tourneyState || !tourneyState.tables) return;

    // Cập nhật mã giải đấu trên giao diện (Lobby và Header Tournament)
    const tourneyCode = tourneyState.tournamentCode || 'PRO-8899';
    if (this.dom.lobbyTourneyCodeText) this.dom.lobbyTourneyCodeText.textContent = tourneyCode;
    if (this.dom.tourneyDisplayCode) this.dom.tourneyDisplayCode.textContent = tourneyCode;

    // 1. Cập nhật Status Bar tổng thể giải đấu
    const summary = this.tournament.getStatusSummary();
    this.dom.tourneyGlobalStatus.textContent = summary.allFinished
      ? `🏆 4/4 Bàn Hoàn Thành - Vòng Đấu Kết Thúc!`
      : `⚔️ ${summary.finishedCount}/4 Bàn Hoàn Thành`;

    // 2. Cập nhật trạng thái từng bàn trong Grid View (4 Bàn)
    Object.keys(tourneyState.tables).forEach(tId => {
      const table = tourneyState.tables[tId];
      const engine = this.tournament.engines[tId];
      if (!table || !engine) return;

      const statusEl = document.getElementById(`table-status-${tId}`);
      const turnEl = document.getElementById(`table-turn-${tId}`);
      const miniContainer = document.getElementById(`tourney-grid-board-${tId}`);

      if (table.status === GAME_STATUS.FINISHED) {
        if (statusEl) {
          statusEl.className = 'table-status-pill status-finished';
          if (table.result?.winner) {
            const winnerName = (table.result.winner === PLAYERS.P1) ? table.p1.name : table.p2.name;
            statusEl.textContent = `🏆 ${winnerName} Thắng`;
          } else {
            statusEl.textContent = '🤝 Hòa cờ';
          }
        }
        if (turnEl) turnEl.textContent = 'Trận đấu kết thúc';
      } else {
        if (statusEl) {
          statusEl.className = 'table-status-pill status-playing';
          statusEl.textContent = '⚔️ Đang đấu';
        }
        if (turnEl) {
          const isP1 = (engine.currentPlayer === PLAYERS.P1);
          turnEl.textContent = `Lượt: ${isP1 ? table.p1.name : table.p2.name}`;
        }
      }

      // Render bàn cờ mini compact trong chế độ Grid
      if (this.tourneyViewMode === 'grid' && miniContainer) {
        if (!this.tourneyMiniRenderers[tId]) {
          this.tourneyMiniRenderers[tId] = new GameBoardRenderer(miniContainer, {
            compact: true,
            readOnly: true
          });
        }
        const miniRenderer = this.tourneyMiniRenderers[tId];
        if (table.lastMove) miniRenderer.setLastMove(table.lastMove);
        miniRenderer.render(engine.board);
      }
    });

    // 3. Cập nhật giao diện bàn đấu đơn chi tiết (Single Table View)
    if (this.tourneyViewMode === 'single') {
      this.renderTournamentSingleTable(this.currentTourneyTableId);
    }
  }

  renderTournamentSingleTable(tableId) {
    const table = this.tournament.tournamentState.tables[tableId];
    const engine = this.tournament.engines[tableId];
    if (!table || !engine) return;

    const user = auth.getCurrentUser();

    // Tiêu đề & Trạng thái bàn
    this.dom.tourneySingleTitle.textContent = `${table.name}: ${table.p1.name} VS ${table.p2.name}`;
    if (table.status === GAME_STATUS.FINISHED) {
      this.dom.tourneySingleStatus.className = 'table-status-pill status-finished';
      if (table.result?.winner) {
        const winName = (table.result.winner === PLAYERS.P1) ? table.p1.name : table.p2.name;
        this.dom.tourneySingleStatus.textContent = `🏆 ${winName} CHIẾN THẮNG`;
      } else {
        this.dom.tourneySingleStatus.textContent = '🤝 HÒA CỜ';
      }
    } else {
      this.dom.tourneySingleStatus.className = 'table-status-pill status-playing';
      this.dom.tourneySingleStatus.textContent = '⚔️ Đang thi đấu';
    }

    // Thông tin P1 và P2
    this.dom.tourneyP1Name.textContent = `${table.p1.name} (${table.p1.rating})`;
    this.dom.tourneyP2Name.textContent = `${table.p2.name} (${table.p2.rating})`;
    this.dom.tourneyP1Clock.textContent = GameTimer.formatTime(engine.timers[PLAYERS.P1]);
    this.dom.tourneyP2Clock.textContent = GameTimer.formatTime(engine.timers[PLAYERS.P2]);

    const p1Rem = engine.remainingPieces[PLAYERS.P1];
    const p2Rem = engine.remainingPieces[PLAYERS.P2];
    this.dom.tourneyP1Rock.textContent = p1Rem[PIECE_TYPES.ROCK] || 0;
    this.dom.tourneyP1Paper.textContent = p1Rem[PIECE_TYPES.PAPER] || 0;
    this.dom.tourneyP1Scissors.textContent = p1Rem[PIECE_TYPES.SCISSORS] || 0;
    this.dom.tourneyP2Rock.textContent = p2Rem[PIECE_TYPES.ROCK] || 0;
    this.dom.tourneyP2Paper.textContent = p2Rem[PIECE_TYPES.PAPER] || 0;
    this.dom.tourneyP2Scissors.textContent = p2Rem[PIECE_TYPES.SCISSORS] || 0;

    // Lượt đi
    const isP1 = (engine.currentPlayer === PLAYERS.P1);
    this.dom.tourneyP1Card.classList.toggle('active-turn', isP1 && table.status === GAME_STATUS.PLAYING);
    this.dom.tourneyP2Card.classList.toggle('active-turn', !isP1 && table.status === GAME_STATUS.PLAYING);

    if (table.status === GAME_STATUS.FINISHED) {
      this.dom.tourneySingleTurnDot.style.background = '#f59e0b';
      this.dom.tourneySingleTurnText.textContent = table.result?.details || 'Ván đấu đã kết thúc!';
    } else {
      this.dom.tourneySingleTurnDot.style.background = '';
      this.dom.tourneySingleTurnDot.className = `turn-dot ${isP1 ? 'p1' : 'p2'}`;
      this.dom.tourneySingleTurnText.textContent = `Lượt: ${isP1 ? table.p1.name : table.p2.name} (${isP1 ? 'Xanh' : 'Đỏ'})`;
    }

    // Kiểm tra quyền tương tác
    const canMoveCheck = this.tournament.canMakeMove(user.username, tableId);
    const assignment = this.tournament.getPlayerAssignment(user.username);
    const isProInThisTable = assignment && assignment.tableId === Number(tableId);

    if (this.tournament.tournamentState.allFinished) {
      // 4/4 bàn đã kết thúc -> Khóa hoàn toàn, giữ nguyên hiện trạng
      this.dom.tourneyPlayerControls.style.display = 'none';
      this.dom.tourneySpectatorNotice.style.display = 'none';
      if (this.dom.tourneyTableFinishedBox) this.dom.tourneyTableFinishedBox.style.display = 'none';
      this.dom.tourneyRoundFinishedBox.style.display = 'block';
      this.dom.btnTourneyFinishRestart.style.display = auth.isAdmin() ? 'block' : 'none';
    } else if (table.status === GAME_STATUS.FINISHED && isProInThisTable) {
      // Ván của tuyển thủ đã xong nhưng giải chưa xong cả 4 bàn -> Dừng lại và chờ
      this.dom.tourneyPlayerControls.style.display = 'none';
      this.dom.tourneySpectatorNotice.style.display = 'none';
      if (this.dom.tourneyTableFinishedBox) this.dom.tourneyTableFinishedBox.style.display = 'block';
      this.dom.tourneyRoundFinishedBox.style.display = 'none';
    } else if (canMoveCheck.allowed) {
      this.dom.tourneyPlayerControls.style.display = 'block';
      this.dom.tourneySpectatorNotice.style.display = 'none';
      if (this.dom.tourneyTableFinishedBox) this.dom.tourneyTableFinishedBox.style.display = 'none';
      this.dom.tourneyRoundFinishedBox.style.display = 'none';
    } else {
      this.dom.tourneyPlayerControls.style.display = 'none';
      this.dom.tourneySpectatorNotice.style.display = 'block';
      if (this.dom.tourneyTableFinishedBox) this.dom.tourneyTableFinishedBox.style.display = 'none';
      this.dom.tourneyRoundFinishedBox.style.display = 'none';
    }

    // Render bàn cờ lớn Single View
    if (!this.tourneySingleRenderer) {
      this.tourneySingleRenderer = new GameBoardRenderer(this.dom.tourneySingleBoardContainer, {
        onSquareClick: (pos) => this.handleTourneySquareClick(pos)
      });
    }

    // Nếu là khán giả hoặc không được đi: set readOnly
    this.tourneySingleRenderer.readOnly = !canMoveCheck.allowed;
    if (table.lastMove) this.tourneySingleRenderer.setLastMove(table.lastMove);

    const assignment = this.tournament.getPlayerAssignment(user.username);
    const myRole = (assignment && assignment.tableId === Number(tableId)) ? assignment.role : null;
    this.tourneySingleRenderer.render(engine.board, myRole, canMoveCheck.allowed);
  }

  handleTourneySquareClick(pos) {
    const user = auth.getCurrentUser();
    const tableId = this.currentTourneyTableId;
    const engine = this.tournament.engines[tableId];
    if (!engine || engine.status !== GAME_STATUS.PLAYING) return;

    const check = this.tournament.canMakeMove(user.username, tableId);
    if (!check.allowed) {
      sound.playInvalid();
      this.showToast(check.reason);
      return;
    }

    const clickedPiece = engine.board[pos];
    const isMyPiece = clickedPiece && clickedPiece.player === check.role;

    // Di chuyển tới ô hợp lệ
    if (this.tourneySingleRenderer.selectedPos && this.tourneySingleRenderer.legalMoves.includes(pos)) {
      const from = this.tourneySingleRenderer.selectedPos;
      const to = pos;
      const targetPiece = engine.board[to];

      const res = this.tournament.makeMove(user.username, tableId, from, to);
      if (res.success) {
        if (targetPiece) {
          sound.playCapture();
        } else {
          sound.playMove();
        }
        this.tourneySingleRenderer.clearSelection();
        this.renderTournamentUI(this.tournament.tournamentState);

        if (res.gameOver) {
          this.showToast(`Bàn ${tableId} đã kết thúc ván đấu!`);
        }
      } else {
        sound.playInvalid();
        this.showToast(res.error || 'Nước đi không hợp lệ!');
      }
      return;
    }

    // Chọn quân của mình
    if (isMyPiece) {
      const legalMoves = engine.getLegalMoves(pos);
      this.tourneySingleRenderer.setSelected(pos, legalMoves);
      sound.playMove();
      this.tourneySingleRenderer.render(engine.board, check.role, true);
      return;
    }

    // Bỏ chọn
    if (this.tourneySingleRenderer.selectedPos) {
      this.tourneySingleRenderer.clearSelection();
      this.tourneySingleRenderer.render(engine.board, check.role, true);
    }
  }

  // =========================================================================
  // 1v1 ONLINE & LOCAL METHODS
  // =========================================================================

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

  async handleCreateRoom() {
    const settings = this.getCurrentSettingsFromUI();
    const roomCode = MultiplayerManager.generateRoomCode();
    const user = auth.getCurrentUser();

    this.mode = 'ONLINE';
    this.myPlayerRole = PLAYERS.P1;
    this.isReady = false;

    this.engine = new GameEngine(settings);
    this.renderer.setView(PLAYERS.P1);

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

  toggleReady() {
    this.isReady = !this.isReady;
    sound.playMove();
    this.multiplayer.setReady(this.isReady);
  }

  handleRoomUpdate(roomData) {
    if (!roomData) return;
    this.updateWaitingRoomUI(roomData);

    if (roomData.p1?.ready && roomData.p2?.ready) {
      if (this.multiplayer.isHost && roomData.phase === 'WAITING') {
        this.engine = new GameEngine(roomData.settings || this.engine.settings);
        this.engine.initGame();
        this.multiplayer.startGame(this.engine.getState());
      }
      this.startCountdownAndLaunchGame(roomData);
    }
  }

  updateWaitingRoomUI(roomData) {
    const p1 = roomData.p1 || {};
    const p2 = roomData.p2 || {};

    const p1NameEl = this.dom.slotP1.querySelector('.slot-name');
    if (p1NameEl) {
      const p1RoleTag = (p1.role === USER_ROLES.PRO_PLAYER) ? ' [PRO ⭐]' : '';
      p1NameEl.textContent = `${p1.name || 'Người chơi 1'}${p1RoleTag} (Chủ phòng)`;
    }

    const p2NameEl = this.dom.slotP2.querySelector('.slot-name');
    if (p2NameEl) {
      const p2RoleTag = (p2.role === USER_ROLES.PRO_PLAYER) ? ' [PRO ⭐]' : '';
      p2NameEl.textContent = `${p2.name || 'Người chơi 2'}${p2RoleTag}`;
    }

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
    this.dom.tournamentScreen.style.display = (screenName === 'TOURNAMENT') ? 'flex' : 'none';
  }

  handleSquareClick(pos) {
    if (this.engine.status !== GAME_STATUS.PLAYING) return;

    if (this.mode === 'ONLINE' && this.engine.currentPlayer !== this.myPlayerRole) {
      sound.playInvalid();
      this.showToast('Chưa tới lượt của bạn!');
      return;
    }

    const clickedPiece = this.engine.board[pos];
    const isCurrentPlayerPiece = clickedPiece && clickedPiece.player === this.engine.currentPlayer;

    if (this.renderer.selectedPos && this.renderer.legalMoves.includes(pos)) {
      const from = this.renderer.selectedPos;
      const to = pos;
      const targetPiece = this.engine.board[to];

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

        if (this.mode === 'ONLINE' && this.multiplayer) {
          this.multiplayer.sendMove(this.engine.getState(), moveRes.move);
        }

        this.updateGameUI();

        if (moveRes.gameOver) {
          this.showGameOverModal(moveRes.result);
        }
      } else {
        sound.playInvalid();
        this.showToast(moveRes.error || 'Nước đi không hợp lệ!');
      }
      return;
    }

    if (isCurrentPlayerPiece) {
      const legalMoves = this.engine.getLegalMoves(pos);
      this.renderer.setSelected(pos, legalMoves);
      sound.playMove();
      this.renderBoard();
      return;
    }

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
