const Game = require('../Game');

class ArmsLength extends Game {
  constructor(room, io, options = {}) {
    super(room, io, options);
    
    this.p1 = room.players[0].id;
    this.p2 = room.players[1].id;
    
    const board = [];
    for (let r = 0; r <= 9; r++) {
       board.push(Array(10).fill(0));
    }
    
    // Pick first player based on options
    let firstPlayer = this.p1;
    if (options.firstPlayer === this.p2) {
      firstPlayer = this.p2;
    } else if (options.firstPlayer === 'random' || !options.firstPlayer) {
      firstPlayer = Math.random() < 0.5 ? this.p1 : this.p2;
    }

    this.state = {
      p1: this.p1,
      p2: this.p2,
      phase: 'playing',
      turn: firstPlayer,
      board: board,
      redKnockedOff: 0,
      blueKnockedOff: 0,
      lastMove: null
    };


  }

  handleMove(socketId, moveData) {
    if (this.state.phase !== 'playing') return;
    if (this.status !== 'playing') return;
    if (this.state.turn !== socketId) return;

    const { row, col } = moveData; // expected 1 to 8

    if (row < 1 || row > 8 || col < 1 || col > 8) return;
    if (this.state.board[row][col] !== 0) return;

    const myPiece = socketId === this.p1 ? 1 : 2;
    
    // Place stone
    this.state.board[row][col] = myPiece;
    
    // Determine pushes
    const pushes = [];
    const dirs = [
      [-1, -1], [-1,  0], [-1,  1],
      [ 0, -1],           [ 0,  1],
      [ 1, -1], [ 1,  0], [ 1,  1]
    ];
    
    for (const [dr, dc] of dirs) {
      const adjR = row + dr;
      const adjC = col + dc;
      if (adjR >= 1 && adjR <= 8 && adjC >= 1 && adjC <= 8) {
        if (this.state.board[adjR][adjC] !== 0) {
           const piece = this.state.board[adjR][adjC];
           const pushR = row + 2 * dr;
           const pushC = col + 2 * dc;
           // Only pushed if space is empty (0)
           if (this.state.board[pushR][pushC] === 0) {
             pushes.push({ fromR: adjR, fromC: adjC, toR: pushR, toC: pushC, piece });
           }
        }
      }
    }
    
    // Execute pushes
    for (const p of pushes) {
      this.state.board[p.fromR][p.fromC] = 0;
    }
    for (const p of pushes) {
      if (p.toR === 0 || p.toR === 9 || p.toC === 0 || p.toC === 9) {
        if (p.piece === 1) this.state.redKnockedOff++;
        else if (p.piece === 2) this.state.blueKnockedOff++;
      } else {
        this.state.board[p.toR][p.toC] = p.piece;
      }
    }

    this.state.lastMove = { row, col };
    
    // Check Win Conditions
    const checkWin = (board, piece) => {
      for (let r = 1; r <= 8; r++) {
        for (let c = 1; c <= 8; c++) {
          if (board[r][c] !== piece) continue;
          if (c <= 5 && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) return true;
          if (r <= 5 && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) return true;
          if (r <= 5 && c <= 5 && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) return true;
          if (r <= 5 && c >= 4 && board[r+1][c-1] === piece && board[r+2][c-2] === piece && board[r+3][c-3] === piece) return true;
        }
      }
      return false;
    };
    
    const p1Lines = checkWin(this.state.board, 1);
    const p2Lines = checkWin(this.state.board, 2);
    const p1Knockout = this.state.blueKnockedOff >= 10;
    const p2Knockout = this.state.redKnockedOff >= 10;
    
    let winner = null;
    let reason = "Win condition met.";
    
    if (p1Lines && p2Lines) {
        winner = socketId === this.p1 ? this.p2 : this.p1;
        reason = "Both formed 4-in-a-row. Moving player loses.";
    } else if (p1Lines) {
        winner = this.p1;
        reason = "4-in-a-row formed.";
    } else if (p2Lines) {
        winner = this.p2;
        reason = "4-in-a-row formed.";
    } else if (p1Knockout && p2Knockout) {
        winner = socketId === this.p1 ? this.p2 : this.p1;
        reason = "Both reached 10 knockouts. Moving player loses.";
    } else if (p1Knockout) {
        winner = this.p1;
        reason = "Knocked off 10 opponent's stones.";
    } else if (p2Knockout) {
        winner = this.p2;
        reason = "Knocked off 10 opponent's stones.";
    }

    if (winner) {
        this.state.turn = null;
        this.broadcastState();
        this.endGame(winner, reason);
        return;
    }
    
    // Check draw
    let isFull = true;
    for (let r = 1; r <= 8; r++) {
       for (let c = 1; c <= 8; c++) {
          if (this.state.board[r][c] === 0) isFull = false;
       }
    }
    if (isFull) {
        this.state.turn = null;
        this.broadcastState();
        this.endGame('draw', 'Board is completely full and no win condition was met.');
        return;
    }

    // Switch turn
    this.state.turn = socketId === this.p1 ? this.p2 : this.p1;
    this.switchTurn();
    this.broadcastState();
  }
}

module.exports = ArmsLength;
