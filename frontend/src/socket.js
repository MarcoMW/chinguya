import { io } from 'socket.io-client';

// 'http://localhost:3001' is the backend URL
export const URL = process.env.NODE_ENV === 'production' ? undefined : `http://${window.location.hostname}:3001`;
export const socket = io(URL, {
  autoConnect: false // Explicitly calling connect() when needed is a good pattern for games
});
