class Game {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.state = {};
    this.status = 'playing'; // 'playing' | 'ended'
  }

  // To be overridden by specific games (Black & White / Black Hole)
  handleMove(playerId, moveData) {
    console.log(`Move received from ${playerId}:`, moveData);
    // Dummy override warning
  }

  // Common End Game logic
  endGame(winnerId, reason) {
    this.status = 'ended';
    this.room.status = 'waiting';
    
    this.io.to(this.room.id).emit('game_ended', { winnerId, reason, finalState: this.state });
    
    let winnerName = 'Someone';
    const player = this.room.players.find(p => p.id === winnerId);
    if(player) winnerName = player.name;
    else if(winnerId === 'draw') winnerName = 'Nobody';

    this.io.to(this.room.id).emit('chat_message', { 
      system: true, 
      message: `Game Over! ${reason} Winner: ${winnerName}` 
    });
    
    this.room.gameInstance = null; // Clean up memory
    
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
    const getPublicRooms = require('./index').getPublicRooms;
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
