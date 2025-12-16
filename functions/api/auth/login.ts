// Auth API - Login
import type { Env, User } from '../../../src/types';
import { createToken, verifyPassword, extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors } from '../../../src/utils/response';

interface LoginRequest {
    username: string;
    password: string;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const body: LoginRequest = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return error('Username and password are required', 400);
        }

        // Find user
        const user = await env.DB.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(username).first<User>();

        if (!user) {
            return error('Invalid credentials', 401);
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            return error('Invalid credentials', 401);
        }

        // Generate JWT
        const jwtSecret = env.JWT_SECRET || 'default-secret-change-me';
        const token = await createToken(user, jwtSecret);

        return json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (e) {
        console.error('Login error:', e);
        return error('Login failed', 500);
    }
};
