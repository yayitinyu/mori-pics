import type { Env } from '../../../src/types';
import { extractToken, verifyToken } from '../../../src/utils/auth';
import { json, error } from '../../../src/utils/response';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    
    try {
        const token = extractToken(request);
        if (!token || !(await verifyToken(token, env.JWT_SECRET))) return error('Unauthorized', 401);

        const config = await env.DB.prepare('SELECT * FROM storage_configs WHERE id = 1').first();
        
        if (config) {
            // Mask secret key
            config.secretAccessKey = config.secret_access_key; // map snake_case to camelCase for frontend
            config.accessKeyId = config.access_key_id;
            config.publicDomain = config.public_domain;
            config.urlStyle = config.url_style || 'path';
            
            // Return empty string if secret exists but is masked to frontend (or handled by frontend logic '******')
            const secretMasked = config.secret_access_key ? '******' : '';
            
            return json({
                endpoint: config.endpoint || '',
                region: config.region || '',
                bucket: config.bucket || '',
                accessKeyId: config.access_key_id || '',
                secretAccessKey: secretMasked,
                publicDomain: config.public_domain || '',
                urlStyle: config.url_style || 'path',
                enabled: !!config.enabled
            });
        }
        
        return json({ enabled: false, urlStyle: 'path' });
    } catch (e) {
        return error('Internal Error', 500);
    }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const token = extractToken(request);
        if (!token || !(await verifyToken(token, env.JWT_SECRET))) return error('Unauthorized', 401);

        const body = await request.json() as any;
        
        // Handle undefined or null
        const secretInput = body.secretAccessKey ? String(body.secretAccessKey).trim() : '';

        // If secret is masked '******', keep the old one
        let secretKey = secretInput;
        if (secretKey === '******') {
             const oldConf = await env.DB.prepare('SELECT secret_access_key FROM storage_configs WHERE id = 1').first();
             // TS hint: oldConf could be unknown
             secretKey = (oldConf as any)?.secret_access_key;
        }


        await env.DB.prepare(`
            INSERT INTO storage_configs (id, endpoint, region, bucket, access_key_id, secret_access_key, public_domain, url_style, enabled)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                endpoint = excluded.endpoint,
                region = excluded.region,
                bucket = excluded.bucket,
                access_key_id = excluded.access_key_id,
                secret_access_key = excluded.secret_access_key,
                public_domain = excluded.public_domain,
                url_style = excluded.url_style,
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            body.endpoint ? String(body.endpoint).trim() : '',
            body.region ? String(body.region).trim() : '',
            body.bucket ? String(body.bucket).trim() : '',
            body.accessKeyId ? String(body.accessKeyId).trim() : '',
            secretKey,
            body.publicDomain ? String(body.publicDomain).trim() : '',
            body.urlStyle || 'path',
            body.enabled ? 1 : 0
        ).run();

        return json({ success: true });
    } catch (e) {
        console.error(e);
        return error('Failed to save settings', 500);
    }
};
