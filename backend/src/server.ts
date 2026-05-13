import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { setupChat } from './socket';
import { config } from './config';
import { logger } from './utils/logger';
import { pool } from './db';

const app = createApp();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: { origin: config.CORS_ORIGIN, credentials: true },
  transports: ['websocket', 'polling'],
});

setupChat(io);

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(config.PORT, () => {
  logger.info(`Server running`, { port: config.PORT, env: config.NODE_ENV });
});
