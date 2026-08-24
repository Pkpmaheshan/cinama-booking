const fs = require('fs');
const path = require('path');

const filePath = 'D:/Client Projects/Panchayu NSBM/cinemaAPI/src/socket/seatSocket.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /io\.on\('connection', \(socket: Socket\) => \{\n    console\.log\(`\[SOCKET\] Client connected: \$\{socket\.id\}`\);/g,
  `io.on('connection', (socket: Socket) => {
    console.log("[SOCKET SERVER] CLIENT CONNECTED");
    console.log("[SOCKET SERVER] socket.id:", socket.id);
    socket.on('disconnect', (reason) => {
      console.log(\`[SOCKET SERVER] DISCONNECT\\nsocket.id: \$\{socket.id\}\\nreason: \$\{reason\}\`);
    });`
);

content = content.replace(
  /socket\.on\('joinShow', async \(data: \{ showId: string \}\) => \{\n      try \{\n        const \{ showId \} = data;/g,
  `socket.on('joinShow', async (data: { showId: string }) => {
      try {
        const { showId } = data;
        console.log("[SOCKET SERVER] joinShow RECEIVED");
        console.log("[SOCKET SERVER] socket:", socket.id);
        console.log("[SOCKET SERVER] showId:", showId);`
);

content = content.replace(
  /socket\.join\(`show:\$\{showId\}`\);\n        console\.log\(`\[SOCKET\] Client \$\{socket\.id\} joined show room: \$\{showId\}`\);\n\n        \/\/ Send current holds to the joining client\n        const showHolds = holds\.get\(showId\);\n        if \(showHolds && showHolds\.size > 0\) \{\n          const heldSeats = Array\.from\(showHolds\.entries\(\)\)\.map\(\(\[seatId, hold\]\) => \(\{\n            seatId,\n            socketId: hold\.socketId\n          \}\)\);\n          const seatIdsList = heldSeats\.map\(s => s\.seatId\)\.join\(', '\);\n          console\.log\(`\[SOCKET\] Sending current seat holds\\nShow: \$\{showId\}\\nClient: \$\{socket\.id\}\\nHeld seats: \$\{seatIdsList\}`\);\n          socket\.emit\('show:seat-holds', \{ showId, seats: heldSeats \}\);\n        \} else \{\n          console\.log\(`\[SOCKET\] Sending current seat holds\\nShow: \$\{showId\}\\nClient: \$\{socket\.id\}\\nHeld seats: none`\);\n          socket\.emit\('show:seat-holds', \{ showId, seats: \[\] \}\);\n        \}/g,
  `socket.join(\`show:\$\{showId\}\`);
        console.log(\`[SOCKET SERVER] JOINED ROOM\\nroom: show:\$\{showId\}\`);
        const room = io.sockets.adapter.rooms.get(\`show:\$\{showId\}\`);
        console.log("[SOCKET SERVER] ROOM MEMBERS:", room ? Array.from(room) : []);

        console.log(
            "[SOCKET SERVER] EXISTING HOLDS FOR SHOW:\\n" +
            showId + "\\n" +
            JSON.stringify(Array.from(holds.get(showId)?.keys() || []))
        );

        const showHolds = holds.get(showId);
        if (showHolds && showHolds.size > 0) {
          const heldSeats = Array.from(showHolds.entries()).map(([seatId, hold]) => ({
            seatId,
            socketId: hold.socketId
          }));
          const seatIdsList = heldSeats.map(s => s.seatId).join(', ');
          console.log(\`[SOCKET SERVER] EMIT show:seat-holds\\nsocket: \$\{socket.id\}\\nseats: \$\{JSON.stringify(heldSeats.map(s => s.seatId))\}\`);
          socket.emit('show:seat-holds', { showId, seats: heldSeats });
        } else {
          console.log(\`[SOCKET SERVER] EMIT show:seat-holds\\nsocket: \$\{socket.id\}\\nseats: []\`);
          socket.emit('show:seat-holds', { showId, seats: [] });
        }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched seatSocket.ts');
