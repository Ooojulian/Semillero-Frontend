'use client';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../types';

interface Props {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const MessageBubble = ({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) => (
  <div className={`chat-message ${isOwn ? 'own' : 'other'}`}>
    <div className="bubble">
      <p>{msg.content}</p>
      <span className="timestamp">{formatTime(msg.created_at)}</span>
    </div>
  </div>
);

export const ChatRoom = ({ roomId, currentUserId, currentUserName }: Props) => {
  const { messages, sendMessage, loadMore, connected, error } = useChat(roomId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-room">
      <header className="chat-header">
        <div className="chat-title">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <h3>{roomId}</h3>
        </div>
        <span className="chat-subtitle">{connected ? 'En línea' : 'Conectando...'}</span>
      </header>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-messages" ref={listRef}>
        <button className="load-more" onClick={loadMore}>
          Cargar mensajes anteriores
        </button>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          rows={1}
          disabled={!connected}
        />
        <button onClick={handleSend} disabled={!connected || !input.trim()} aria-label="Enviar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
