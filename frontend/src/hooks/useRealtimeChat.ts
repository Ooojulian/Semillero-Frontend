import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  loadMore: () => void;
  connected: boolean;
  error: string | null;
}

export const useChat = (roomId: string): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No autenticado');
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      socket.emit('join-room', roomId);
      socket.emit('get-history', { roomId, limit: 50 });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));

    socket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('error', (err: { message: string }) => {
      setError(err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit('send-message', { roomId, content: content.trim() });
  }, [roomId]);

  const loadMore = useCallback(() => {
    if (!socketRef.current?.connected || messages.length === 0) return;
    socketRef.current.emit('get-history', { roomId, before: messages[0].id, limit: 30 });
  }, [roomId, messages]);

  return { messages, sendMessage, loadMore, connected, error };
};
