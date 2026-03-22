import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { socket } from './socket';
import './index.css';

// ---- GAME ENGINE WRAPPERS ----
function BlackAndWhiteWrapper({ gameState, emitMove, isPlayer }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h3 style={{ color: '#fff' }}>Black and White Engine Placeholder</h3>
      <p style={{ color: 'var(--text-secondary)' }}>Status: {gameState.message}</p>
      {isPlayer && (
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => emitMove({ action: 'play_tile', tile: 0 })}>
          Test Move
        </button>
      )}
    </div>
  );
}

function BlackHoleWrapper({ gameState, emitMove, isPlayer }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h3 style={{ color: '#fff' }}>Black Hole Engine Placeholder</h3>
      <p style={{ color: 'var(--text-secondary)' }}>Status: {gameState.message}</p>
      {isPlayer && (
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => emitMove({ action: 'place_piece', position: 'A' })}>
          Test Move
        </button>
      )}
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
    });

    socket.on('chat_message', (msg) => setChatMessages(prev => [...prev, msg]));
    socket.on('spectator_chat', (msg) => setSpecMessages(prev => [...prev, msg]));

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state_update');
      socket.off('game_ended');
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
                  ? <BlackHoleWrapper gameState={gameState} emitMove={emitMove} isPlayer={!!isPlayer} />
                  : <BlackAndWhiteWrapper gameState={gameState} emitMove={emitMove} isPlayer={!!isPlayer} />
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
          <input type="text" style={{ ...inputStyle, marginBottom: 0 }} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type message..." />
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
