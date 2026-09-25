/**
 * Multiplayer Manager utilizing playhtml.fun
 * Quản lý kết nối, phòng chờ (Waiting Room), đồng bộ nước đi và xử lý hòa cờ qua CDN PartyKit
 */

let playhtmlModule = null;
let resetPlayHTMLFn = null;

async function loadPlayhtml() {
  if (playhtmlModule) {
    return { playhtml: playhtmlModule, resetPlayHTML: resetPlayHTMLFn };
  }
  try {
    const mod = await import('https://unpkg.com/playhtml');
    playhtmlModule = mod.playhtml;
    resetPlayHTMLFn = mod.resetPlayHTML;
    return { playhtml: playhtmlModule, resetPlayHTML: resetPlayHTMLFn };
  } catch (err) {
    console.warn('Không thể kết nối CDN playhtml, chạy ở chế độ Offline:', err);
    return null;
  }
}

export class MultiplayerManager {
  constructor({ onRoomUpdate, onGameUpdate, onDrawOffer, onError }) {
    this.onRoomUpdate = onRoomUpdate || (() => {});
    this.onGameUpdate = onGameUpdate || (() => {});
    this.onDrawOffer = onDrawOffer || (() => {});
    this.onError = onError || (() => {});

    this.playhtml = null;
    this.roomCode = null;
    this.myRole = null; // 'P1' (Host) hoặc 'P2' (Guest)
    this.isHost = false;
    this.channel = null;
    this.roomData = null;
    this.isConnected = false;
  }

  static generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Khởi tạo phòng với vai trò Host (P1)
   */
  async createRoom(roomCode, settings, userProfile = null) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.myRole = 'P1';
    this.isHost = true;

    const p1Name = userProfile ? userProfile.displayName : 'Người chơi 1';
    const p1Role = userProfile ? userProfile.role : 'guest';
    const p1Rating = userProfile ? userProfile.rating : 1000;

    const initialData = {
      roomCode: this.roomCode,
      phase: 'WAITING', // 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED'
      p1: { id: 'P1', name: p1Name, role: p1Role, rating: p1Rating, ready: false, present: true },
      p2: { id: 'P2', name: 'Người chơi 2', role: 'guest', rating: 1000, ready: false, present: false },
      settings: settings,
      gameState: null,
      lastMove: null,
      drawOffer: null,
      timestamp: Date.now()
    };

