import http from 'http';
import app from './app';
import { connectDB } from './config/database';
import { setupSocket } from './socket/seatSocket';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start Express/HTTP server
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    const io = setupSocket(server);
    app.set('io', io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

