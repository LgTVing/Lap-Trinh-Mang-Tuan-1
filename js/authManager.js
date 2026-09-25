/**
 * Auth Manager
 * Quản lý xác thực người dùng (Đăng nhập / Chế độ Khách / Phân quyền Pro Player & Player)
 */

export const USER_ROLES = {
  GUEST: 'guest',
  PLAYER: 'player',
  PRO_PLAYER: 'pro_player',
  ADMIN: 'admin'
};

const DEFAULT_GUEST_USER = {
  username: 'guest',
  displayName: 'Khách (Guest)',
  role: USER_ROLES.GUEST,
  rating: 1000,
  title: 'Người chơi Tự do'
};

export class AuthManager {
  constructor() {
    this.accounts = [];
    this.currentUser = null;
    this.storageKey = 'ottv2_current_user';
  }

  async init() {
    await this.loadAccounts();
    this.restoreSession();
  }

  /**
   * Tải danh sách 20 tài khoản từ /data/accounts.json
   * Kèm danh sách fallback dự phòng đảm bảo chạy 100% offline
   */
  async loadAccounts() {
    try {
      const res = await fetch('/data/accounts.json');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.accounts)) {
          this.accounts = data.accounts;
          return;
        }
      }
    } catch (e) {
      console.warn('Không thể fetch /data/accounts.json, sử dụng fallback database in-memory:', e);
    }

    // Fallback database nếu không fetch được file
    this.accounts = [
      { username: 'pro_faker', password: 'pro_password123', displayName: 'Lee Sang-hyeok (Faker)', role: USER_ROLES.PRO_PLAYER, rating: 2850, title: 'Huyền thoại Bất tử (Legend)' },
      { username: 'pro_magnus', password: 'pro_password123', displayName: 'Magnus Carlsen', role: USER_ROLES.PRO_PLAYER, rating: 2882, title: 'Đại kiện tướng Thế giới' },
      { username: 'pro_hikaru', password: 'pro_password123', displayName: 'Hikaru Nakamura', role: USER_ROLES.PRO_PLAYER, rating: 2835, title: 'Bậc thầy Cờ chớp' },
      { username: 'pro_viper', password: 'pro_password123', displayName: 'TheViper (AoE Master)', role: USER_ROLES.PRO_PLAYER, rating: 2680, title: 'Chiến thuật gia Đỉnh cao' },
      { username: 'pro_s1mple', password: 'pro_password123', displayName: 'Oleksandr Kostyliev (s1mple)', role: USER_ROLES.PRO_PLAYER, rating: 2720, title: 'Xạ thủ Tối thượng' },
      { username: 'pro_flash', password: 'pro_password123', displayName: 'Lee Young-ho (Flash)', role: USER_ROLES.PRO_PLAYER, rating: 2890, title: 'Thần Rồng Tối cao' },
      { username: 'pro_chovy', password: 'pro_password123', displayName: 'Jeong Ji-hoon (Chovy)', role: USER_ROLES.PRO_PLAYER, rating: 2760, title: 'Vua Đi Đường' },
      { username: 'pro_dendi', password: 'pro_password123', displayName: 'Danil Ishutin (Dendi)', role: USER_ROLES.PRO_PLAYER, rating: 2610, title: 'Thần Kéo Trái Tim' },
      { username: 'player_nam', password: 'user_password123', displayName: 'Nguyễn Hoàng Nam', role: USER_ROLES.PLAYER, rating: 1420, title: 'Kỳ thủ Tân binh' },
      { username: 'player_linh', password: 'user_password123', displayName: 'Trần Thùy Linh', role: USER_ROLES.PLAYER, rating: 1540, title: 'Kỳ thủ Tập sự' },
      { username: 'player_minh', password: 'user_password123', displayName: 'Vũ Bình Minh', role: USER_ROLES.PLAYER, rating: 1390, title: 'Kỳ thủ Nghiệp dư' },
      { username: 'player_anh', password: 'user_password123', displayName: 'Đỗ Tuấn Anh', role: USER_ROLES.PLAYER, rating: 1490, title: 'Kỳ thủ Tân binh' },
      { username: 'player_hoang', password: 'user_password123', displayName: 'Phạm Huy Hoàng', role: USER_ROLES.PLAYER, rating: 1350, title: 'Kỳ thủ Nghiệp dư' },
      { username: 'player_tuan', password: 'user_password123', displayName: 'Lê Đức Tuấn', role: USER_ROLES.PLAYER, rating: 1460, title: 'Kỳ thủ Tân binh' },
      { username: 'player_hai', password: 'user_password123', displayName: 'Bùi Hải Đăng', role: USER_ROLES.PLAYER, rating: 1580, title: 'Kỳ thủ Tập sự' },
      { username: 'player_lan', password: 'user_password123', displayName: 'Hoàng Mai Lan', role: USER_ROLES.PLAYER, rating: 1310, title: 'Kỳ thủ Nghiệp dư' },
      { username: 'player_khoa', password: 'user_password123', displayName: 'Ngô Đăng Khoa', role: USER_ROLES.PLAYER, rating: 1475, title: 'Kỳ thủ Tân binh' },
      { username: 'player_huy', password: 'user_password123', displayName: 'Dương Quốc Huy', role: USER_ROLES.PLAYER, rating: 1380, title: 'Kỳ thủ Nghiệp dư' },
      { username: 'player_quang', password: 'user_password123', displayName: 'Đinh Nhật Quang', role: USER_ROLES.PLAYER, rating: 1440, title: 'Kỳ thủ Tân binh' },
      { username: 'player_tam', password: 'user_password123', displayName: 'Trương Thanh Tâm', role: USER_ROLES.PLAYER, rating: 1520, title: 'Kỳ thủ Tập sự' },
      { username: 'admin', password: 'admin123', displayName: 'Ban Tổ Chức (Admin)', role: USER_ROLES.ADMIN, rating: 3000, title: 'Quản Trị Viên Giải Đấu' }
    ];
  }

  restoreSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return;
      }
    } catch (e) {}
    this.currentUser = { ...DEFAULT_GUEST_USER };
  }

  /**
   * Đăng nhập với username và password
   */
  login(username, password) {
    const user = this.accounts.find(
      acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.password === password
    );

    if (!user) {
      return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    }

    this.currentUser = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      rating: user.rating,
      title: user.title
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
    } catch (e) {}

    return { success: true, user: this.currentUser };
  }

  /**
   * Chuyển sang chế độ Khách (Guest)
   */
  setGuest() {
    this.currentUser = { ...DEFAULT_GUEST_USER };
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {}
    return this.currentUser;
  }

  /**
   * Đăng xuất
   */
  logout() {
    return this.setGuest();
  }

  getCurrentUser() {
    return this.currentUser || { ...DEFAULT_GUEST_USER };
  }

  isProPlayer() {
    return this.currentUser && this.currentUser.role === USER_ROLES.PRO_PLAYER;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === USER_ROLES.ADMIN;
  }

  isGuest() {
    return !this.currentUser || this.currentUser.role === USER_ROLES.GUEST;
  }
}

export const auth = new AuthManager();
