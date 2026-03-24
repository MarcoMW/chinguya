# Chinguya Project Documentation

Chinguya is a real-time multiplayer gaming platform for 1v1 card and board games, built with a Vite-based React frontend and a Node.js + Socket.io backend.

## Architecture Overview

### Backend (Node.js)
The backend is responsible for room management, game instantiation, and state broadcasting.

- **`index.js`**: Core server logic. Manages Socket.io connections, room creation/joining, role switching, and global event handling.
- **`Game.js`**: Base class for all game modes. Defines the interface for updating state, handling moves, and masking state for players (hiding opponent's hands/secrets).
- **`games/`**: Directory containing specific game logic:
    - `BlackAndWhite.js`: Logic for the "Black and White" (similar to Da Vinci Code) game.
    - `BlackHole.js`: Logic for the "Black Hole" strategy game.

### Frontend (React + Vite)
The frontend is a single-page application that interacts with the backend via WebSockets.

- **`App.jsx`**: Main application component. Contains routing, lobby logic, room UI, and game engine wrappers.
- **`socket.js`**: Socket.io client initialization.
- **`index.css`**: Global styles using a custom "glassmorphism" design system.

## Key Mechanisms

### Room Management
Rooms have a `status`: `waiting`, `playing`, or `finished`.
- **Host**: The room creator. Has privileges to change game types, delegate hosting, and start matches.
- **Participants**: Can be `players` (max 2) or `spectators`.
- **Role Switching**: Participants can switch roles before a match starts (with host approval or as per room limits).

### State Synchronization
1. When a game starts, the backend instantiates a game class (e.g., `BlackHole`).
2. The game state is updated on every move or timer tick.
3. **Masked Update**: The backend uses `getMaskedState(playerId)` to strip secret information (like opponent tiles) before broadcasting to each individual player.
4. **Wrapper Strategy**: In `App.jsx`, `BlackAndWhiteWrapper` and `BlackHoleWrapper` components handle the rendering of `gameState` updates received via the `game_state_update` event.

### Defensive Programming (Frontend)
The game wrappers implement defensive checks (null checks, optional chaining) to handle race conditions during state transitions (e.g., when a player joins a game mid-update).

## Socket Events Reference

### Client -> Server
- `create_room`: `({ name, password, playerName, gameType })`
- `join_room`: `({ roomId, password, playerName, role })`
- `switch_role`: `({ roomId, role })`
- `start_game`: `(roomId)`
- `game_move`: `({ roomId, moveData })`
- `change_host`: `({ roomId, newHostId })`

### Server -> Client
- `rooms_list`: Current available public rooms.
- `room_updated`: Full room metadata update.
- `game_state_update`: Filtered/masked game state for the current player.
- `chat_message`: General or system messages.
