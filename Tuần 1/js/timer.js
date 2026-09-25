/**
 * OTTv2 Game Timer (Chess Clock & Move Timer)
 */

export class GameTimer {
  constructor({ onTick, onTimeout }) {
    this.onTick = onTick || (() => {});
    this.onTimeout = onTimeout || (() => {});
    this.intervalId = null;
    this.currentPlayer = null;
    this.timers = { P1: 600, P2: 600 };
    this.moveTimeLimit = null; // Giây tối đa mỗi nước (nếu bật)
    this.currentMoveTime = 0;
    this.isRunning = false;
  }

  setTimers(timers, moveTimeLimit = null) {
    this.timers = { ...timers };
    this.moveTimeLimit = moveTimeLimit;
    this.currentMoveTime = 0;
  }

  start(player) {
    this.currentPlayer = player;
    this.currentMoveTime = 0;
    this.isRunning = true;

    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      if (!this.isRunning || !this.currentPlayer) return;

      this.timers[this.currentPlayer] = Math.max(0, this.timers[this.currentPlayer] - 1);
      if (this.moveTimeLimit) {
        this.currentMoveTime++;
      }

      this.onTick({
        timers: { ...this.timers },
        currentPlayer: this.currentPlayer,
        moveTime: this.currentMoveTime,
        moveTimeLimit: this.moveTimeLimit
      });

      // Kiểm tra timeout tổng
      if (this.timers[this.currentPlayer] <= 0) {
        this.stop();
        this.onTimeout(this.currentPlayer, 'TOTAL_TIMEOUT');
        return;
      }

      // Kiểm tra timeout mỗi nước
      if (this.moveTimeLimit && this.currentMoveTime >= this.moveTimeLimit) {
        this.stop();
        this.onTimeout(this.currentPlayer, 'MOVE_TIMEOUT');
        return;
      }
    }, 1000);
  }

  switchPlayer(nextPlayer) {
    this.currentPlayer = nextPlayer;
    this.currentMoveTime = 0;
    this.onTick({
      timers: { ...this.timers },
      currentPlayer: this.currentPlayer,
      moveTime: this.currentMoveTime,
      moveTimeLimit: this.moveTimeLimit
    });
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
