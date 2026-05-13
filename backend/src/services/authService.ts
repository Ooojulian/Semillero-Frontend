import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { User, JwtPayload } from '../types';

const SALT_ROUNDS = 12;

export const authService = {
  async register(email: string, password: string, fullName: string, role = 'candidate') {
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if ((exists.rows as unknown[]).length > 0) throw new AppError(409, 'El email ya está registrado');

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, is_active, created_at`,
      [email, password_hash, fullName, role]
    );
    return (result.rows as unknown as User[])[0];
  },

  async login(email: string, password: string) {
    const result = await query<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    const user = (result.rows as unknown as (User & { password_hash: string })[])[0];
    if (!user) throw new AppError(401, 'Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Credenciales inválidas');

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    };
  },

  async refresh(refreshToken: string) {
    const result = await query(
      `SELECT s.*, u.email, u.role FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [refreshToken]
    );
    const session = (result.rows as unknown as (JwtPayload & { user_id: string }[])[0]) as unknown as { user_id: string; email: string; role: string } | undefined;
    if (!session) throw new AppError(401, 'Sesión inválida o expirada');

    const accessToken = jwt.sign(
      { sub: session.user_id, email: session.email, role: session.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
    return { accessToken };
  },

  async logout(refreshToken: string) {
    await query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
  },
};
