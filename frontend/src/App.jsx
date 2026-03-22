import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { socket } from './socket';
import './index.css';

const TimerDisplay = ({ timeObj, isActive }) => {
   if (!timeObj) return null;
   const { main, reserve } = timeObj;
   const isReserve = main === 0;
   const timeStr = isReserve 
      ? `${Math.floor(reserve/60)}:${(reserve%60).toString().padStart(2,'0')}` 
      : `${main}s`;
   
   return (
      <span style={{ 
          background: isActive ? (isReserve ? '#e90064' : '#00e676') : 'rgba(255,255,255,0.1)', 
          color: isActive ? (isReserve ? '#fff' : '#000') : 'var(--text-secondary)',
          padding: '4px 12px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold',
          marginLeft: '15px', boxShadow: isActive ? `0 0 10px ${isReserve ? '#e90064' : '#00e676'}` : 'none',
          display: 'inline-block', verticalAlign: 'middle', transition: 'all 0.3s ease'
      }}>
         ⏱ {timeStr}
      </span>
   );
};

// ---- GAME ENGINE WRAPPERS ----
function BlackAndWhiteWrapper({ gameState, emitMove, isPlayer, timers }) {
  if (!gameState.players) return <div style={{padding: '2rem'}}>Loading Phase 6 Engine...</div>;

  const myId = isPlayer ? socket.id : gameState.p1;
  const opponentId = myId === gameState.p1 ? gameState.p2 : gameState.p1;

  const myData = gameState.players[myId];
  const oppData = gameState.players[opponentId];
  const isMyTurn = gameState.phase === 'playing' && gameState.turn === myId;
  const oppIsTurn = gameState.phase === 'playing' && gameState.turn === opponentId;

  const renderTile = (tile, idx, onClick) => {
    let isBlack = tile.color === 'black';
    let isHidden = tile.hidden;
    
    const bgColor = isBlack ? '#15151e' : '#e0e5ed';
    const textColor = isBlack ? '#e0e5ed' : '#15151e';
    const border = isBlack ? '1px solid #333' : '1px solid #ccc';
    
    return (
      <div 
        key={idx} 
        onClick={onClick}
        style={{
          width: '56px', height: '80px', background: bgColor, color: textColor,
          border: border, borderRadius: '8px', display: 'flex', justifyContent: 'center',
          alignItems: 'center', fontSize: '2rem', fontWeight: 'bold', cursor: onClick ? 'pointer' : 'default',
          boxShadow: '0 5px 15px rgba(0,0,0,0.4)', transition: 'all 0.2s ease',
          transform: (onClick && isMyTurn) ? 'translateY(-8px) scale(1.05)' : 'none',
          opacity: (onClick && !isMyTurn) ? 0.6 : 1
        }}
      >
        {tile.value !== undefined ? tile.value : (isHidden ? '?' : ' ')}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px', background: 'radial-gradient(circle at top, #1a1a25 0%, #000 100%)', padding: '1rem', borderRadius: '16px' }}>
      
      {/* Top: Opponent */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Opponent (Score: {oppData.score})
          <TimerDisplay timeObj={timers && timers[opponentId]} isActive={oppIsTurn} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {oppData.tiles.map((t, i) => renderTile(t, i))}
        </div>
      </div>

      {/* Center: Play Area */}
      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', margin: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '0 2rem', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.4rem' }}>Round {gameState.round}/9</h3>
        </div>
        
        {gameState.phase === 'resolving' && gameState.roundWinner && (
          <div style={{ position: 'absolute', zIndex: 10, fontSize: '2rem', fontWeight: 'bold', color: '#00ff88', textShadow: '0 0 20px #00ff88', animation: 'fadeUp 0.5s', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.8)', padding: '1rem 3rem', borderRadius: '50px' }}>
            {gameState.roundWinner === 'tie' ? 'Tie! No points.' : `${gameState.roundWinner === myId ? 'You Win' : 'Opponent Wins'} the round!`}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '5rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Opponent</p>
             {oppData.playedThisRound ? renderTile(oppData.playedThisRound, 'oppPlay') : <div style={{width: '56px', height: '80px', border: '2px dashed var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)'}}/>}
          </div>
          <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', opacity: 0.5 }}>VS</div>
          <div style={{ textAlign: 'center' }}>
             <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>You</p>
             {myData.playedThisRound ? renderTile(myData.playedThisRound, 'myPlay') : <div style={{width: '56px', height: '80px', border: '2px dashed var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)'}}/>}
          </div>
        </div>

        {gameState.phase === 'playing' && (
          <div style={{ marginTop: '2rem', fontSize: '1.1rem', fontWeight: '600', color: isMyTurn ? '#00e676' : 'var(--text-secondary)' }}>
            {isMyTurn ? 'Your turn to play!' : 'Waiting for opponent...'}
          </div>
        )}
      </div>

      {/* Bottom: Player */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
          {myData.tiles.map((t, i) => renderTile(t, i, () => {
             if (isPlayer && isMyTurn && !myData.playedThisRound) {
                emitMove({ action: 'play_tile', value: t.value });
             }
          }))}
        </div>
        <div style={{ color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 'bold' }}>
          You (Score: {myData.score})
          {isPlayer && <TimerDisplay timeObj={timers && timers[myId]} isActive={isMyTurn} />}
        </div>
      </div>
    </div>
  );
}

function BlackHoleWrapper({ gameState, emitMove, isPlayer, timers }) {
  if (!gameState.players) return <div style={{padding: '2rem'}}>Loading Phase 7 Engine...</div>;

  const p1Id = Object.keys(gameState.players).find(id => gameState.players[id].color === 'red');
  const p2Id = Object.keys(gameState.players).find(id => gameState.players[id].color === 'blue');
  
  const myRealId = isPlayer ? socket.id : p1Id;
  const oppId = myRealId === p1Id ? p2Id : p1Id;

  const isMyTurn = gameState.phase === 'playing' && gameState.turn === myRealId;
  const isOppTurn = gameState.phase === 'playing' && gameState.turn === oppId;
  
  const renderCell = (r, c) => {
    const cell = gameState.grid[r] && gameState.grid[r][c];
    let bgColor = 'rgba(255,255,255,0.02)';
    let val = '';
    
    if (cell) {
        bgColor = gameState.players[cell.owner].color === 'red' ? '#e90064' : '#1e50ff';
        val = cell.value;
    }
    
    // BlackHole animation triggering
    const isEmpty = cell === null;
    const isBlackHole = gameState.blackHoleResolving && isEmpty;
    
    return (
      <div 
         key={`${r}-${c}`}
         onClick={() => {
             if (isMyTurn && isEmpty) emitMove({ action: 'place_piece', r, c });
         }}
         style={{
             width: '60px', height: '60px', borderRadius: '50%',
             background: isBlackHole ? 'radial-gradient(circle, #000 0%, #111 80%, #333 100%)' : bgColor,
             border: '2px solid rgba(255,255,255,0.1)',
             boxShadow: isBlackHole ? '0 0 40px rgba(255,255,255,0.5), inset 0 0 20px #000' : (val ? '0 5px 15px rgba(0,0,0,0.4)' : 'none'),
             display: 'flex', justifyContent: 'center', alignItems: 'center',
             fontSize: '1.5rem', fontWeight: 'bold', color: 'white',
             cursor: isMyTurn && isEmpty ? 'pointer' : 'default',
             transition: 'all 0.3s ease',
             transform: (isMyTurn && isEmpty) ? 'scale(1.1)' : 'none'
         }}
      >
        {val}
      </div>
    );
  };
  
  const renderPieces = (playerId, opacity, highlightNext) => {
      const data = gameState.players[playerId];
      const isRed = data.color === 'red';
      const bgColor = isRed ? '#e90064' : '#1e50ff';
      const nextPiece = data.unplayed[0];
      
      return [1,2,3,4,5,6,7,8,9,10].map(val => {
          const isPlayed = !data.unplayed.includes(val);
          const isNext = highlightNext && val === nextPiece;
          return (
             <div key={val} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: isPlayed ? 'rgba(255,255,255,0.1)' : bgColor,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontWeight: 'bold', color: isPlayed ? 'rgba(255,255,255,0.3)' : 'white',
                border: isNext ? '2px solid #00ff88' : '2px solid transparent',
                boxShadow: isNext ? '0 0 15px #00ff88' : 'none',
                opacity: opacity,
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                transform: isNext ? 'scale(1.2)' : 'none'
             }}>
               {val}
             </div>
          )
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '650px', background: 'radial-gradient(circle at center, #1b1b28 0%, #0d0d14 100%)', padding: '1rem', borderRadius: '16px' }}>
      
      {/* Top: Opponent */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Opponent
          <TimerDisplay timeObj={timers && timers[oppId]} isActive={isOppTurn} />
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
           {renderPieces(oppId, isOppTurn ? 1 : 0.4, isOppTurn)}
        </div>
      </div>

      {/* Center: Triangle Board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '2rem 0', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '2rem' }}>
        {gameState.resultText && (
            <div style={{ marginBottom: '1.5rem', color: '#00ff88', fontSize: '1.2rem', background: 'rgba(0,0,0,0.8)', padding: '1rem 2rem', borderRadius: '50px', animation: 'fadeUp 0.5s', fontWeight: 'bold' }}>
               {gameState.resultText}
            </div>
        )}
        
        {/* Draw the triangle rows sequentially with descending cell counts */}
        {[0,1,2,3,4,5].map(r => (
            <div key={r} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {Array(6 - r).fill(null).map((_, c) => renderCell(r, c))}
            </div>
        ))}

        {gameState.phase === 'playing' && (
          <div style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 'bold', color: isMyTurn ? '#00e676' : 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1.5rem', borderRadius: '50px' }}>
            {isMyTurn ? 'Your turn to place your next piece!' : 'Waiting for opponent...'}
          </div>
        )}
      </div>

      {/* Bottom: Player */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.75rem' }}>
           {renderPieces(myRealId, isMyTurn ? 1 : 0.4, isMyTurn)}
        </div>
        <div style={{ color: 'var(--accent-color)', fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
          You
          {isPlayer && <TimerDisplay timeObj={timers && timers[myRealId]} isActive={isMyTurn} />}
        </div>
      </div>
    </div>
  );
}

// -------------------------------

function Home() {
  return (
    <div className="app-container">
      <div className="glass-panel">
        <h1 className="title">THE GENIUS</h1>
        <p className="subtitle">Outsmart, Outplay, Outlast. Experience the ultimate psychological warfare 1v1 card and board games.</p>
        <Link to="/lobby" className="btn-primary">ENTER LOBBY</Link>
      </div>
    </div>
  );
}

function Lobby() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', password: '', playerName: '', gameType: 'black_and_white' });
  const [joinData, setJoinData] = useState({ password: '', playerName: '', role: 'player' });
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    socket.connect();
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onRoomsList = (list) => setRooms(list);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('rooms_list', onRoomsList);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('rooms_list', onRoomsList);
    };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    socket.emit('create_room', newRoom, (res) => {
      if (res.success) navigate(`/room/${res.roomId}`);
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    socket.emit('join_room', { roomId: selectedRoom.id, ...joinData }, (res) => {
      if (res.success) navigate(`/room/${res.room.id}`);
      else alert(res.message);
    });
  };
  
  const getGameLabel = (type) => type === 'black_hole' ? 'Black Hole' : 'Black and White';

  return (
    <div className="app-container">
      <div className="glass-panel" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 className="title" style={{ fontSize: '2.5rem', margin: 0 }}>MAIN LOBBY</h2>
          <div className="status-indicator" style={{ margin: 0 }}>
            <div className={`dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            {isConnected ? 'Online' : 'Connecting...'}
          </div>
        </div>

        {!showCreate && !selectedRoom && (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>Create Room</button>
            </div>
            
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Active Rooms</h3>
              {rooms.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No rooms available. Create one to start!</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {rooms.map(r => (
                    <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
                      <div>
                        <strong>{r.name}</strong> {r.hasPassword && '🔒'} ({getGameLabel(r.gameType)}) <br/>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Status: {r.status} | Players: {r.playersCount}/2 | Spectators: {r.spectatorsCount}
                        </span>
                      </div>
                      <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '1rem', background: 'var(--bg-gradient)', border: '1px solid var(--glass-border)' }} onClick={() => setSelectedRoom(r)}>Join</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem' }}>Create New Room</h3>
            <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Your Name:</label><input required style={inputStyle} value={newRoom.playerName} onChange={e => setNewRoom({...newRoom, playerName: e.target.value})} placeholder="Player 1" /></div>
            <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Room Name:</label><input required style={inputStyle} value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} placeholder="Epic Match" /></div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Game Type:</label>
              <select style={inputStyle} value={newRoom.gameType} onChange={e => setNewRoom({...newRoom, gameType: e.target.value})}>
                <option value="black_and_white">Black and White</option>
                <option value="black_hole">Black Hole</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}><label style={labelStyle}>Password (optional):</label><input type="password" style={inputStyle} value={newRoom.password} onChange={e => setNewRoom({...newRoom, password: e.target.value})} placeholder="Leave blank for public" /></div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" className="btn-primary btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        {selectedRoom && (
          <form onSubmit={handleJoin} style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem' }}>Join Room: {selectedRoom.name}</h3>
            <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Your Name:</label><input required style={inputStyle} value={joinData.playerName} onChange={e => setJoinData({...joinData, playerName: e.target.value})} placeholder="Your handle" /></div>
            {selectedRoom.hasPassword && (
              <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Password:</label><input type="password" required style={inputStyle} value={joinData.password} onChange={e => setJoinData({...joinData, password: e.target.value})} placeholder="Room password" /></div>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Join As:</label>
              <select style={inputStyle} value={joinData.role} onChange={e => setJoinData({...joinData, role: e.target.value})}>
                {selectedRoom.playersCount < 2 && selectedRoom.status === 'waiting' && <option value="player">Player</option>}
                <option value="spectator">Spectator</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary">Join Room</button>
              <button type="button" className="btn-primary btn-outline" onClick={() => setSelectedRoom(null)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [timers, setTimers] = useState(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [specMessages, setSpecMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socket.connected) {
      navigate('/lobby');
      return;
    }

    socket.on('room_updated', (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === 'playing') setGameStarted(true);
      else setGameStarted(false);
    });

    socket.on('game_started', () => setGameStarted(true));
    socket.on('game_state_update', (state) => setGameState(state));
    socket.on('game_ended', ({ winnerId, reason, finalState }) => {
      setGameState(finalState);
      setGameStarted(false);
      setTimers(null); // Clear timers when game ends
    });

    socket.on('timer_sync', (t) => setTimers(t));
    socket.on('chat_message', (msg) => setChatMessages(prev => [...prev, msg]));
    socket.on('spectator_chat', (msg) => setSpecMessages(prev => [...prev, msg]));

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state_update');
      socket.off('game_ended');
      socket.off('timer_sync');
      socket.off('chat_message');
      socket.off('spectator_chat');
    };
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, specMessages, activeTab]);

  if (!room) return <div className="app-container"><div className="glass-panel">Loading...</div></div>;

  const isHost = room.host === socket.id;
  const isPlayer = room.players.find(p => p.id === socket.id);
  
  const handleStartGame = () => {
    socket.emit('start_game', roomId, (res) => {
      if(!res.success) alert(res.message);
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send_chat', { roomId, message: chatInput, type: activeTab });
    setChatInput('');
  };
  
  const emitMove = (moveData) => {
    socket.emit('game_move', { roomId, moveData });
  };

  return (
    <div className="app-container" style={{ padding: '0', display: 'flex', alignItems: 'stretch' }}>
      <div style={{ flex: 3, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ flex: 1, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="title" style={{ fontSize: '2.5rem', margin: 0 }}>
              {room.name} <span style={{fontSize: '1.2rem', color: 'var(--accent-color)', verticalAlign: 'middle'}}>({room.gameType === 'black_hole' ? 'Black Hole' : 'Black and White'})</span>
            </h2>
            <Link to="/lobby" className="btn-primary btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>Leave Room</Link>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status: {room.status === 'waiting' ? 'Waiting for players...' : 'In Game 🟢'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Role: {isPlayer ? 'Player' : 'Spectator'}</span>
          </div>

          {!gameStarted ? (
            <>
              <div style={{ display: 'flex', gap: '2rem', textAlign: 'left', marginBottom: '2rem' }}>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
                  <h3 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>Players (2 max)</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {room.players.map((p, i) => (
                      <li key={p.id} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem', borderRadius: '8px' }}>
                        Player {i+1}: <strong style={{ color: 'white' }}>{p.name}</strong> {p.id === room.host ? '👑 (Host)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
                  <h3 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>Spectators</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {room.spectators.map(s => (
                      <li key={s.id} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem', borderRadius: '8px' }}>
                        {s.name}
                      </li>
                    ))}
                    {room.spectators.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No spectators</span>}
                  </ul>
                </div>
              </div>

              {isHost && room.status === 'waiting' && (
                <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                  <button 
                    className="btn-primary" 
                    onClick={handleStartGame}
                    disabled={room.players.length < 2}
                    style={{ opacity: room.players.length < 2 ? 0.5 : 1, width: '100%', maxWidth: '400px', fontSize: '1.5rem', padding: '1.5rem' }}
                  >
                    START GAME
                  </button>
                  {room.players.length < 2 && <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Requires 2 players to start</p>}
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              {gameState ? (
                room.gameType === 'black_hole' 
                  ? <BlackHoleWrapper gameState={gameState} emitMove={emitMove} isPlayer={!!isPlayer} timers={timers} />
                  : <BlackAndWhiteWrapper gameState={gameState} emitMove={emitMove} isPlayer={!!isPlayer} timers={timers} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Syncing game state...</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          <button style={{ ...tabStyle, background: activeTab === 'general' ? 'var(--accent-color)' : 'transparent' }} onClick={() => setActiveTab('general')}>General Chat</button>
          {!isPlayer && (
            <button style={{ ...tabStyle, background: activeTab === 'spectator' ? 'var(--accent-color)' : 'transparent' }} onClick={() => setActiveTab('spectator')}>Spectator Chat</button>
          )}
        </div>
        
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeTab === 'general' 
            ? chatMessages.map((msg, idx) => (
                <div key={idx} style={{ background: msg.system ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.95rem' }}>
                  {msg.system ? (<span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{msg.message}</span>) : (<><strong style={{ color: msg.isPlayer ? 'var(--accent-color)' : '#00e676' }}>{msg.sender}: </strong><span style={{ color: 'white' }}>{msg.message}</span></>)}
                </div>
              ))
            : specMessages.map((msg, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#00e676' }}>{msg.sender}: </strong><span style={{ color: 'white' }}>{msg.message}</span>
                </div>
              ))
          }
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChat} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem' }}>
          <input type="text" style={{ ...inputStyle, margin: 0 }} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type message..." />
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem', borderRadius: '8px' }}>Send</button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)',
  border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px',
  fontFamily: 'Outfit, sans-serif', fontSize: '1rem', outline: 'none'
};

const labelStyle = { display: 'block', marginBottom: '0.5rem' };

const tabStyle = {
  flex: 1, padding: '1rem', border: 'none', color: 'white',
  fontFamily: 'Outfit, sans-serif', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s ease'
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
