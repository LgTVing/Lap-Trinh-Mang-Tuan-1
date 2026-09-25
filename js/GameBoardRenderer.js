/**
 * GameBoardRenderer
 * Quản lý vẽ và tương tác trên bàn cờ 9x9 với giao diện hiện đại, animation và SVG icons.
 */

import { BOARD_SIZE, COLS, ROWS, PIECE_TYPES, PLAYERS, TARGET_SQUARES, BEATS } from './constants.js';
import { sound } from './audio.js';

export class GameBoardRenderer {
  constructor(containerEl, { onSquareClick, compact = false, readOnly = false } = {}) {
    this.container = containerEl;
    this.onSquareClick = onSquareClick || (() => {});
    this.compact = compact;
    this.readOnly = readOnly;
    this.selectedPos = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.viewAs = PLAYERS.P1; // Góc nhìn bàn cờ (P1: hàng 1 ở dưới, P2: lật ngược nếu muốn)
  }

  setView(player) {
    this.viewAs = player;
  }

  setLastMove(move) {
    this.lastMove = move ? { from: move.from, to: move.to } : null;
  }

  setSelected(pos, legalMoves = []) {
    this.selectedPos = pos;
    this.legalMoves = legalMoves;
  }

  clearSelection() {
    this.selectedPos = null;
    this.legalMoves = [];
  }

  /**
   * Trả về icon biểu trưng cho từng loại quân
   */
  static getPieceIcon(type) {
    switch (type) {
      case PIECE_TYPES.ROCK:
        return '✊';
      case PIECE_TYPES.PAPER:
        return '✋';
      case PIECE_TYPES.SCISSORS:
        return '✌️';
      default:
        return '?';
    }
  }

  static getPieceLabel(type) {
    switch (type) {
      case PIECE_TYPES.ROCK:
        return 'ĐẤM';
      case PIECE_TYPES.PAPER:
        return 'LÁ';
      case PIECE_TYPES.SCISSORS:
        return 'KÉO';
      default:
        return '';
    }
  }

  /**
   * Render toàn bộ bàn cờ 9x9
   */
  render(board, myPlayerRole, isMyTurn) {
    this.container.innerHTML = '';

    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'board-wrapper' + (this.compact ? ' compact-board' : '') + (this.readOnly ? ' board-readonly' : '');

    // Grid 9x9
    const gridEl = document.createElement('div');
    gridEl.className = 'board-grid';

    // Vẽ từ hàng 9 xuống hàng 1 (nếu là P1) hoặc hàng 1 lên 9 (nếu là P2)
    const rowOrder = (this.viewAs === PLAYERS.P2) ? [...ROWS] : [...ROWS].reverse();
    const colOrder = (this.viewAs === PLAYERS.P2) ? [...COLS].reverse() : [...COLS];

    for (let rIndex = 0; rIndex < rowOrder.length; rIndex++) {
      const row = rowOrder[rIndex];

      for (let cIndex = 0; cIndex < colOrder.length; cIndex++) {
        const col = colOrder[cIndex];
        const pos = `${col}${row}`;
        const piece = board[pos];

        const squareEl = document.createElement('div');
        squareEl.className = 'board-square';
        squareEl.dataset.pos = pos;

        // Màu so le bàn cờ
        const isDark = (colOrder.indexOf(col) + row) % 2 === 0;
        squareEl.classList.add(isDark ? 'square-dark' : 'square-light');

        // Đánh dấu ô đích
        if (pos === TARGET_SQUARES.P1) {
          squareEl.classList.add('target-square', 'target-p1');
          const badge = document.createElement('div');
          badge.className = 'target-badge p1-badge';
          badge.title = 'Ô đích chiến thắng của Người chơi 1';
          badge.innerHTML = '🏁 i9 (P1)';
          squareEl.appendChild(badge);
        } else if (pos === TARGET_SQUARES.P2) {
          squareEl.classList.add('target-square', 'target-p2');
          const badge = document.createElement('div');
          badge.className = 'target-badge p2-badge';
          badge.title = 'Ô đích chiến thắng của Người chơi 2';
          badge.innerHTML = '🏁 a1 (P2)';
          squareEl.appendChild(badge);
        }

        // Tọa độ góc ô
        if (cIndex === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'coord-label rank-label';
          rankLabel.textContent = row;
          squareEl.appendChild(rankLabel);
        }
        if (rIndex === rowOrder.length - 1) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'coord-label file-label';
          fileLabel.textContent = col;
          squareEl.appendChild(fileLabel);
        }

        // Highlight nước đi trước
        if (this.lastMove && (this.lastMove.from === pos || this.lastMove.to === pos)) {
          squareEl.classList.add('last-move-highlight');
        }

        // Highlight ô đang chọn
        if (this.selectedPos === pos) {
          squareEl.classList.add('selected-square');
        }

        // Highlight các ô có thể đi tới
        if (this.legalMoves.includes(pos)) {
          squareEl.classList.add('legal-move-square');
          const indicator = document.createElement('div');
          if (piece && piece.player !== myPlayerRole) {
            indicator.className = 'capture-indicator';
            indicator.title = 'Ăn quân!';
          } else {
            indicator.className = 'move-indicator';
          }
          squareEl.appendChild(indicator);
        }

        // Render quân cờ
        if (piece && piece.alive) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `piece piece-${piece.player.toLowerCase()} piece-type-${piece.type.toLowerCase()}`;
          pieceEl.dataset.id = piece.id;

          const isMyPiece = (piece.player === myPlayerRole);
          if (isMyPiece && isMyTurn) {
            pieceEl.classList.add('piece-interactive');
          }

          const iconSpan = document.createElement('span');
          iconSpan.className = 'piece-icon';
          iconSpan.textContent = GameBoardRenderer.getPieceIcon(piece.type);

          const labelSpan = document.createElement('span');
          labelSpan.className = 'piece-type-label';
          labelSpan.textContent = GameBoardRenderer.getPieceLabel(piece.type);

          pieceEl.appendChild(iconSpan);
          pieceEl.appendChild(labelSpan);
          squareEl.appendChild(pieceEl);
        }

        // Xử lý click ô (nếu không phải chế độ chỉ xem)
        if (!this.readOnly) {
          squareEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onSquareClick(pos);
          });
        }

        gridEl.appendChild(squareEl);
      }
    }

    boardWrapper.appendChild(gridEl);
    this.container.appendChild(boardWrapper);
  }
}
