// Stats API - Popular images
import type { Env, Image } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors } from '../../../src/utils/response';

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        // Auth check
        const token = extractToken(request);
        if (!token) {
            return error('Unauthorized', 401);
        }

        const jwtSecret = env.JWT_SECRET || 'default-secret-change-me';
        const payload = await verifyToken(token, jwtSecret);
        if (!payload) {
            return error('Invalid token', 401);
        }

        // Parse query params
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

        // Get top images by view count
        const images = await env.DB.prepare(`
      SELECT id, filename, original_name, url, view_count, created_at
      FROM images
      WHERE view_count > 0
      ORDER BY view_count DESC
      LIMIT ?
    `).bind(limit).all<Pick<Image, 'id' | 'filename' | 'original_name' | 'url' | 'view_count' | 'created_at'>>();

        return json(images.results || []);
    } catch (e) {
        console.error('Popular images error:', e);
        return error('Failed to get popular images', 500);
    }
};
