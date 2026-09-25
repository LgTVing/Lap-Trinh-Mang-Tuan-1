/**
 * Settings Manager & Persistence (localStorage & playhtml sync)
 * Giúp lưu trữ cấu hình trận đấu cho các lần chơi sau (theo gợi ý của giảng viên)
 */

import { DEFAULT_SETTINGS } from './constants.js';

const STORAGE_KEY = 'ottv2_user_settings';

export class SettingsManager {
  static getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Không thể đọc settings từ localStorage:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(settings) {
    try {
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.warn('Không thể lưu settings vào localStorage:', e);
    }
    return settings;
  }

  static getPresets() {
    return {
      blitz: {
        name: 'Chớp nhoáng (3 phút)',
        playerTime: 180,
        moveTime: 15,
        enableThreefoldRepetition: true,
        enableFiftyMoveRule: true
      },
      rapid: {
        name: 'Nhanh (5 phút)',
        playerTime: 300,
        moveTime: 30,
        enableThreefoldRepetition: true,
        enableFiftyMoveRule: true
      },
      classic: {
        name: 'Cổ điển (10 phút - Mặc định)',
        playerTime: 600,
        moveTime: null,
        enableThreefoldRepetition: true,
        enableFiftyMoveRule: true
      },
      deep: {
        name: 'Chiến thuật sâu (15 phút)',
        playerTime: 900,
        moveTime: null,
        enableThreefoldRepetition: true,
        enableFiftyMoveRule: true
      }
    };
  }
}
