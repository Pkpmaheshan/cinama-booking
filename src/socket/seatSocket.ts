import { Server, Socket } from 'socket.io';
import http from 'http';
import Show from '../models/Show';
import Booking from '../models/Booking';

const SEAT_HOLD_DURATION = 5 * 60 * 1000; // 5 minutes

// Memory store for holds: Map<showId, Map<seatId, { socketId, timeoutId }>>
const holds = new Map<string, Map<string, { socketId: string; timeoutId: NodeJS.Timeout }>>();

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log("[SOCKET SERVER] CLIENT CONNECTED");
    console.log("[SOCKET SERVER] socket.id:", socket.id);
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET SERVER] DISCONNECT\nsocket.id: ${socket.id}\nreason: ${reason}`);
    });

    // Join a show room
    socket.on('joinShow', async (data: { showId: string }) => {
      try {
        const { showId } = data;
        console.log("[SOCKET SERVER] joinShow RECEIVED");
        console.log("[SOCKET SERVER] socket:", socket.id);
        console.log("[SOCKET SERVER] showId:", showId);
        const show = await Show.findById(showId);
        if (!show) {
          console.log(`[SOCKET] Join rejected\nShow: ${showId}\nReason: show not found\nClient: ${socket.id}`);
          return;
        }
        
        socket.join(`show:${showId}`);
        console.log(`[SOCKET SERVER] JOINED ROOM\nroom: show:${showId}`);
        const room = io.sockets.adapter.rooms.get(`show:${showId}`);
        console.log("[SOCKET SERVER] ROOM MEMBERS:", room ? Array.from(room) : []);

        console.log(
            "[SOCKET SERVER] EXISTING HOLDS FOR SHOW:\n" +
            showId + "\n" +
            JSON.stringify(Array.from(holds.get(showId)?.keys() || []))
        );

        const showHolds = holds.get(showId);
        if (showHolds && showHolds.size > 0) {
          const heldSeats = Array.from(showHolds.entries()).map(([seatId, hold]) => ({
            seatId,
            socketId: hold.socketId
          }));
          const seatIdsList = heldSeats.map(s => s.seatId).join(', ');
          console.log(`[SOCKET SERVER] EMIT show:seat-holds\nsocket: ${socket.id}\nseats: ${JSON.stringify(heldSeats.map(s => s.seatId))}`);
          socket.emit('show:seat-holds', { showId, seats: heldSeats });
        } else {
          console.log(`[SOCKET SERVER] EMIT show:seat-holds\nsocket: ${socket.id}\nseats: []`);
          socket.emit('show:seat-holds', { showId, seats: [] });
        }
      } catch (error) {
        console.error(`[SOCKET] Error joining show:`, error);
      }
    });

    // Hold a seat
    socket.on('seat:held', async (data: { showId: string; seatId: string }) => {
      try {
        const { showId, seatId } = data;
        
        // 1. Validate show exists
        const show = await Show.findById(showId).populate('hallId');
        if (!show || !show.hallId) {
          return; // invalid show
        }

        // 2. Validate seat exists for the Hall configuration
        const hall = show.hallId as any; // Cast for now
        const match = seatId.match(/^([A-Z])(\d+)$/);
        if (!match) return; // invalid format
        
        const rowIndex = match[1].charCodeAt(0) - 65; // A = 0
        const seatNum = parseInt(match[2], 10);
        
        if (rowIndex < 0 || rowIndex >= hall.rows || seatNum < 1 || seatNum > hall.seatsPerRow) {
           return; // out of bounds
        }

        // 3. Check MongoDB for an existing confirmed/pending booking
        const existingBooking = await Booking.findOne({
          showId,
          status: { $in: ['CONFIRMED', 'PENDING'] },
          seatIds: seatId
        });

        if (existingBooking) {
          socket.emit('seat:hold-rejected', {
            showId,
            seatId,
            reason: 'already booked'
          });
          return;
        }

        // 4. Check the in-memory hold map
        if (!holds.has(showId)) {
          holds.set(showId, new Map());
        }
        const showHolds = holds.get(showId)!;

        if (showHolds.has(seatId)) {
          const currentHold = showHolds.get(seatId)!;
          if (currentHold.socketId === socket.id) {
            // Already held by this socket, ignore duplicate
            return;
          } else {
            // Held by someone else
            console.log(`[SOCKET] Seat hold rejected\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}\nReason: already held`);
            socket.emit('seat:hold-rejected', {
              showId,
              seatId,
              reason: 'already held'
            });
            return;
          }
        }

        // 5. Create the hold
        const timeoutId = setTimeout(() => {
          // Timeout occurred
          const sh = holds.get(showId);
          if (sh && sh.has(seatId)) {
            sh.delete(seatId);
            console.log(`[SOCKET] Seat released\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}\nReason: timeout`);
            io.to(`show:${showId}`).emit('seat:released', { showId, seatId, socketId: socket.id });
          }
        }, SEAT_HOLD_DURATION);

        showHolds.set(seatId, { socketId: socket.id, timeoutId });

        // Log and Broadcast
        console.log(`[SOCKET] Seat held\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}`);
        io.to(`show:${showId}`).emit('seat:held', { showId, seatId, socketId: socket.id });

      } catch (error) {
        console.error(`[SOCKET] Error handling seat hold:`, error);
      }
    });

    // Release a seat
    socket.on('seat:released', (data: { showId: string; seatId: string }) => {
      const { showId, seatId } = data;
      const showHolds = holds.get(showId);
      
      if (showHolds && showHolds.has(seatId)) {
        const hold = showHolds.get(seatId)!;
        
        // Ensure ownership
        if (hold.socketId !== socket.id) {
          console.log(`[SOCKET] Seat release rejected (not owner)\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}`);
          return;
        }

        clearTimeout(hold.timeoutId);
        showHolds.delete(seatId);
        
        console.log(`[SOCKET] Seat released\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}\nReason: manual release`);
        io.to(`show:${showId}`).emit('seat:released', { showId, seatId, socketId: socket.id });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
      
      // Find and release all holds by this socket
      for (const [showId, showHolds] of holds.entries()) {
        for (const [seatId, hold] of showHolds.entries()) {
          if (hold.socketId === socket.id) {
            clearTimeout(hold.timeoutId);
            showHolds.delete(seatId);
            
            console.log(`[SOCKET] Seat released\nShow: ${showId}\nSeat: ${seatId}\nClient: ${socket.id}\nReason: disconnect`);
            io.to(`show:${showId}`).emit('seat:released', { showId, seatId, socketId: socket.id });
          }
        }
      }
    });
  });
  
  return io;
};

// Export holds map if needed by other controllers
export const removeHold = (showId: string, seatId: string) => {
  const showHolds = holds.get(showId);
  if (showHolds && showHolds.has(seatId)) {
    const hold = showHolds.get(seatId)!;
    clearTimeout(hold.timeoutId);
    showHolds.delete(seatId);
  }
};
