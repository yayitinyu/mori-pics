// Images API - Bulk import from localStorage
import type { Env } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors } from '../../../src/utils/response';

interface ImportItem {
    id?: number;
    url: string;
    name: string;
    date: string;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

// POST - Import images from localStorage backup
export const onRequestPost: PagesFunction<Env> = async (context) => {
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

        const body = await request.json() as { items: ImportItem[] };
        const { items } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return error('No items to import', 400);
        }

        let imported = 0;
        let skipped = 0;

        for (const item of items) {
            try {
                // Check if URL already exists
                const existing = await env.DB.prepare(
                    'SELECT id FROM images WHERE url = ?'
                ).bind(item.url).first();

                if (existing) {
                    skipped++;
                    continue;
                }

                // Parse date (handle various formats)
                let createdAt: string;
                try {
                    const dateObj = new Date(item.date);
                    createdAt = dateObj.toISOString();
                } catch {
                    createdAt = new Date().toISOString();
                }

                // Extract filename from URL or use provided name
                const filename = item.name || item.url.split('/').pop() || 'unknown';

                // Insert into database
                await env.DB.prepare(`
          INSERT INTO images (user_id, filename, original_name, url, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
                    payload.sub,
                    filename,
                    filename,
                    item.url,
                    createdAt
                ).run();

                imported++;
            } catch (itemError) {
                console.error('Failed to import item:', item.url, itemError);
                skipped++;
            }
        }

        return json({
            message: `Import completed`,
            imported,
            skipped,
            total: items.length
        });
    } catch (e) {
        console.error('Import error:', e);
        return error('Import failed: ' + (e as Error).message, 500);
    }
};
