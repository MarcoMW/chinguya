# The Genius Web App

A full-stack real-time multiplayer web application where players can compete in 1v1 board and card games inspired by the South Korean psychological warfare show, *The Genius*.

## Features
- **Real-time Multiplayer:** Powered by Express and Socket.IO for instantaneous move validation, state transmission, and chat routing.
- **Role-based Architecture:** Join any room dynamically as a participating 'Player' or an observing 'Spectator'.
- **Room Management:** Create instanced public or completely private (password-protected) game rooms.
- **Isolated Chat Channels:** Features a Global Chat visible to everyone in the room, and an exclusive Spectator Chat channel structurally hidden from the active players.
- **Premium Glassmorphism Design:** Beautiful dark-mode UI with vibrant color gradients, glowing status indicators, and frosted glass components tailored for maximum immersion.

## Planned Games
- **Black and White:** A psychological numbers game where the values of the opponent's played tiles are hidden behind color categories.
- **Black Hole:** A geometric tactical battle using a 21-space triangular hexagonal grid and strict ascending numbered pieces.

## Project Structure
- **/frontend**: React + Vite configuration handling UI routing, connection state, unified overlays, and dynamic game rendering.
- **/backend**: Node.js + Express backend running a bespoke generic `Game` engine. The architecture uses an Abstract Factory and socket routing pattern to dynamically initiate matches individually mapped to Socket Rooms.

***

*Disclaimer: This project was built and designed with the architectural and implementation assistance of Google Antigravity.*
