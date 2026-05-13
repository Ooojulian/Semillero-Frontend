'use client';
import { useState } from 'react';
import { ChatRoom } from './ChatRoom';
import { getStoredUser } from '../../lib/auth';

const DEFAULT_ROOMS = [
  { id: 'general', label: 'General' },
  { id: 'reclutadores', label: 'Reclutadores' },
  { id: 'soporte', label: 'Soporte' },
];

export const ChatView = () => {
  const user = getStoredUser();
  const [activeRoom, setActiveRoom] = useState('general');

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Chat</h1>
        <p>Comunicación en tiempo real</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, height: 'calc(100vh - 180px)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Salas
          </div>
          <nav style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DEFAULT_ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  textAlign: 'left',
                  fontSize: 13.5,
                  fontWeight: 500,
                  background: activeRoom === room.id ? 'var(--surface-2)' : 'transparent',
                  color: activeRoom === room.id ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'background 150ms',
                  cursor: 'pointer',
                }}
              >
                # {room.label}
              </button>
            ))}
          </nav>
        </div>

        <ChatRoom
          roomId={activeRoom}
          currentUserId={user.id}
          currentUserName={user.full_name}
        />
      </div>
    </div>
  );
};
