class Game {
  constructor(room, io, options = {}) {
    this.room = room;
    this.io = io;
    this.options = options;
    this.state = {};
    this.status = 'playing'; // 'playing' | 'ended'

    // Timers Implementation
    this.timers = {};
    if (room.players.length === 2) {
      this.timers[room.players[0].id] = { main: 60, reserve: 300 };
      this.timers[room.players[1].id] = { main: 60, reserve: 300 };
    }
    this.activeTurnPlayer = null;
    this.timerInterval = setInterval(() => this.tickTimers(), 1000);
  }

  tickTimers() {
    if (this.status !== 'playing' || !this.state || this.state.phase !== 'playing') return;
    
    const turn = this.state.turn;
    if (!turn || !this.timers[turn]) return;
    
    if (this.activeTurnPlayer !== turn) {
      if (this.activeTurnPlayer && this.timers[this.activeTurnPlayer]) {
        this.timers[this.activeTurnPlayer].main = 60; // Reset main timer instantly
      }
      this.activeTurnPlayer = turn;
    }

    const t = this.timers[turn];
    if (t.main > 0) t.main--;
    else if (t.reserve > 0) t.reserve--;
    else {
      // Timeout
      if (this.timerInterval) clearInterval(this.timerInterval);
      const winnerId = this.room.players.find(p => p.id !== turn)?.id;
      this.endGame(winnerId, 'Time Limit Exceeded!');
      return;
    }

    this.io.to(this.room.id).emit('timer_sync', this.timers);
  }

  // To be overridden by specific games (Black & White / Black Hole)
  handleMove(playerId, moveData) {
    console.log(`Move received from ${playerId}:`, moveData);
    // Dummy override warning
  }

  // Graceful memory clearing for forced abrupt aborts
  destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // Common End Game logic
  endGame(winnerId, reason) {
    this.destroy(); // Clear intervals
    
    this.status = 'ended';
    this.room.status = 'finished';
    
    this.io.to(this.room.id).emit('game_ended', { winnerId, reason, finalState: { ...this.state, p1: this.room.players[0].id, p2: this.room.players[1].id } });
    
    let winnerName = 'Someone';
    const player = this.room.players.find(p => p.id === winnerId);
    if(player) winnerName = player.name;
    else if(winnerId === 'draw') winnerName = 'Nobody';

    const getPublicRooms = require('./index').getPublicRooms;
    // We do NOT use sendSystemMessage natively here due to Circular requires, we emit directly:
    this.io.to(this.room.id).emit('chat_message', { 
      system: true, 
      message: `Game Over! ${reason} Winner: ${winnerName}`,
      timestamp: Date.now()
    });
    
    // Note: Memory cleanup (this.room.gameInstance = null) is deferred securely until the Host explicitly clicks "return_to_lobby", enabling postgame view!
    
    // Emit the room update
    const sanitizedRoom = {
      id: this.room.id,
      name: this.room.name,
      hasPassword: !!this.room.password,
      host: this.room.host,
      players: this.room.players,
      spectators: this.room.spectators,
      status: this.room.status,
      gameType: this.room.gameType
    };
    
    this.io.to(this.room.id).emit('room_updated', sanitizedRoom);

    // Update public lobby
    if(getPublicRooms) {
      this.io.emit('rooms_list', getPublicRooms());
    }
  }

  // Broadcast the game state masking hidden info per user
  broadcastState() {
    // Send state to all players
    for (const player of this.room.players) {
      this.io.to(player.id).emit('game_state_update', this.getMaskedState(player.id));
    }
    // Send to spectators
    this.io.to(`${this.room.id}_spectators`).emit('game_state_update', this.getMaskedState('spectator'));
  }

  // Returns the state that the specific `viewerId` is allowed to see.
  // Must be overridden for games like Black & White.
  getMaskedState(viewerId) {
    return this.state;
  }
}

module.exports = Game;
