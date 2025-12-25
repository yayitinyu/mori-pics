// Images API - Single image operations (GET, PATCH, DELETE)
import type { Env, Image } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error, cors, success } from '../../../src/utils/response';
import { deleteFromR2 } from '../../../src/utils/r2';
import { getS3Config, createS3Client, deleteFromS3 } from '../../../src/utils/s3';

export const onRequestOptions: PagesFunction<Env> = async () => {
    return cors();
};

// GET - Get single image details
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env, params } = context;
    const imageId = params.id as string;

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

        const image = await env.DB.prepare(
            'SELECT * FROM images WHERE id = ?'
        ).bind(imageId).first<Image>();

        if (!image) {
            return error('Image not found', 404);
        }

        // Increment view count
        await env.DB.prepare(
            'UPDATE images SET view_count = view_count + 1 WHERE id = ?'
        ).bind(imageId).run();

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await env.DB.prepare(`
      INSERT INTO daily_stats (date, view_count)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET view_count = view_count + 1
    `).bind(today).run();

        return json(image);
    } catch (e) {
        console.error('Get image error:', e);
        return error('Failed to get image', 500);
    }
};

// PATCH - Update image metadata
export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const { request, env, params } = context;
    const imageId = params.id as string;

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

        // Check if image exists
        const existing = await env.DB.prepare(
            'SELECT * FROM images WHERE id = ?'
        ).bind(imageId).first<Image>();

        if (!existing) {
            return error('Image not found', 404);
        }

        // Parse update data
        const body = await request.json() as Partial<Pick<Image, 'description' | 'tags' | 'is_public'>>;
        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (body.description !== undefined) {
            updates.push('description = ?');
            values.push(body.description);
        }

        if (body.tags !== undefined) {
            updates.push('tags = ?');
            values.push(typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags));
        }

        if (body.is_public !== undefined) {
            updates.push('is_public = ?');
            values.push(body.is_public);
        }

        if (updates.length === 0) {
            return error('No valid fields to update', 400);
        }

        values.push(parseInt(imageId));

        await env.DB.prepare(
            `UPDATE images SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        // Get updated image
        const image = await env.DB.prepare(
            'SELECT * FROM images WHERE id = ?'
        ).bind(imageId).first<Image>();

        return json(image);
    } catch (e) {
        console.error('Update image error:', e);
        return error('Failed to update image', 500);
    }
};

// DELETE - Delete image (both R2 and database)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const { request, env, params } = context;
    const imageId = params.id as string;

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

        // Get image to find R2 key
        const image = await env.DB.prepare(
            'SELECT * FROM images WHERE id = ?'
        ).bind(imageId).first<Image>();

        if (!image) {
            return error('Image not found', 404);
        }

        // Check delete mode from query params
        const url = new URL(request.url);
        const deleteFromStorage = url.searchParams.get('storage') !== 'false';

        // Delete from storage if requested
        if (deleteFromStorage) {
            try {
                // Check if S3 is active
                const s3Config = await getS3Config(env.DB);
                
                // Try to determine if it's S3 or R2
                // We use the URL to guess if it matches S3 public domain
                // Or if S3 is enabled, we assume recent uploads are S3.
                // But safest is: if S3 is enabled and URL matches, delete from S3.
                // If it doesn't match S3 domain, try R2.
                
                let deletedFromS3 = false;
                if (s3Config && s3Config.enabled && image.url.startsWith(s3Config.publicDomain)) {
                     const client = createS3Client(s3Config);
                     await deleteFromS3(client, s3Config, image.filename);
                     deletedFromS3 = true;
                } 
                
                if (!deletedFromS3) {
                     // Default to R2
                     await deleteFromR2(env.R2, image.filename);
                }
            } catch (storageError) {
                console.error('Storage delete error:', storageError);
                // Continue with database delete even if storage fails
            }
        }

        // Delete from database
        await env.DB.prepare(
            'DELETE FROM images WHERE id = ?'
        ).bind(imageId).run();

        return success(deleteFromStorage
            ? 'Image deleted from storage and database'
            : 'Image removed from database only'
        );
    } catch (e) {
        console.error('Delete image error:', e);
        return error('Failed to delete image', 500);
    }
};
