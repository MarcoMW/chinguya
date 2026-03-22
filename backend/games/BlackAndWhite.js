const Game = require('../Game');

class BlackAndWhite extends Game {
  constructor(room, io) {
    super(room, io);
    this.p1 = room.players[0].id;
    this.p2 = room.players[1].id;
    
    this.state = {
      players: {
        [this.p1]: { score: 0, tiles: this.shuffle([0,1,2,3,4,5,6,7,8]), playedThisRound: null, winOrder: -1 },
        [this.p2]: { score: 0, tiles: this.shuffle([0,1,2,3,4,5,6,7,8]), playedThisRound: null, winOrder: -1 }
      },
      round: 1,
      turn: this.p1,
      firstPlayerLastRound: null,
      roundWinner: null,
      phase: 'setup', // 'setup' | 'playing' | 'resolving'
      history: []
    };
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getMaskedState(viewerId) {
    const masked = JSON.parse(JSON.stringify(this.state));
    for (const [pId, pData] of Object.entries(masked.players)) {
      // Mask unplayed tiles
      if (pId !== viewerId) {
        pData.tiles = pData.tiles.map(t => ({ color: t % 2 === 0 ? 'black' : 'white' }));
      } else {
        pData.tiles = pData.tiles.map(t => ({ value: t, color: t % 2 === 0 ? 'black' : 'white' }));
      }
      
      // Mask the played tile for the round
      if (pData.playedThisRound !== null) {
        if (pId !== viewerId && this.status !== 'ended') {
          const val = pData.playedThisRound;
          pData.playedThisRound = { color: val % 2 === 0 ? 'black' : 'white', hidden: true };
        } else {
          const val = pData.playedThisRound;
          pData.playedThisRound = { value: val, color: val % 2 === 0 ? 'black' : 'white' };
        }
      }
    }
    
    // Completely hide history ledger mid-match to prevent cheating
    if (this.status !== 'ended') {
      masked.history = [];
    }
    masked.p1 = this.p1;
    masked.p2 = this.p2;
    return masked;
  }

  handleMove(playerId, moveData) {
    if (this.state.phase === 'setup') {
      if (playerId !== this.p1) throw new Error("Only P1 can choose the starting player");
      if (moveData.action === 'choose_first_player') {
         let starter = moveData.value;
         if (starter === 'random') starter = Math.random() < 0.5 ? this.p1 : this.p2;
         
         this.state.turn = starter;
         this.state.firstPlayerLastRound = starter;
         this.state.phase = 'playing';
         this.broadcastState();
         return;
      }
    }

    if (this.state.phase !== 'playing') return;
    if (this.state.turn !== playerId) throw new Error("Not your turn");
    
    if (moveData.action === 'play_tile') {
      const val = moveData.value;
      const pData = this.state.players[playerId];
      
      if (!pData.tiles.includes(val)) throw new Error("Tile not found in hand");

      pData.tiles = pData.tiles.filter(t => t !== val);
      pData.playedThisRound = val;

      const otherId = playerId === this.p1 ? this.p2 : this.p1;
      if (this.state.players[otherId].playedThisRound !== null) {
        // Both players have played, resolve round
        this.state.phase = 'resolving';
        this.resolveRound();
      } else {
        // Pass turn
        this.state.turn = otherId;
        this.broadcastState();
      }
    }
  }

  resolveRound() {
    const v1 = this.state.players[this.p1].playedThisRound;
    const v2 = this.state.players[this.p2].playedThisRound;
    
    if (v1 > v2) {
      this.state.players[this.p1].score++;
      this.state.turn = this.p1; // Winner goes first next round
      this.state.firstPlayerLastRound = this.p1;
      this.state.roundWinner = this.p1;
      this.state.players[this.p1].winOrder = this.state.round;
    } else if (v2 > v1) {
      this.state.players[this.p2].score++;
      this.state.turn = this.p2;
      this.state.firstPlayerLastRound = this.p2;
      this.state.roundWinner = this.p2;
      this.state.players[this.p2].winOrder = this.state.round;
    } else {
      // Tie -> The player who went second in previous round goes first
      const wentSecond = this.state.firstPlayerLastRound === this.p1 ? this.p2 : this.p1;
      this.state.turn = wentSecond;
      this.state.firstPlayerLastRound = wentSecond;
      this.state.roundWinner = 'tie';
    }

    this.state.history.push({
      round: this.state.round,
      p1Tile: v1,
      p2Tile: v2,
      winnerId: this.state.roundWinner === 'tie' ? null : this.state.roundWinner
    });

    if (this.state.round === 9) {
      this.state.matchWinner = this.computeMatchWinner();
    }

    this.broadcastState();

    setTimeout(() => {
      this.state.players[this.p1].playedThisRound = null;
      this.state.players[this.p2].playedThisRound = null;
      this.state.roundWinner = null;
      
      if (this.state.round === 9) {
        this.calculateWinner();
      } else {
        this.state.round++;
        this.state.phase = 'playing';
        this.broadcastState();
      }
    }, 4500); // 4.5 seconds to examine the result
  }
  
  computeMatchWinner() {
    const score1 = this.state.players[this.p1].score;
    const score2 = this.state.players[this.p2].score;
    if (score1 > score2) return this.p1;
    if (score2 > score1) return this.p2;
    if (score1 > 0) {
      if (this.state.players[this.p1].winOrder < this.state.players[this.p2].winOrder) return this.p1;
      else return this.p2;
    }
    return 'draw';
  }

  calculateWinner() {
    const winner = this.computeMatchWinner();
    const reason = winner === 'draw' ? 'The game is a 0-0 draw.' : 'Determined by points/tie-breakers.';
    this.endGame(winner, reason);
  }
}

module.exports = BlackAndWhite;
