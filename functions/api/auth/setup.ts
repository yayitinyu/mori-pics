// Auth API - Initial setup (create admin account)
import type { Env, User } from '../../../src/types';
import { hashPassword, createToken } from '../../../src/utils/auth';
import { json, error, cors } from '../../../src/utils/response';

interface SetupRequest {
    username: string;
    password: string;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

// Check if setup is needed
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context;

    try {
        const result = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM users'
        ).first<{ count: number }>();

        const needsSetup = !result || result.count === 0;

        return json({ needsSetup });
    } catch (e) {
        // Table might not exist yet
        return json({ needsSetup: true });
    }
};

// Create initial admin account
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        // Check if admin already exists
        const existing = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM users WHERE role = ?'
        ).bind('admin').first<{ count: number }>();

        if (existing && existing.count > 0) {
            return error('Admin account already exists', 400);
        }

        const body: SetupRequest = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return error('Username and password are required', 400);
        }

        if (password.length < 6) {
            return error('Password must be at least 6 characters', 400);
        }

        // Hash password and create user
        const passwordHash = await hashPassword(password);

        const result = await env.DB.prepare(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        ).bind(username, passwordHash, 'admin').run();

        if (!result.success) {
            return error('Failed to create admin account', 500);
        }

        // Get the created user
        const user = await env.DB.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(username).first<User>();

        if (!user) {
            return error('Failed to retrieve created user', 500);
        }

        // Generate token for immediate login
        const jwtSecret = env.JWT_SECRET || 'default-secret-change-me';
        const token = await createToken(user, jwtSecret);

        return json({
            message: 'Admin account created successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (e) {
        console.error('Setup error:', e);
        return error('Setup failed', 500);
    }
};
