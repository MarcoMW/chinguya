const Game = require('../Game');

class BlackHole extends Game {
  constructor(room, io) {
    super(room, io);
    this.p1 = room.players[0].id;
    this.p2 = room.players[1].id;
    
    const firstPlayer = Math.random() < 0.5 ? this.p1 : this.p2;
    this.state = {
      players: {
        [this.p1]: { color: 'red', unplayed: [1,2,3,4,5,6,7,8,9,10] },
        [this.p2]: { color: 'blue', unplayed: [1,2,3,4,5,6,7,8,9,10] }
      },
      grid: Array(6).fill(null).map((_, r) => Array(6 - r).fill(null)),
      turnCount: 0,
      turn: firstPlayer,
      phase: 'playing',
      blackHoleResolving: false,
      resultText: null
    };
  }

  handleMove(playerId, moveData) {
    if (this.state.phase !== 'playing') return;
    if (this.state.turn !== playerId) throw new Error("Not your turn");
    if (moveData.action === 'place_piece') {
       const { r, c } = moveData;
       if (this.state.grid[r] === undefined || this.state.grid[r][c] === undefined) throw new Error("Invalid pos");
       if (this.state.grid[r][c] !== null) throw new Error("Space occupied");
       
       const val = this.state.players[playerId].unplayed.shift();
       this.state.grid[r][c] = { value: val, owner: playerId };
       this.state.turnCount++;

       if (this.state.turnCount >= 20) {
           this.state.phase = 'resolving';
           this.resolveGame();
       } else {
           this.state.turn = this.state.turn === this.p1 ? this.p2 : this.p1;
           this.broadcastState();
       }
    }
  }

  resolveGame() {
    this.state.blackHoleResolving = true;
    this.broadcastState();

    // Small delay to let the frontend visually acknowledge the final piece placed
    setTimeout(() => {
        let emptyR = -1;
        let emptyC = -1;
        for (let r = 0; r < 6; r++) {
           for (let c = 0; c < 6 - r; c++) {
              if (this.state.grid[r][c] === null) {
                  emptyR = r; emptyC = c;
              }
           }
        }
        
        const neighbors = this.getNeighbors(emptyR, emptyC);
        
        const p1Pieces = [];
        const p2Pieces = [];
        
        for (const { r, c } of neighbors) {
           const piece = this.state.grid[r][c];
           if (piece) {
               if (piece.owner === this.p1) p1Pieces.push(piece.value);
               else if (piece.owner === this.p2) p2Pieces.push(piece.value);
           }
        }
        
        const p1Sum = p1Pieces.reduce((a, b) => a + b, 0);
        const p2Sum = p2Pieces.reduce((a, b) => a + b, 0);
        
        let loser = null;
        if (p1Sum > p2Sum) loser = this.p1;
        else if (p2Sum > p1Sum) loser = this.p2;
        else {
           // Extreme Tie-breaker
           p1Pieces.sort((a,b) => b - a);
           p2Pieces.sort((a,b) => b - a);
           const maxLen = Math.max(p1Pieces.length, p2Pieces.length);
           for (let i = 0; i < maxLen; i++) {
               const v1 = p1Pieces[i] || 0;
               const v2 = p2Pieces[i] || 0;
               if (v1 > v2) { loser = this.p1; break; }
               if (v2 > v1) { loser = this.p2; break; }
           }
        }
        
        const winner = loser === null ? 'draw' : (loser === this.p1 ? this.p2 : this.p1);
        let reason = `P1 Sum: ${p1Sum}, P2 Sum: ${p2Sum}.`;
        if (loser !== null) {
            reason += p1Sum === p2Sum ? ' Loss assessed due to highest relative piece values adjacent to hole.' : '';
        } else {
            reason = 'A perfect mirror draw!';
        }

        this.state.resultText = reason;
        this.broadcastState();

        setTimeout(() => {
            this.endGame(winner, reason);
        }, 5000); // 5 sec to examine who lost tiles in the black hole array output
    }, 1500);
  }

  getNeighbors(r, c) {
    const list = [];
    const dirs = [
       [0, -1], [0, 1],   // Left, Right 
       [-1, 0], [-1, 1],  // TopLeft, TopRight
       [1, -1], [1, 0]    // BottomLeft, BottomRight
    ];
    for (const [dr, dc] of dirs) {
       const nr = r + dr;
       const nc = c + dc;
       if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6 - nr) {
           list.push({r: nr, c: nc});
       }
    }
    return list;
  }
}

module.exports = BlackHole;
