// Public Images API - No authentication required
import type { Env, Image } from '../../../src/types';
import { json, error, cors } from '../../../src/utils/response';

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

// GET - List public images with cursor-based pagination (for infinite scroll)
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor') || '';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

        let query = 'SELECT id, filename, url, width, height, created_at FROM images WHERE is_public = 1';
        const params: (string | number)[] = [];

        if (cursor) {
            // Cursor is the last image id
            query += ' AND id < ?';
            params.push(parseInt(cursor));
        }

        query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
        params.push(limit + 1); // Fetch one extra to check if there's more

        const result = await env.DB.prepare(query).bind(...params).all<Image>();
        const images = result.results || [];

        const hasMore = images.length > limit;
        const items = hasMore ? images.slice(0, limit) : images;
        const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].id) : null;

        return json({
            items,
            nextCursor,
            hasMore
        });
    } catch (e) {
        console.error('List public images error:', e);
        return error('Failed to fetch images', 500);
    }
};