    return await this.connectChannel(this.roomCode, initialData);
  }

  /**
   * Tham gia phòng với vai trò Guest (P2)
   */
  async joinRoom(roomCode, userProfile = null) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.myRole = 'P2';
    this.isHost = false;

    const p2Name = userProfile ? userProfile.displayName : 'Người chơi 2';
    const p2Role = userProfile ? userProfile.role : 'guest';
    const p2Rating = userProfile ? userProfile.rating : 1000;

    // Guest kết nối vào channel với mẫu mặc định { dataStr: '' }
    const ok = await this.connectChannel(this.roomCode, null);
    if (!ok) return false;

    // Đánh dấu P2 đã vào phòng
    if (this.roomData) {
      this.roomData.p2.present = true;
      this.roomData.p2.name = p2Name;
      this.roomData.p2.role = p2Role;
      this.roomData.p2.rating = p2Rating;
      this.broadcastRoomData(this.roomData);
    } else {
      // Trường hợp roomData chưa kịp nạp, phát tín hiệu P2 tham gia
      this.broadcastRoomData({
        roomCode: this.roomCode,
        phase: 'WAITING',
        p1: { id: 'P1', name: 'Người chơi 1', role: 'guest', rating: 1000, ready: false, present: true },
        p2: { id: 'P2', name: p2Name, role: p2Role, rating: p2Rating, ready: false, present: true },
        drawOffer: null,
        timestamp: Date.now()
      });
    }

    return true;
  }

  /**
   * Kết nối vào PartyKit qua playhtml
   */
  async connectChannel(roomCode, initialPayload = null) {
    const libs = await loadPlayhtml();
    if (!libs || !libs.playhtml) {
      this.onError('Không tải được thư viện playhtml.');
      return false;
    }
    this.playhtml = libs.playhtml;

    try {
      if (typeof libs.resetPlayHTML === 'function') {
        try { libs.resetPlayHTML(); } catch (e) {}
      }

      // Đảm bảo tên phòng thống nhất tuyệt đối
      const roomIdentifier = `ottv2_arena_${roomCode}`;

      // Tắt triệt để con trỏ chuột live cursor của cả hai người chơi trên màn hình
      await this.playhtml.init({
        room: roomIdentifier,
        cursors: false
      });

      // Để tránh Yjs CRDT deep-diffing bug khi gửi object sâu (81 ô bàn cờ),
      // ta bọc payload dạng chuỗi JSON `dataStr` trong 1 Y.Map cố định { dataStr: '' }.
      // Điều này đảm bảo 100% observeDeep luôn kích hoạt trên mọi trình duyệt!
      const defaultState = {
        dataStr: initialPayload ? JSON.stringify(initialPayload) : ''
      };

      this.channel = this.playhtml.createPageData(`channel_${roomCode}`, defaultState);

      // Đọc dữ liệu hiện tại ngay khi kết nối
      const current = this.channel.getData();
      if (current && current.dataStr) {
        try {
          this.handleIncomingData(JSON.parse(current.dataStr));
        } catch (e) {}
      }

      // Lắng nghe cập nhật realtime từ đối thủ
      this.channel.onUpdate((val) => {
        if (val && val.dataStr) {
          try {
            const parsed = JSON.parse(val.dataStr);
            this.handleIncomingData(parsed);
          } catch (e) {
            console.warn('Lỗi phân tích gói tin realtime:', e);
          }
        }
      });

      this.isConnected = true;
      return true;
    } catch (e) {
      console.error('Lỗi kết nối phòng multiplayer:', e);
      this.onError('Lỗi kết nối phòng mạng: ' + e.message);
      return false;
    }
  }

  handleIncomingData(data) {
    if (!data) return;
    this.roomData = data;

    // Thông báo cập nhật phòng chờ
    this.onRoomUpdate(data);

    // Lắng nghe cập nhật lời mời hòa cờ
    if (data.drawOffer && this.onDrawOffer) {
      this.onDrawOffer(data.drawOffer);
    }

    // Nếu đang trong game và có gameState mới
    if (data.gameState && (data.phase === 'PLAYING' || data.phase === 'FINISHED')) {
      this.onGameUpdate(data.gameState, data.lastMove);
    }
  }

  broadcastRoomData(data) {
    if (!this.channel || !this.isConnected) return;
    try {
      this.roomData = { ...data, timestamp: Date.now() };
      this.channel.setData({
        dataStr: JSON.stringify(this.roomData)
      });
    } catch (e) {
      console.warn('Lỗi broadcastRoomData:', e);
    }
  }

  /**
   * Thay đổi trạng thái Sẵn sàng của người chơi hiện tại
   */
  setReady(isReady) {
    if (!this.roomData) return;
    const key = (this.myRole === 'P1') ? 'p1' : 'p2';
    this.roomData[key].ready = isReady;
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Bắt đầu ván đấu (Chủ phòng kích hoạt khi cả 2 sẵn sàng)
   */
  startGame(initialGameState) {
    if (!this.roomData) return;
    this.roomData.phase = 'PLAYING';
    this.roomData.gameState = initialGameState;
    this.roomData.lastMove = null;
    this.roomData.drawOffer = null;
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Phát đi nước đi mới
   */
  sendMove(newGameState, moveRecord) {
    if (!this.roomData) return;
    this.roomData.phase = newGameState.status; // 'PLAYING' hoặc 'FINISHED'
    this.roomData.gameState = newGameState;
    this.roomData.lastMove = moveRecord;
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Gửi lời mời hòa cờ
   */
  sendDrawOffer() {
    if (!this.roomData) return;
    this.roomData.drawOffer = {
      from: this.myRole,
      status: 'PENDING',
      timestamp: Date.now()
    };
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Phản hồi lời mời hòa cờ (Đồng ý hoặc Từ chối)
   */
  respondDrawOffer(accept, finishedGameState = null) {
    if (!this.roomData) return;
    if (accept) {
      this.roomData.phase = 'FINISHED';
      if (finishedGameState) {
        this.roomData.gameState = finishedGameState;
      }
      this.roomData.drawOffer = {
        from: this.myRole,
        status: 'ACCEPTED',
        timestamp: Date.now()
      };
    } else {
      this.roomData.drawOffer = {
        from: this.myRole,
        status: 'DECLINED',
        timestamp: Date.now()
      };
    }
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Đầu hàng
   */
  sendResign(newGameState) {
    if (!this.roomData) return;
    this.roomData.phase = 'FINISHED';
    this.roomData.gameState = newGameState;
    this.broadcastRoomData(this.roomData);
  }

  /**
   * Chơi lại (Reset về ván mới)
   */
  sendRematch(newGameState) {
    if (!this.roomData) return;
    this.roomData.phase = 'PLAYING';
    this.roomData.p1.ready = true;
    this.roomData.p2.ready = true;
    this.roomData.gameState = newGameState;
    this.roomData.lastMove = null;
    this.roomData.drawOffer = null;
    this.broadcastRoomData(this.roomData);
  }

  disconnect() {
    if (this.channel) {
      try {
        if (this.roomData) {
          const key = (this.myRole === 'P1') ? 'p1' : 'p2';
          if (this.roomData[key]) this.roomData[key].present = false;
          this.channel.setData({ dataStr: JSON.stringify(this.roomData) });
        }
        this.channel.destroy();
      } catch (e) {}
      this.channel = null;
    }
    this.isConnected = false;
    this.roomCode = null;
    this.myRole = null;
    this.roomData = null;
  }
}
