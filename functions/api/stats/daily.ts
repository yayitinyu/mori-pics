// Stats API - Daily statistics for charts
import type { Env, DailyStats } from '../../../src/types';
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
        const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);

        // Get daily stats for the specified period
        const stats = await env.DB.prepare(`
      SELECT date, upload_count, view_count, upload_size
      FROM daily_stats
      WHERE date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `).bind(days).all<DailyStats>();

        // Fill in missing dates with zeros
        const result: DailyStats[] = [];
        const now = new Date();
        const statsMap = new Map((stats.results || []).map(s => [s.date, s]));

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const existing = statsMap.get(dateStr);
            result.push({
                id: existing?.id || 0,
                date: dateStr,
                upload_count: existing?.upload_count || 0,
                view_count: existing?.view_count || 0,
                upload_size: existing?.upload_size || 0
            });
        }

        return json(result);
    } catch (e) {
        console.error('Daily stats error:', e);
        return error('Failed to get daily statistics', 500);
    }
};
