// Images API - List and Upload
import type { Env, Image, ImageListQuery } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors, paginated } from '../../../src/utils/response';
import { uploadToR2, generateFilename, buildImageUrl } from '../../../src/utils/r2';
import { getS3Config, createS3Client, uploadToS3 } from '../../../src/utils/s3';

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

// GET - List images with pagination and filters
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
        const page = parseInt(url.searchParams.get('page') || '1');
        const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);
        const search = url.searchParams.get('search') || '';
        const startDate = url.searchParams.get('startDate') || '';
        const endDate = url.searchParams.get('endDate') || '';

        const offset = (page - 1) * pageSize;

        // Build query
        let whereClause = 'WHERE 1=1';
        const params: (string | number)[] = [];

        if (search) {
            whereClause += ' AND (original_name LIKE ? OR description LIKE ? OR tags LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (startDate) {
            whereClause += ' AND date(created_at) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND date(created_at) <= ?';
            params.push(endDate);
        }

        // Get total count
        const countResult = await env.DB.prepare(
            `SELECT COUNT(*) as total FROM images ${whereClause}`
        ).bind(...params).first<{ total: number }>();

        const total = countResult?.total || 0;

        // Get paginated results
        const images = await env.DB.prepare(
            `SELECT * FROM images ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(...params, pageSize, offset).all<Image>();

        return paginated(images.results || [], total, page, pageSize);
    } catch (e) {
        console.error('List images error:', e);
        return error('Failed to fetch images', 500);
    }
};

// POST - Upload new image
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

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const originalName = formData.get('originalName') as string || '';
        const useOriginalFilename = formData.get('useOriginalFilename') === 'true';
        const uploadPath = formData.get('uploadPath') as string || '';
        const description = formData.get('description') as string || '';
        const tags = formData.get('tags') as string || '[]';
        const isPublicParam = formData.get('is_public');
        const isPublic = isPublicParam !== null ? (isPublicParam === 'true' || isPublicParam === '1' ? 1 : 0) : 1;

        if (!file) {
            return error('No file provided', 400);
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return error('Only image files are allowed', 400);
        }

        // Generate filename
        const filename = generateFilename(originalName || file.name, {
            useOriginalFilename,
            uploadPath
        });

        // Check Storage Config
        const s3Config = await getS3Config(env.DB);
        let imageUrl: string;
        let storageType = 'r2';

        if (s3Config && s3Config.enabled) {
            // Upload to Custom S3
            storageType = 's3';
            const client = createS3Client(s3Config);
            const arrayBuffer = await file.arrayBuffer();
            await uploadToS3(client, s3Config, filename, arrayBuffer, file.type);
            
            // Build S3 URL
            if (s3Config.publicDomain) {
                const domain = s3Config.publicDomain.replace(/\/$/, '');
                const path = filename.startsWith('/') ? filename : '/' + filename;
                imageUrl = `${domain}${path}`;
            } else {
                // Use Proxy URL
                const origin = new URL(request.url).origin;
                imageUrl = `${origin}/file/${filename}`;
            }
        } else {
            // Upload to R2
            const arrayBuffer = await file.arrayBuffer();
            await uploadToR2(env.R2, filename, arrayBuffer, file.type);
            imageUrl = buildImageUrl(filename, env.CUSTOM_DOMAIN);
        }

        // Save to database
        const result = await env.DB.prepare(`
      INSERT INTO images (user_id, filename, original_name, url, size, mime_type, tags, description, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            payload.sub,
            filename,
            originalName || file.name,
            imageUrl,
            file.size,
            file.type,
            tags,
            description,
            isPublic
        ).run();

        if (!result.success) {
            // Rollback
            if (storageType === 's3' && s3Config) {
                 const client = createS3Client(s3Config);
                 await client.fetch(`${s3Config.endpoint}/${s3Config.bucket}/${filename}`, { method: 'DELETE' });
            } else {
                 await env.R2.delete(filename);
            }
            return error('Failed to save image metadata', 500);
        }

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await env.DB.prepare(`
      INSERT INTO daily_stats (date, upload_count, upload_size)
      VALUES (?, 1, ?)
      ON CONFLICT(date) DO UPDATE SET
        upload_count = upload_count + 1,
        upload_size = upload_size + ?
    `).bind(today, file.size, file.size).run();

        // Get the created image
        const image = await env.DB.prepare(
            'SELECT * FROM images WHERE id = ?'
        ).bind(result.meta.last_row_id).first<Image>();

        return json({
            id: image?.id,
            url: imageUrl,
            filename,
            size: file.size
        }, 201);
    } catch (e) {
        console.error('Upload error:', e);
        return error('Upload failed: ' + (e as Error).message, 500);
    }
};
