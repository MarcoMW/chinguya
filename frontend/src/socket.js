import { io } from 'socket.io-client';

// 'http://localhost:3001' is the backend URL
export const socket = io('http://localhost:3001', {
  autoConnect: false // Explicitly calling connect() when needed is a good pattern for games
});
