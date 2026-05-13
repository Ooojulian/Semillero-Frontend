import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { chatService } from '../services/chatService';
import { JwtPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  data: { user: { id: string; email: string } };
}

const authenticateSocket = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    socket.data.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
};

export const setupChat = (io: SocketServer) => {
  io.use(authenticateSocket as Parameters<typeof io.use>[0]);

  io.on('connection', (socket: Socket) => {
    const s = socket as AuthenticatedSocket;
    const userId = s.data.user.id;
    logger.info('Socket connected', { userId, socketId: socket.id });

    socket.on('join-room', (roomId: string) => {
      if (typeof roomId !== 'string' || !roomId.trim()) return;
      socket.join(roomId);
      chatService.markRoomAsRead(roomId, userId).catch(() => null);
      logger.info('User joined room', { userId, roomId });
    });

    socket.on('send-message', async (data: { roomId: string; content: string }) => {
      const { roomId, content } = data ?? {};
      if (!roomId || !content?.trim()) return;

      try {
        const message = await chatService.saveMessage(roomId, userId, content.trim());
        io.to(roomId).emit('new-message', message);
      } catch (err) {
        logger.error('Error saving message', { userId, error: err });
        socket.emit('error', { message: 'No se pudo enviar el mensaje' });
      }
    });

    socket.on('get-history', async (data: { roomId: string; before?: string; limit?: number }) => {
      const { roomId, before, limit } = data ?? {};
      if (!roomId) return;

      try {
        const history = await chatService.getHistory(roomId, before, limit);
        socket.emit('history', history);
      } catch (err) {
        logger.error('Error fetching history', { userId, error: err });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId, socketId: socket.id });
    });
  });
};
