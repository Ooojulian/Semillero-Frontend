import { query } from '../db';
import { ChatMessage } from '../types';

export const chatService = {
  async saveMessage(roomId: string, senderId: string, content: string): Promise<ChatMessage> {
    const result = await query<ChatMessage>(
      `INSERT INTO chat_messages (room_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [roomId, senderId, content]
    );
    return (result.rows as unknown as ChatMessage[])[0];
  },

  async getHistory(roomId: string, before?: string, limit = 50): Promise<ChatMessage[]> {
    if (before) {
      const result = await query<ChatMessage>(
        `SELECT * FROM chat_messages
         WHERE room_id = $1 AND created_at < (SELECT created_at FROM chat_messages WHERE id = $2)
         ORDER BY created_at DESC LIMIT $3`,
        [roomId, before, limit]
      );
      return (result.rows as unknown as ChatMessage[]).reverse();
    }

    const result = await query<ChatMessage>(
      'SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2',
      [roomId, limit]
    );
    return (result.rows as unknown as ChatMessage[]).reverse();
  },

  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    await query(
      `UPDATE chat_messages SET is_read = true
       WHERE room_id = $1 AND sender_id != $2 AND is_read = false`,
      [roomId, userId]
    );
  },
};
