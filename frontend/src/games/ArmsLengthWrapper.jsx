import { useState } from 'react';
import { socket } from '../socket';

const TimerDisplay = ({ timeObj, isActive }) => {
   if (!timeObj) return null;
   const { main, reserve } = timeObj;
   const isReserve = main === 0;
   const timeStr = isReserve 
      ? `${Math.floor(reserve/60)}:${(reserve%60).toString().padStart(2,'0')}` 
      : `${main}s`;
   return (
      <span style={{ 
          background: isActive ? (isReserve ? '#c62828' : '#d4af37') : 'rgba(255,255,255,0.1)', 
          color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
          padding: '0.2rem 0.5rem', margin: '0 0.5rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold',
          display: 'inline-block'
      }}>
          {timeStr}
      </span>
   );
};

const ArmsLengthWrapper = ({ room, gameState, emitMove, isPlayer, timers }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  
  const myId = socket.id;
  const isMyTurn = gameState.turn === myId;
  
  const p1Name = room.players.find(p => p.id === gameState.p1)?.name || 'Red Player';
  const p2Name = room.players.find(p => p.id === gameState.p2)?.name || 'Blue Player';
  const p1Timer = timers?.[gameState.p1];
  const p2Timer = timers?.[gameState.p2];
  
  const handleCellClick = (r, c) => {
    if (!isMyTurn || gameState.phase !== 'playing') return;
    if (gameState.board[r][c] !== 0) return;
    emitMove({ row: r, col: c });
    setHoveredCell(null);
  };
  
  const getPreviewPushes = (r, c) => {
    if (gameState.board[r][c] !== 0) return [];
    const pushes = [];
    const dirs = [
      [-1, -1], [-1,  0], [-1,  1],
      [ 0, -1],           [ 0,  1],
      [ 1, -1], [ 1,  0], [ 1,  1]
    ];
    for (const [dr, dc] of dirs) {
      const adjR = r + dr;
      const adjC = c + dc;
      if (adjR >= 1 && adjR <= 8 && adjC >= 1 && adjC <= 8 && gameState.board[adjR][adjC] !== 0) {
        const pushR = r + 2 * dr;
        const pushC = c + 2 * dc;
        if (gameState.board[pushR][pushC] === 0) {
           pushes.push({ r: adjR, c: adjC, dr, dc });
        }
      }
    }
    return pushes;
  };
  
  const pushes = hoveredCell && isMyTurn ? getPreviewPushes(hoveredCell.r, hoveredCell.c) : [];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top Banner for P2 (usually opponent) */}
      <div style={{ display: 'flex', justifySelf: 'flex-start', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.6)', borderBottom: '2px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3498db', boxShadow: '0 0 10px #3498db' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{p2Name}</span>
          {p2Timer ? <TimerDisplay timeObj={p2Timer} isActive={gameState.turn === gameState.p2} /> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52, 152, 219, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>Stones Lost:</span>
          <span style={{ fontSize: '1.2rem', color: '#ff4d4d', fontWeight: 'bold' }}>{gameState.blueKnockedOff} / 10</span>
        </div>
      </div>
      
      {/* Game Board */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 50px)', 
          gridTemplateRows: 'repeat(8, 50px)', 
          gap: '2px', 
          background: '#8b5a2b', 
          padding: '6px', 
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {Array.from({ length: 8 }).map((_, rIdx) => {
            const r = rIdx + 1;
            return Array.from({ length: 8 }).map((_, cIdx) => {
              const c = cIdx + 1;
              const cellValue = gameState.board[r][c];
              const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
              
              const pushAction = pushes.find(p => p.r === r && p.c === c);
              const isLastMove = gameState.lastMove?.row === r && gameState.lastMove?.col === c;
              
              let stoneColor = null;
              if (cellValue === 1) stoneColor = '#e74c3c';
              if (cellValue === 2) stoneColor = '#3498db';
              if (isHovered && isMyTurn && cellValue === 0) {
                 stoneColor = myId === gameState.p1 ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)';
              }

              const arrowMap = {
                 '-1,-1': '↖', '-1,0': '↑', '-1,1': '↗',
                 '0,-1': '←', '0,1': '→',
                 '1,-1': '↙', '1,0': '↓', '1,1': '↘'
              };

              return (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoveredCell({ r, c })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    background: '#eecfa1',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    cursor: (cellValue === 0 && isMyTurn && gameState.phase === 'playing') ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  {stoneColor && (
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: stoneColor,
                      boxShadow: isLastMove ? `0 0 15px 5px ${stoneColor.replace('0.5', '1')}` : 'inset -3px -3px 6px rgba(0,0,0,0.3), 2px 2px 5px rgba(0,0,0,0.4)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                       {isLastMove && <div style={{width:'10px', height:'10px', borderRadius:'50%', background:'white'}}/>}
                    </div>
                  )}
                  {pushAction && (
                    <div style={{
                      position: 'absolute',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      textShadow: '0 0 5px black, 0 0 5px black',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      {arrowMap[`${pushAction.dr},${pushAction.dc}`]}
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
      
      {/* Bottom Banner for P1 (usually you) */}
      <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.6)', borderTop: '2px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e74c3c', boxShadow: '0 0 10px #e74c3c' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{p1Name}</span>
          {p1Timer ? <TimerDisplay timeObj={p1Timer} isActive={gameState.turn === gameState.p1} /> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(231, 76, 60, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>Stones Lost:</span>
          <span style={{ fontSize: '1.2rem', color: '#ff4d4d', fontWeight: 'bold' }}>{gameState.redKnockedOff} / 10</span>
        </div>
      </div>

    </div>
  );
};

export default ArmsLengthWrapper;
