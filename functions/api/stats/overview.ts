// Stats API - Overview statistics
import type { Env, StatsOverview } from '../../../src/types';
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

        // Get total stats from images table
        const totalStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_images,
        COALESCE(SUM(size), 0) as total_size,
        COALESCE(SUM(view_count), 0) as total_views
      FROM images
    `).first<{ total_images: number; total_size: number; total_views: number }>();

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayStats = await env.DB.prepare(`
      SELECT 
        COALESCE(upload_count, 0) as today_uploads,
        COALESCE(upload_size, 0) as today_size
      FROM daily_stats 
      WHERE date = ?
    `).bind(today).first<{ today_uploads: number; today_size: number }>();

        const overview: StatsOverview = {
            totalImages: totalStats?.total_images || 0,
            totalSize: totalStats?.total_size || 0,
            totalViews: totalStats?.total_views || 0,
            todayUploads: todayStats?.today_uploads || 0,
            todaySize: todayStats?.today_size || 0
        };

        return json(overview);
    } catch (e) {
        console.error('Stats overview error:', e);
        return error('Failed to get statistics', 500);
    }
};
