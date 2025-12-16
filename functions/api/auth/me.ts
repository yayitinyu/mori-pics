// Auth API - Get current user info
import type { Env, User } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors } from '../../../src/utils/response';

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const token = extractToken(request);
        if (!token) {
            return error('No token provided', 401);
        }

        const jwtSecret = env.JWT_SECRET || 'default-secret-change-me';
        const payload = await verifyToken(token, jwtSecret);

        if (!payload) {
            return error('Invalid or expired token', 401);
        }

        // Get fresh user data from database
        const user = await env.DB.prepare(
            'SELECT id, username, role, created_at FROM users WHERE id = ?'
        ).bind(payload.sub).first<Omit<User, 'password_hash'>>();

        if (!user) {
            return error('User not found', 404);
        }

        return json({ user });
    } catch (e) {
        console.error('Auth check error:', e);
        return error('Authentication failed', 500);
    }
};
